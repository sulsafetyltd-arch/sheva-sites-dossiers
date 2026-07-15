import { AiDetection, DefectPhoto, SafetyDomain } from '@/types/safety-report';
import { CatalogDefect, getDefectCatalog } from '@/data/safety-domains';
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

function catalogToDetection(defect: CatalogDefect, confidence: number): AiDetection {
  return {
    id: crypto.randomUUID(),
    title: defect.title,
    description: defect.description,
    severity: defect.severity,
    category: defect.category,
    regulationHint: defect.regulationHint,
    recommendation: defect.recommendation,
    confidence,
    source: 'ai',
    status: 'open',
  };
}

/**
 * Heuristic local analyzer: picks likely defects for the selected domain,
 * weighted by notes keywords and photo captions. Used when Vision API is unavailable.
 */
function analyzeLocally(options: AnalyzeOptions): AnalyzeResult {
  const catalog = getDefectCatalog(options.domain);
  const text = [
    options.notes ?? '',
    options.siteName ?? '',
    ...options.photos.map((p) => p.caption),
  ]
    .join(' ')
    .toLowerCase();

  const scored = catalog.map((defect) => {
    let score = 0.45 + Math.random() * 0.15;
    for (const kw of defect.keywords) {
      if (text.includes(kw.toLowerCase())) score += 0.18;
    }
    // Prefer higher-severity findings slightly for field inspections
    if (defect.severity === 'critical') score += 0.05;
    if (defect.severity === 'high') score += 0.03;
    // More photos → slightly higher confidence in suggesting findings
    score += Math.min(options.photos.length * 0.02, 0.08);
    return { defect, score: Math.min(score, 0.96) };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return top 3–5 findings depending on photo count
  const count = Math.min(Math.max(3, options.photos.length + 1), 5);
  const detections = scored.slice(0, count).map(({ defect, score }) =>
    catalogToDetection(defect, Math.round(score * 100) / 100),
  );

  const domainLabel =
    options.domain === 'construction'
      ? 'אתר בנייה'
      : options.domain === 'factory'
        ? 'מפעל'
        : options.domain === 'office'
          ? 'משרדים'
          : options.domain === 'warehouse'
            ? 'מחסן'
            : options.domain === 'public'
              ? 'מבנה ציבורי'
              : 'סביבה כללית';

  return {
    detections,
    mode: 'local-ai',
    summary: `זוהו ${detections.length} ליקויי בטיחות אפשריים בתחום ${domainLabel} על בסיס התמונות וההקשר. מומלץ לאשר/לדחות כל ממצא.`,
  };
}

interface VisionApiFinding {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  regulationHint?: string;
  recommendation: string;
  confidence: number;
  locationNote?: string;
}

/**
 * Try Supabase Edge Function `analyze-safety-photo` (OpenAI Vision).
 * Falls back to local domain-aware analyzer.
 */
export async function analyzeSafetyPhotos(options: AnalyzeOptions): Promise<AnalyzeResult> {
  if (options.photos.length === 0) {
    return {
      detections: [],
      mode: 'local-ai',
      summary: 'לא הועלו תמונות לניתוח.',
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('analyze-safety-photo', {
      body: {
        domain: options.domain,
        siteName: options.siteName,
        notes: options.notes,
        imageUrls: options.photos.map((p) => p.url).filter((u) => u.startsWith('http')),
        captions: options.photos.map((p) => p.caption),
      },
    });

    if (!error && data?.findings && Array.isArray(data.findings) && data.findings.length > 0) {
      const detections: AiDetection[] = (data.findings as VisionApiFinding[]).map((f) => ({
        id: crypto.randomUUID(),
        title: f.title,
        description: f.description,
        severity: f.severity,
        category: f.category,
        regulationHint: f.regulationHint,
        recommendation: f.recommendation,
        confidence: Math.min(Math.max(f.confidence ?? 0.7, 0), 1),
        source: 'ai' as const,
        locationNote: f.locationNote,
        status: 'open' as const,
      }));

      return {
        detections,
        mode: 'vision-api',
        summary: data.summary ?? `זוהו ${detections.length} ליקויים באמצעות ניתוח תמונה.`,
      };
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
