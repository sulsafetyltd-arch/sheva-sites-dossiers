import { describe, expect, it } from 'vitest';
import { TRAINING_CATEGORY_DETAILS, trainingCategoryLabel } from '@/types/safety-training';

describe('safety training categories', () => {
  it('defines group training content for general and fire sessions', () => {
    expect(trainingCategoryLabel('general')).toBe('הדרכת בטיחות כללית');
    expect(TRAINING_CATEGORY_DETAILS.general.content.length).toBeGreaterThan(0);
    expect(TRAINING_CATEGORY_DETAILS.fire.content.length).toBeGreaterThan(0);
  });

  it('defines work-at-height as its own certificate category', () => {
    expect(trainingCategoryLabel('work_at_height')).toBe('הדרכת עבודה בגובה');
    expect(TRAINING_CATEGORY_DETAILS.work_at_height.defaultTopic).toContain('עבודה בגובה');
  });
});
