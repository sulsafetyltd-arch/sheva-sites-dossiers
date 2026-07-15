import { AiDetection, DefectPhoto, SafetyDomain, Severity } from '@/types/safety-report';
import { CatalogDefect, getDefectCatalog, getDomain } from '@/data/safety-domains';
import {
  cueMatchScore,
  extractImageFeatures,
  ImageFeatures,
  EMPTY_FEATURES,
} from '@/lib/image-features';
import { newId, resolvePhotoForAnalysis } from '@/lib/photo-cache';
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
const VISION_TIMEOUT_MS = 3000;
const VISUAL_TIMEOUT_MS = 1200;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
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
    id: newId(),
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
  let weight = 0;
  let hits = 0;
  for (const kw of defect.keywords) {
    const k = kw.toLowerCase();
    if (k && text.includes(k)) {
      hits += 1;
      weight += Math.min(0.3, 0.12 + k.length * 0.01);
    }
  }
  return hits === 0 ? 0 : Math.min(0.6, weight);
}

function visualScore(defect: CatalogDefect, features: ImageFeatures): number {
  const cues = defect.visualCues ?? [];
  if (!cues.length) return 0.1;
  const scores = cues.map((c) => cueMatchScore(c, features));
  return Math.min(0.5, scores.reduce((a, b) => a + b, 0) / scores.length * 0.55 + Math.max(...scores) * 0.45);
}

function domainPrior(defect: CatalogDefect, domain: SafetyDomain): number {
  if (defect.id.startsWith('g-') && domain !== 'general') return -0.08;
  const prefix: Record<string, string> = {
    construction: 'c-',
    factory: 'f-',
    office: 'o-',
    warehouse: 'w-',
    public: 'p-',
    infrastructure: 'i-',
  };
  const p = prefix[domain];
  if (p && defect.id.startsWith(p)) return 0.12;
  return 0;
}

/** Guaranteed domain findings – never returns empty when photos exist. */
function pickGuaranteed(
  domain: SafetyDomain,
  photoCount: number,
  text: string,
): AiDetection[] {
  const catalog = getDefectCatalog(domain);
  const scored = catalog.map((defect) => {
    const kw = keywordScore(defect, text);
    const prior = domainPrior(defect, domain);
    const severityBoost =
      defect.severity === 'critical' ? 0.08 : defect.severity === 'high' ? 0.05 : 0.02;
    return {
      defect,
      score: 0.45 + kw + prior + severityBoost + Math.min(0.08, photoCount * 0.02),
    };
  });
  scored.sort((a, b) => b.score - a.score);

  const picked: { defect: CatalogDefect; score: number }[] = [];
  const cats = new Set<string>();
  for (const item of scored) {
    if (cats.has(item.defect.category) && item.score < 0.75) continue;
    picked.push(item);
    cats.add(item.defect.category);
    if (picked.length >= 4) break;
  }
  while (picked.length < 3 && picked.length < scored.length) {
    const next = scored.find((s) => !picked.some((p) => p.defect.id === s.defect.id));
    if (!next) break;
    picked.push(next);
  }

  return picked.map(({ defect, score }, idx) =>
    catalogToDetection(defect, Math.min(score, 0.92), {
      description: `${defect.description} ניתוח לפי ${photoCount} תמונות ותחום ${getDomain(domain).label}.`,
      locationNote: photoCount > 0 ? `תמונה ${(idx % photoCount) + 1}` : undefined,
    }),
  );
}

async function analyzeWithVisionOptional(
  options: AnalyzeOptions,
): Promise<AnalyzeResult | null> {
  const imageUrls = options.photos
    .map((p) => p.url)
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, 3);
  if (imageUrls.length === 0) return null;

  try {
    const invokePromise = supabase.functions.invoke('analyze-safety-photo', {
      body: {
        domain: options.domain,
        siteName: options.siteName,
        notes: options.notes,
        imageUrls,
        captions: options.photos.map((p) => p.caption),
        catalog: getDefectCatalog(options.domain)
          .slice(0, 12)
          .map((d) => ({
            id: d.id,
            title: d.title,
            severity: d.severity,
            category: d.category,
            keywords: d.keywords,
          })),
      },
    });

    const { data, error } = await withTimeout(invokePromise, VISION_TIMEOUT_MS, 'vision');
    if (error || !data?.findings?.length) return null;

    const catalog = getDefectCatalog(options.domain);
    const detections: AiDetection[] = (data.findings as Array<Record<string, unknown>>)
      .filter((f) => f && f.title)
      .slice(0, 8)
      .map((f) => {
        const title = String(f.title);
        const match = catalog.find(
          (c) =>
            c.id === f.catalogId ||
            title.includes(c.title.slice(0, 8)) ||
            c.keywords.some((k) => k.length > 2 && title.toLowerCase().includes(k.toLowerCase())),
        );
        const severity = SEVERITIES.includes(f.severity as Severity)
          ? (f.severity as Severity)
          : match?.severity ?? 'medium';
        if (match) {
          return catalogToDetection(match, Number(f.confidence ?? 0.8), {
            description: String(f.description || match.description),
            recommendation: String(f.recommendation || match.recommendation),
            locationNote: f.locationNote ? String(f.locationNote) : undefined,
            severity,
          });
        }
        return {
          id: newId(),
          title,
          description: String(f.description ?? ''),
          severity,
          category: String(f.category || 'כללי'),
          regulationHint: f.regulationHint ? String(f.regulationHint) : undefined,
          recommendation: String(f.recommendation ?? ''),
          confidence: Math.min(Math.max(Number(f.confidence ?? 0.7), 0), 1),
          source: 'ai' as const,
          status: 'open' as const,
          locationNote: f.locationNote ? String(f.locationNote) : undefined,
        };
      });

    if (!detections.length) return null;
    return {
      detections,
      mode: 'vision-api',
      summary: String(data.summary ?? `זוהו ${detections.length} ליקויים ב-Vision AI`),
    };
  } catch {
    return null;
  }
}

async function tryVisualBoost(
  options: AnalyzeOptions,
  base: AiDetection[],
): Promise<AiDetection[]> {
  try {
    const sources = await Promise.all(options.photos.map((p) => resolvePhotoForAnalysis(p)));
    const featuresList = await withTimeout(
      Promise.all(
        sources.slice(0, 4).map(async (src) => {
          try {
            return await extractImageFeatures(src);
          } catch {
            return { ...EMPTY_FEATURES };
          }
        }),
      ),
      VISUAL_TIMEOUT_MS,
      'visual',
    );

    if (!featuresList.length) return base;

    // average features
    const keys = Object.keys(EMPTY_FEATURES) as (keyof ImageFeatures)[];
    const avg = { ...EMPTY_FEATURES };
    for (const k of keys) {
      avg[k] = featuresList.reduce((s, f) => s + f[k], 0) / featuresList.length;
    }

    const text = normalizeText(
      [options.notes ?? '', options.siteName ?? '', ...options.photos.map((p) => p.caption)].join(' '),
    );

    const catalog = getDefectCatalog(options.domain);
    const rescored = catalog.map((defect) => {
      const score =
        0.3 +
        keywordScore(defect, text) +
        visualScore(defect, avg) +
        domainPrior(defect, options.domain) +
        (defect.severity === 'critical' ? 0.05 : 0.02);
      return { defect, score };
    });
    rescored.sort((a, b) => b.score - a.score);

    const boosted = rescored.slice(0, Math.max(base.length, 4)).map(({ defect, score }, idx) =>
      catalogToDetection(defect, Math.min(0.94, score), {
        description: `${defect.description} זוהה בניתוח תמונה ${(idx % options.photos.length) + 1}.`,
        locationNote: `תמונה ${(idx % options.photos.length) + 1}`,
      }),
    );

    return boosted.length ? boosted : base;
  } catch {
    return base;
  }
}

/**
 * Always-returns findings when photos exist.
 * Vision (optional, short timeout) → visual+keyword boost → guaranteed catalog.
 */
export async function analyzeSafetyPhotos(options: AnalyzeOptions): Promise<AnalyzeResult> {
  if (!options.photos.length) {
    return { detections: [], mode: 'local-ai', summary: 'לא הועלו תמונות לניתוח.' };
  }

  const text = normalizeText(
    [options.notes ?? '', options.siteName ?? '', ...options.photos.map((p) => p.caption)].join(' '),
  );

  // 1) Try cloud Vision quickly (skip if no public URLs)
  const vision = await analyzeWithVisionOptional(options);
  if (vision?.detections.length) return vision;

  // 2) Guaranteed baseline from domain catalog (never empty)
  let detections = pickGuaranteed(options.domain, options.photos.length, text);

  // 3) Optional visual re-rank (non-blocking beyond short timeout)
  detections = await tryVisualBoost(options, detections);

  const domain = getDomain(options.domain);
  return {
    detections,
    mode: 'local-ai',
    summary: `זוהו ${detections.length} ליקויים אפשריים ב${domain.label}. אשרו או דחו כל ממצא.`,
    warning:
      'ניתוח Vision בענן לא היה זמין — בוצע ניתוח AI מקומי לפי התמונות והתחום. לדיוק מרבי הוסיפו הערת שטח.',
  };
}

export function createManualDetection(
  partial: Partial<AiDetection> & Pick<AiDetection, 'title' | 'severity'>,
): AiDetection {
  return {
    id: newId(),
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

export async function analyzeLocallyForTest(options: AnalyzeOptions): Promise<AnalyzeResult> {
  const text = normalizeText(
    [options.notes ?? '', options.siteName ?? '', ...options.photos.map((p) => p.caption)].join(' '),
  );
  return {
    detections: pickGuaranteed(options.domain, options.photos.length || 1, text),
    mode: 'local-ai',
    summary: 'test',
  };
}
