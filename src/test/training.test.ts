import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  TRAINING_MODULES,
  TRAINING_STAGES,
  getModule,
  modulesForStage,
} from '@/data/training-curriculum';
import {
  TRAINING_STORAGE_KEY,
  deliverableSatisfied,
  getModuleProgress,
  isModuleComplete,
  readTrainingProgress,
  resetTrainingProgress,
  setDeliverableNotes,
  setLayerComplete,
} from '@/lib/training-store';
import {
  canToggleLayer,
  modulePercent,
  nextRecommendedModule,
  overallStats,
} from '@/lib/training-utils';

beforeEach(() => {
  localStorage.clear();
  resetTrainingProgress();
});

afterEach(() => {
  localStorage.clear();
});

describe('training curriculum', () => {
  it('includes all stages and modules', () => {
    expect(TRAINING_STAGES.length).toBe(6);
    expect(TRAINING_MODULES.length).toBeGreaterThanOrEqual(28);
    expect(getModule('0.1')?.title).toBeTruthy();
    expect(modulesForStage('stage-0').map((m) => m.id)).toEqual(['0.1', '0.2', '0.3', '0.4']);
  });

  it('marks engineering and refresh modules', () => {
    expect(getModule('0.4')?.engineeringEdge).toBe(true);
    expect(getModule('0.4')?.refreshOnly).toBe(true);
    expect(getModule('3.2')?.engineeringEdge).toBe(true);
    expect(getModule('3.6')?.refreshOnly).toBe(true);
  });
});

describe('training progress iron rule', () => {
  it('blocks deliverable without notes', () => {
    const check = canToggleLayer('deliverable', getModuleProgress('0.1'), true);
    expect(check.ok).toBe(false);
    setLayerComplete('0.1', 'deliverable', true);
    expect(getModuleProgress('0.1').layers.deliverable).toBeFalsy();
  });

  it('allows deliverable after notes and completes module when all layers done', () => {
    setDeliverableNotes('0.1', 'מזכר מפת הזכויות נשמר בתיקיית ארגז כלים');
    setLayerComplete('0.1', 'deliverable', true);
    expect(deliverableSatisfied(getModuleProgress('0.1'))).toBe(true);

    for (const layer of ['law', 'literature', 'cases', 'exam'] as const) {
      setLayerComplete('0.1', layer, true);
    }
    const p = getModuleProgress('0.1');
    expect(isModuleComplete(p)).toBe(true);
    expect(modulePercent(p)).toBe(100);
    expect(p.completedAt).toBeTruthy();
  });

  it('clears deliverable when notes shrink', () => {
    setDeliverableNotes('0.1', 'תיעוד מספיק ארוך לתוצר');
    setLayerComplete('0.1', 'deliverable', true);
    setDeliverableNotes('0.1', 'קצר');
    expect(getModuleProgress('0.1').layers.deliverable).toBeFalsy();
    expect(isModuleComplete(getModuleProgress('0.1'))).toBe(false);
  });

  it('recommends first incomplete module and persists to localStorage', () => {
    expect(nextRecommendedModule()).toBe('0.1');
    setDeliverableNotes('0.1', 'תוצר מודול 0.1 מוכן במלואו');
    for (const layer of ['law', 'literature', 'cases', 'deliverable', 'exam'] as const) {
      setLayerComplete('0.1', layer, true);
    }
    expect(nextRecommendedModule()).toBe('0.2');
    expect(localStorage.getItem(TRAINING_STORAGE_KEY)).toBeTruthy();
    expect(overallStats(readTrainingProgress()).completed).toBe(1);
  });
});
