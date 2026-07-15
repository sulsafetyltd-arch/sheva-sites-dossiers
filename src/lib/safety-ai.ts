import { AiDetection, DefectPhoto, SafetyDomain, Severity } from '@/types/safety-report';
import { CatalogDefect, getDefectCatalog, getDomain } from '@/data/safety-domains';
import { cueMatchScore, extractPhotosFeatures, ImageFeatures } from '@/lib/image-features';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyzeOptions {
  domain: SafetyDomain;
  photos: DefectPhoto[];
  siteName?: string;
  notes?: string;
}

export interface AnalyzeResult {
  detections: AiDetection[];
  mode: 'vision-api' | 'local-ai';
  summary: string;
}

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low'];

function catalogToDetection(
  defect: CatalogDefect,
  confidence: number,
  extras?: Partial<AiDetection>,
): AiDetection {
  return {
    id: crypto.randomUUID(),
    title: defect.title,
    description: defect.description,
    severity: defect.severity,
    category: defect.category,
    regulationHint: defect.regulationHint,
    recommendation: defect.recommendation,
    confidence: Math.round(confidence * 100) / 100,
    source: 'ai',
    status: 'open',
    ...extras,
  };
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/["']/g, ' ');
}

function keywordScore(defect: CatalogDefect, text: string): number {
  if (!text.trim()) return 0;
  let hits = 0;
  let weight = 0;
  for (const kw of defect.keywords) {
    const k = kw.toLowerCase();
    if (!k) continue;
    if (text.includes(k)) {
      hits += 1;
      weight += Math.min(0.28, 0.12 + k.length * 0.012);
    }
  }
  if (hits === 0) return 0;
  return Math.min(0.55, weight + hits * 0.04);
}

function visualScore(defect: CatalogDefect, features: ImageFeatures): number {
  const cues = defect.visualCues ?? [];
  if (cues.length === 0) return 0.08;
  const scores = cues.map((c) => cueMatchScore(c, features));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const best = Math.max(...scores);
  return Math.min(0.5, avg * 0.55 + best * 0.45);
}

function domainPrior(defect: CatalogDefect, domain: SafetyDomain): number {
  // Prefer domain-native defects over general add-ons
  if (defect.id.startsWith('g-') && domain !== 'general') return -0.04;
  if (domain === 'infrastructure' && defect.id.startsWith('i-')) return 0.08;
  if (domain === 'construction' && defect.id.startsWith('c-')) return 0.06;
  if (domain === 'factory' && defect.id.startsWith('f-')) return 0.06;
  if (domain === 'office' && defect.id.startsWith('o-')) return 0.05;
  if (domain === 'warehouse' && defect.id.startsWith('w-')) return 0.05;
  if (domain === 'public' && defect.id.startsWith('p-')) return 0.05;
  return 0;
}

/**
 * Deterministic local analyzer: combines text keywords + image visual features
 * against the domain catalog. No random scoring.
 */
async function analyzeLocally(options: AnalyzeOptions): Promise<AnalyzeResult> {
  const catalog = getDefectCatalog(options.domain);
  const text = normalizeText(
    [
      options.notes ?? '',
      options.siteName ?? '',
      ...options.photos.map((p) => p.caption),
    ].join(' '),
  );

  const imageUrls = options.photos.map((p) => p.previewUrl || p.url);
  const features = await extractPhotosFeatures(imageUrls);

  const scored = catalog.map((defect) => {
    const kw = keywordScore(defect, text);
    const vis = visualScore(defect, features);
    const prior = domainPrior(defect, options.domain);
    const severityBoost =
      defect.severity === 'critical' ? 0.04 : defect.severity === 'high' ? 0.02 : 0;

    // Photos raise baseline slightly when visual match exists
    const photoBoost = options.photos.length > 0 ? Math.min(0.06, options.photos.length * 0.015) : 0;

    let score = 0.28 + kw + vis + prior + severityBoost + photoBoost;
    // Require at least some signal — suppress weak generic hits
    if (kw < 0.08 && vis < 0.18) score -= 0.12;
    score = Math.min(0.94, Math.max(0.05, score));
    return { defect, score, kw, vis };
  });

  scored.sort((a, b) => b.score - a.score);

  // Keep diverse categories; drop low-confidence noise
  const selected: typeof scored = [];
  const usedCategories = new Set<string>();
  for (const item of scored) {
    if (item.score < 0.42) continue;
    if (usedCategories.has(item.defect.category) && item.score < 0.72) continue;
    selected.push(item);
    usedCategories.add(item.defect.category);
    if (selected.length >= Math.min(5, Math.max(2, options.photos.length + 1))) break;
  }

  // Always return at least top 2 domain-relevant if nothing passed threshold
  if (selected.length === 0) {
    selected.push(...scored.slice(0, 2));
  }

  const detections = selected.map(({ defect, score }) => catalogToDetection(defect, score));
  const domain = getDomain(options.domain);

  return {
    detections,
    mode: 'local-ai',
    summary: `זוהו ${detections.length} ליקויים אפשריים ב${domain.label} לפי ניתוח תמונה והקשר שטח. אשרו או דחו כל ממצא.`,
  };
}

interface VisionApiFinding {
  title: string;
  description: string;
  severity: Severity | string;
  category: string;
  regulationHint?: string;
  recommendation: string;
  confidence: number;
  locationNote?: string;
  catalogId?: string;
  photoIndex?: number;
}

function normalizeSeverity(value: string | undefined): Severity {
  if (value && SEVERITIES.includes(value as Severity)) return value as Severity;
  return 'medium';
}

/** Enrich Vision findings with catalog regulation/recommendation when titles match. */
function enrichWithCatalog(
  findings: VisionApiFinding[],
  domain: SafetyDomain,
): AiDetection[] {
  const catalog = getDefectCatalog(domain);

  return findings.map((f) => {
    const titleNorm = normalizeText(f.title ?? '');
    const match = catalog.find(
      (c) =>
        titleNorm.includes(normalizeText(c.title).slice(0, 10)) ||
        c.keywords.some((k) => k.length > 2 && titleNorm.includes(k.toLowerCase())) ||
        (f.catalogId && c.id === f.catalogId),
    );

    if (match) {
      return catalogToDetection(match, Math.min(Math.max(f.confidence ?? 0.75, 0.4), 0.98), {
        description: f.description || match.description,
        recommendation: f.recommendation || match.recommendation,
        locationNote: f.locationNote,
        severity: normalizeSeverity(f.severity) || match.severity,
      });
    }

    return {
      id: crypto.randomUUID(),
      title: f.title,
      description: f.description ?? '',
      severity: normalizeSeverity(String(f.severity)),
      category: f.category || 'כללי',
      regulationHint: f.regulationHint,
      recommendation: f.recommendation ?? '',
      confidence: Math.min(Math.max(f.confidence ?? 0.7, 0), 1),
      source: 'ai' as const,
      locationNote: f.locationNote,
      status: 'open' as const,
    };
  });
}

function catalogPromptBlock(domain: SafetyDomain): string {
  return getDefectCatalog(domain)
    .slice(0, 14)
    .map(
      (d) =>
        `- id:${d.id} | ${d.title} | חומרה:${d.severity} | קטגוריה:${d.category} | רמזים:${d.keywords.join(',')}`,
    )
    .join('\n');
}

/**
 * Try Supabase Edge Function `analyze-safety-photo` (OpenAI Vision).
 * Falls back to visual+keyword local analyzer.
 */
export async function analyzeSafetyPhotos(options: AnalyzeOptions): Promise<AnalyzeResult> {
  if (options.photos.length === 0) {
    return {
      detections: [],
      mode: 'local-ai',
      summary: 'לא הועלו תמונות לניתוח.',
    };
  }

  // Prefer HTTP URLs; also send data URLs (compressed local captures) for Vision
  const imageUrls = options.photos
    .map((p) => p.url)
    .filter((u) => u.startsWith('http') || u.startsWith('data:image/'))
    .slice(0, 6);

  try {
    const { data, error } = await supabase.functions.invoke('analyze-safety-photo', {
      body: {
        domain: options.domain,
        siteName: options.siteName,
        notes: options.notes,
        imageUrls,
        captions: options.photos.map((p) => p.caption),
        catalog: getDefectCatalog(options.domain).map((d) => ({
          id: d.id,
          title: d.title,
          severity: d.severity,
          category: d.category,
          keywords: d.keywords,
        })),
      },
    });

    if (!error && data?.findings && Array.isArray(data.findings) && data.findings.length > 0) {
      const detections = enrichWithCatalog(data.findings as VisionApiFinding[], options.domain)
        // Drop very low confidence noise from the model
        .filter((d) => d.confidence >= 0.45)
        .slice(0, 8);

      if (detections.length > 0) {
        return {
          detections,
          mode: 'vision-api',
          summary:
            data.summary ??
            `זוהו ${detections.length} ליקויים באמצעות ניתוח תמונה (Vision AI).`,
        };
      }
    }
  } catch (err) {
    console.warn('Vision API unavailable, using local analyzer:', err);
  }

  return analyzeLocally(options);
}

export function createManualDetection(
  partial: Partial<AiDetection> & Pick<AiDetection, 'title' | 'severity'>,
): AiDetection {
  return {
    id: crypto.randomUUID(),
    title: partial.title,
    description: partial.description ?? '',
    severity: partial.severity,
    category: partial.category ?? 'ידני',
    regulationHint: partial.regulationHint,
    recommendation: partial.recommendation ?? '',
    confidence: 1,
    source: 'manual',
    locationNote: partial.locationNote,
    status: 'open',
  };
}

/** Exported for unit tests */
export async function analyzeLocallyForTest(options: AnalyzeOptions): Promise<AnalyzeResult> {
  return analyzeLocally(options);
}

export { catalogPromptBlock };
