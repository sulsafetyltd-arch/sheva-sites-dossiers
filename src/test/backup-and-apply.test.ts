import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyAppBackup,
  buildAppBackup,
  backupToJson,
  importAppBackupFromText,
  parseAppBackup,
} from '@/lib/app-backup';
import {
  applyModuleDeliverableToDeal,
  applyModuleDeliverableToNewDeal,
} from '@/lib/apply-training-to-deal';
import { createDeal, getDeal, STORAGE_KEY } from '@/lib/real-estate-store';
import {
  getModuleProgress,
  readTrainingProgress,
  resetTrainingProgress,
  setDeliverableAnswer,
  setLayerComplete,
  TRAINING_STORAGE_KEY,
} from '@/lib/training-store';
import { getInteractiveContent } from '@/data/interactive-content';

beforeEach(() => {
  localStorage.clear();
  resetTrainingProgress();
  localStorage.setItem(STORAGE_KEY, '[]');
});

afterEach(() => {
  localStorage.clear();
});

describe('app backup', () => {
  it('exports and re-imports training + deals', () => {
    setDeliverableAnswer('0.1', '0.1-P1', 'טיוטת תוצר לגיבוי ארוכה מספיק');
    const deal = createDeal({ title: 'תיק לבדיקת גיבוי' });
    const json = backupToJson(buildAppBackup());
    expect(json).toContain('solo-nadlan-backup');

    localStorage.clear();
    resetTrainingProgress();
    localStorage.setItem(STORAGE_KEY, '[]');

    const result = importAppBackupFromText(json, 'replace');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.deals).toBeGreaterThanOrEqual(1);
    expect(getDeal(deal.id)?.title).toBe('תיק לבדיקת גיבוי');
    expect(getModuleProgress('0.1').deliverableAnswers?.['0.1-P1']).toContain('טיוטת תוצר');
  });

  it('rejects invalid json', () => {
    const parsed = parseAppBackup('{nope');
    expect('error' in parsed).toBe(true);
  });

  it('merges without wiping unrelated modules', () => {
    setDeliverableAnswer('0.1', '0.1-P1', 'תוכן מודול א');
    const backup = buildAppBackup();
    setDeliverableAnswer('0.2', '0.2-P1', 'תוכן מודול ב שנשאר');
    applyAppBackup(backup, 'merge');
    expect(getModuleProgress('0.1').deliverableAnswers?.['0.1-P1']).toContain('מודול א');
    expect(getModuleProgress('0.2').deliverableAnswers?.['0.2-P1']).toContain('מודול ב');
  });
});

describe('apply training to deal', () => {
  it('applies deliverable answers into deal notes and timeline', () => {
    const content = getInteractiveContent('0.1');
    for (const p of content.deliverablePrompts) {
      setDeliverableAnswer('0.1', p.id, `תשובה ל־${p.label} עם מספיק מלל`);
    }
    setLayerComplete('0.1', 'deliverable', true);
    const deal = applyModuleDeliverableToNewDeal('0.1');
    expect(deal.notes).toContain('תוצר');
    expect(deal.timeline.some((t) => t.title.includes('הכשרה'))).toBe(true);
    expect(deal.tasks.some((t) => t.title.includes('תוצר'))).toBe(true);
  });

  it('can apply to an existing deal', () => {
    const content = getInteractiveContent('0.1');
    setDeliverableAnswer('0.1', content.deliverablePrompts[0].id, 'תשובה קיימת לתיק קיים מספיק ארוכה');
    const deal = createDeal({ title: 'תיק יעד' });
    const updated = applyModuleDeliverableToDeal('0.1', deal.id);
    expect(updated.notes).toContain('הוחל מהכשרה');
    expect(updated.id).toBe(deal.id);
  });
});

describe('stage 5 content depth', () => {
  it('has richer lesson bodies for stage 5 modules', () => {
    for (const id of ['5.1', '5.2', '5.3', '5.4', '5.5']) {
      const c = getInteractiveContent(id);
      expect(c.lessons.length).toBeGreaterThanOrEqual(3);
      const total = c.lessons.reduce((s, l) => s + l.body.length, 0);
      expect(total).toBeGreaterThan(400);
    }
  });
});
