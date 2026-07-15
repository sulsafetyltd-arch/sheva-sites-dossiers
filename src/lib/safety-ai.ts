import { AiDetection, DefectPhoto, SafetyDomain, Severity } from '@/types/safety-report';
import { CatalogDefect, getDefectCatalog, getDomain } from '@/data/safety-domains';
import {
  cueMatchScore,
  extractImageFeatures,
  extractPhotosFeatures,
  ImageFeatures,
  toAnalysisDataUrl,
} from '@/lib/image-features';
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
  warning?: string;
}

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low'];
const VISION_TIMEOUT_MS = 12000;
const LOCAL_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

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
    catalogId: defect.id,
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
  if (cues.length === 0) return 0.1;
  const scores = cues.map((c) => cueMatchScore(c, features));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const best = Math.max(...scores);
  return Math.min(0.55, avg * 0.5 + best * 0.5);
}

function domainPrior(defect: CatalogDefect, domain: SafetyDomain): number {
  if (defect.id.startsWith('g-') && domain !== 'general') return -0.06;
  if (domain === 'infrastructure' && defect.id.startsWith('i-')) return 0.1;
  if (domain === 'construction' && defect.id.startsWith('c-')) return 0.08;
  if (domain === 'factory' && defect.id.startsWith('f-')) return 0.08;
  if (domain === 'office' && defect.id.startsWith('o-')) return 0.06;
  if (domain === 'warehouse' && defect.id.startsWith('w-')) return 0.06;
  if (domain === 'public' && defect.id.startsWith('p-')) return 0.06;
  return 0;
}

function bestPhotoIndex(
  defect: CatalogDefect,
  perPhoto: ImageFeatures[],
): number | undefined {
  if (perPhoto.length === 0) return undefined;
  let bestIdx = 0;
  let best = -1;
  perPhoto.forEach((features, idx) => {
    const score = visualScore(defect, features);
    if (score > best) {
      best = score;
      bestIdx = idx;
    }
  });
  return bestIdx;
}

/**
 * Prepare photo sources that can be analyzed without hanging (prefer data URLs).
 */
async function preparePhotoSources(photos: DefectPhoto[]): Promise<string[]> {
  const sources: string[] = [];
  for (const photo of photos) {
    const candidates = [photo.previewUrl, photo.url].filter(Boolean) as string[];
    let prepared: string | null = null;
    for (const candidate of candidates) {
      if (candidate.startsWith('blob:') || candidate.startsWith('data:')) {
        prepared = await toAnalysisDataUrl(candidate);
        if (prepared) break;
      }
    }
    // Try remote http last (may fail CORS)
    if (!prepared) {
      for (const candidate of candidates) {
        if (candidate.startsWith('http')) {
          prepared = await toAnalysisDataUrl(candidate);
          if (prepared) break;
        }
      }
    }
    sources.push(prepared || candidates[0] || '');
  }
  return sources.filter(Boolean);
}

/**
 * Deterministic local analyzer: visual features + keywords + domain priors.
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

  const sources = await preparePhotoSources(options.photos);
  const perPhoto = await Promise.all(sources.map((s) => extractImageFeatures(s)));
  const features =
    perPhoto.length > 0
      ? await extractPhotosFeatures(sources)
      : await extractPhotosFeatures(options.photos.map((p) => p.previewUrl || p.url));

  const scored = catalog.map((defect) => {
    const kw = keywordScore(defect, text);
    const vis = visualScore(defect, features);
    const prior = domainPrior(defect, options.domain);
    const severityBoost =
      defect.severity === 'critical' ? 0.05 : defect.severity === 'high' ? 0.03 : 0;
    const photoBoost = options.photos.length > 0 ? Math.min(0.1, 0.04 + options.photos.length * 0.02) : 0;

    let score = 0.32 + kw + vis + prior + severityBoost + photoBoost;
    // Soften penalty – photos alone should still yield findings
    if (kw < 0.05 && vis < 0.12 && options.photos.length === 0) score -= 0.15;
    else if (kw < 0.05 && vis < 0.12) score -= 0.04;

    score = Math.min(0.95, Math.max(0.08, score));
    return { defect, score, kw, vis };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected: typeof scored = [];
  const usedCategories = new Set<string>();
  const targetCount = Math.min(5, Math.max(3, options.photos.length + 1));

  for (const item of scored) {
    if (item.score < 0.38 && selected.length >= 2) continue;
    if (usedCategories.has(item.defect.category) && item.score < 0.7) continue;
    selected.push(item);
    usedCategories.add(item.defect.category);
    if (selected.length >= targetCount) break;
  }

  if (selected.length === 0) {
    selected.push(...scored.slice(0, 3));
  }

  const detections = selected.map(({ defect, score }) => {
    const photoIdx = bestPhotoIndex(defect, perPhoto);
    return catalogToDetection(defect, score, {
      description:
        photoIdx !== undefined
          ? `${defect.description} (זוהה בניתוח תמונה ${(photoIdx ?? 0) + 1}).`
          : defect.description,
      locationNote:
        photoIdx !== undefined ? `תמונה ${(photoIdx ?? 0) + 1}` : undefined,
    });
  });

  const domain = getDomain(options.domain);

  return {
    detections,
    mode: 'local-ai',
    summary: `זוהו ${detections.length} ליקויים אפשריים ב${domain.label}. מומלץ לאשר/לדחות כל ממצא.`,
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

function enrichWithCatalog(
  findings: VisionApiFinding[],
  domain: SafetyDomain,
): AiDetection[] {
  const catalog = getDefectCatalog(domain);

  return findings
    .filter((f) => f && f.title)
    .map((f) => {
      const titleNorm = normalizeText(f.title ?? '');
      const match = catalog.find(
        (c) =>
          (f.catalogId && c.id === f.catalogId) ||
          titleNorm.includes(normalizeText(c.title).slice(0, 10)) ||
          c.keywords.some((k) => k.length > 2 && titleNorm.includes(k.toLowerCase())),
      );

      if (match) {
        return catalogToDetection(match, Math.min(Math.max(f.confidence ?? 0.75, 0.4), 0.98), {
          description: f.description || match.description,
          recommendation: f.recommendation || match.recommendation,
          locationNote: f.locationNote,
          severity: normalizeSeverity(String(f.severity)),
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

async function tryVisionApi(options: AnalyzeOptions): Promise<AnalyzeResult | null> {
  // Only send publicly reachable http(s) images to the edge function.
  // Huge data URLs often fail; local analyzer handles those.
  const imageUrls = options.photos
    .map((p) => p.url)
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, 4);

  // If no remote URLs, skip Vision quickly and use local analysis on device images
  if (imageUrls.length === 0) {
    return null;
  }

  const invokePromise = supabase.functions.invoke('analyze-safety-photo', {
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

  const { data, error } = await withTimeout(invokePromise, VISION_TIMEOUT_MS, 'vision-api');

  if (error) {
    console.warn('Vision function error:', error.message || error);
    return null;
  }

  if (!data?.findings || !Array.isArray(data.findings) || data.findings.length === 0) {
    return null;
  }

  const detections = enrichWithCatalog(data.findings as VisionApiFinding[], options.domain)
    .filter((d) => d.confidence >= 0.4)
    .slice(0, 8);

  if (detections.length === 0) return null;

  return {
    detections,
    mode: 'vision-api',
    summary: data.summary ?? `זוהו ${detections.length} ליקויים באמצעות ניתוח תמונה (Vision AI).`,
  };
}

/**
 * Analyze safety photos: Vision edge function when available, otherwise local AI.
 * Never hangs — timeouts force fallback.
 */
export async function analyzeSafetyPhotos(options: AnalyzeOptions): Promise<AnalyzeResult> {
  if (options.photos.length === 0) {
    return {
      detections: [],
      mode: 'local-ai',
      summary: 'לא הועלו תמונות לניתוח.',
    };
  }

  let warning: string | undefined;

  try {
    const vision = await tryVisionApi(options);
    if (vision) return vision;
    warning = 'Vision בענן לא זמין כרגע — בוצע ניתוח מקומי לפי התמונות והתחום.';
  } catch (err) {
    console.warn('Vision API unavailable, using local analyzer:', err);
    warning = 'ניתוח הענן נכשל או התארך — בוצע ניתוח מקומי.';
  }

  try {
    const local = await withTimeout(analyzeLocally(options), LOCAL_TIMEOUT_MS, 'local-ai');
    return { ...local, warning };
  } catch (err) {
    console.error('Local analyzer failed:', err);
    // Last-resort: domain catalog top items without image processing
    const catalog = getDefectCatalog(options.domain)
      .filter((d) => !d.id.startsWith('g-') || options.domain === 'general')
      .slice(0, 3);
    return {
      detections: catalog.map((d) =>
        catalogToDetection(d, 0.55, {
          description: `${d.description} (ניתוח מקוצר – מומלץ לאמת בשטח).`,
        }),
      ),
      mode: 'local-ai',
      summary: 'בוצע ניתוח מקוצר לפי תחום הבדיקה. מומלץ לאמת את הממצאים.',
      warning: 'ניתוח התמונה המלא נכשל – הוחזרו ליקויים נפוצים לתחום.',
    };
  }
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
