import { describe, expect, it } from 'vitest';
import {
  GENERAL_TRAINING_TOPICS,
  HEIGHT_TRAINING_PROGRAM,
  HEIGHT_TRAINING_TOPICS,
  RAMP_FORM_META,
  RAMP_QUIZ_QUESTIONS,
  RAMP_TRAINING_TOPICS,
  TRAINING_CATEGORY_DETAILS,
  isBioradClientName,
  trainingCategoryLabel,
} from '@/types/safety-training';
import { CONSTRUCTION_INDUCTION_DOCUMENTS } from '@/lib/construction-induction-documents';

describe('safety training categories', () => {
  it('defines group training content for general and fire sessions', () => {
    expect(trainingCategoryLabel('general')).toBe('הדרכת בטיחות כללית');
    expect(TRAINING_CATEGORY_DETAILS.general.content.length).toBeGreaterThan(0);
    expect(GENERAL_TRAINING_TOPICS).toHaveLength(12);
    expect(TRAINING_CATEGORY_DETAILS.fire.content.length).toBeGreaterThan(0);
  });

  it('defines work-at-height as its own certificate category', () => {
    expect(trainingCategoryLabel('work_at_height')).toBe('הדרכת עבודה בגובה');
    expect(TRAINING_CATEGORY_DETAILS.work_at_height.defaultTopic).toContain('עבודה בגובה');
    expect(HEIGHT_TRAINING_TOPICS).toHaveLength(7);
    expect(HEIGHT_TRAINING_PROGRAM).toContain('תרגול מעשי של עבודה בגובה ולמידה מאירועים');
  });

  it('defines SOL-FORM-001 ramp loading training for Bio-Rad', () => {
    expect(trainingCategoryLabel('ramp_loading')).toContain('רמפה');
    expect(TRAINING_CATEGORY_DETAILS.ramp_loading.defaultTopic).toContain('SOL-WP-001');
    expect(RAMP_TRAINING_TOPICS).toHaveLength(11);
    expect(RAMP_QUIZ_QUESTIONS).toHaveLength(5);
    expect(RAMP_QUIZ_QUESTIONS[4].options.some((option) => option.label === 'כפפות + נעלי עבודה')).toBe(true);
    expect(RAMP_FORM_META.formId).toBe('SOL-FORM-001');
    expect(isBioradClientName('ביוראד')).toBe(true);
    expect(isBioradClientName('Bio-Rad Israel')).toBe(true);
    expect(isBioradClientName('Biorad')).toBe(true);
    expect(isBioradClientName('לקוח אחר')).toBe(false);
  });

  it('offers construction induction documents in all supplied languages', () => {
    expect(CONSTRUCTION_INDUCTION_DOCUMENTS).toHaveLength(9);
    expect(CONSTRUCTION_INDUCTION_DOCUMENTS.map((document) => document.code))
      .toEqual(['he', 'ar', 'en', 'ru', 'zh', 'tr', 'ti', 'ro', 'hi']);
    expect(new Set(CONSTRUCTION_INDUCTION_DOCUMENTS.map((document) => document.file)).size).toBe(9);
    expect(CONSTRUCTION_INDUCTION_DOCUMENTS.every((document) => document.url.includes('.pdf'))).toBe(true);
  });
});
