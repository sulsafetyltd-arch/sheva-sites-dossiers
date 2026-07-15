import type { CatalogDefect } from '@/data/safety-domains';
import type { AiDetection } from '@/types/safety-report';

export function catalogDefectToDetection(defect: CatalogDefect): AiDetection {
  return {
    id: crypto.randomUUID(),
    title: defect.title,
    description: defect.description,
    severity: defect.severity,
    category: defect.category,
    regulationHint: defect.regulationHint,
    recommendation: defect.recommendation,
    confidence: 1,
    source: 'catalog',
    catalogId: defect.id,
    status: 'accepted',
  };
}
