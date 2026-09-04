import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  TRAINING_MODULES,
  TRAINING_STAGES,
  getModule,
  modulesForStage,
} from '@/data/training-curriculum';
import {
  allInteractiveModuleIds,
  getInteractiveContent,
} from '@/data/interactive-content';
import { buildExplainerSlides, explainerDurationLabel } from '@/lib/training-explainer';
import {
  TRAINING_STORAGE_KEY,
  deliverableSatisfied,
  getModuleProgress,
  isModuleComplete,
  markManyRead,
  readTrainingProgress,
  resetTrainingProgress,
  setDeliverableNotes,
  setExplainerWatched,
  setLayerComplete,
  submitQuiz,
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

function completeModuleInApp(moduleId: string) {
  const content = getInteractiveContent(moduleId);
  const readIds = [
    ...content.lessons,
    ...content.statutes,
    ...content.literatureDigests,
    ...content.caseBriefs,
  ].map((x) => x.id);
  markManyRead(moduleId, readIds);

  setDeliverableNotes(
    moduleId,
    'תוצר מודול הושלם באפליקציה עם נקודות מרכזיות ותרחיש יישום מתועד במלואו',
  );
  setLayerComplete(moduleId, 'law', true);
  setLayerComplete(moduleId, 'literature', true);
  setLayerComplete(moduleId, 'cases', true);
  setLayerComplete(moduleId, 'deliverable', true);

  const answers: Record<string, number> = {};
  for (const q of content.quiz) {
    answers[q.id] = q.correctIndex;
  }
  const quiz = submitQuiz(moduleId, answers);
  expect(quiz.passed).toBe(true);
}

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

describe('in-app interactive content', () => {
  it('provides self-contained lessons for every module', () => {
    expect(allInteractiveModuleIds().length).toBe(TRAINING_MODULES.length);
    for (const mod of TRAINING_MODULES) {
      const c = getInteractiveContent(mod.id);
      expect(c.learningGoal.length).toBeGreaterThan(10);
      expect(c.lessons.length).toBeGreaterThanOrEqual(1);
      expect(c.statutes.length).toBeGreaterThanOrEqual(1);
      expect(c.literatureDigests.length).toBeGreaterThanOrEqual(1);
      expect(c.caseBriefs.length).toBeGreaterThanOrEqual(1);
      expect(c.quiz.length).toBeGreaterThanOrEqual(4);
      expect(c.deliverablePrompts.length).toBeGreaterThanOrEqual(2);
      expect(c.passScore).toBeGreaterThan(0.5);
      for (const lesson of c.lessons) {
        expect(lesson.body.length).toBeGreaterThan(40);
        expect(lesson.keyPoints.length).toBeGreaterThan(0);
      }
      for (const q of c.quiz) {
        expect(q.options.length).toBeGreaterThanOrEqual(3);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(q.options.length);
      }
    }
  });
});

describe('module explainer videos', () => {
  it('builds slides with narration for every module', () => {
    for (const mod of TRAINING_MODULES) {
      const slides = buildExplainerSlides(mod);
      expect(slides.length).toBeGreaterThanOrEqual(5);
      expect(slides[0].id).toBe('intro');
      expect(slides.some((s) => s.id.startsWith('law'))).toBe(true);
      expect(slides.some((s) => s.id === 'deliverable')).toBe(true);
      expect(slides.some((s) => s.id === 'exam')).toBe(true);
      for (const slide of slides) {
        expect(slide.title.length).toBeGreaterThan(0);
        expect(slide.narration.length).toBeGreaterThan(20);
        expect(slide.bullets.length).toBeGreaterThan(0);
        expect(slide.seconds).toBeGreaterThan(5);
        expect(slide.visual).toBeTruthy();
        expect(slide.visualCaption.length).toBeGreaterThan(0);
      }
      expect(slides.some((s) => s.visual === 'exam')).toBe(true);
      expect(slides.some((s) => s.id === 'summary')).toBe(true);
      expect(explainerDurationLabel(slides)).toMatch(/דק/);
    }
  });

  it('marks explainer as watched', () => {
    expect(getModuleProgress('0.1').explainerWatchedAt).toBeFalsy();
    setExplainerWatched('0.1');
    expect(getModuleProgress('0.1').explainerWatchedAt).toBeTruthy();
    const first = getModuleProgress('0.1').explainerWatchedAt;
    setExplainerWatched('0.1');
    expect(getModuleProgress('0.1').explainerWatchedAt).toBe(first);
  });
});

describe('training progress iron rule', () => {
  it('blocks deliverable without notes', () => {
    const check = canToggleLayer('deliverable', getModuleProgress('0.1'), true, '0.1');
    expect(check.ok).toBe(false);
    setLayerComplete('0.1', 'deliverable', true);
    expect(getModuleProgress('0.1').layers.deliverable).toBeFalsy();
  });

  it('blocks exam without passing in-app quiz', () => {
    setLayerComplete('0.1', 'exam', true);
    expect(getModuleProgress('0.1').layers.exam).toBeFalsy();
  });

  it('allows deliverable after notes and completes module when all layers done', () => {
    completeModuleInApp('0.1');
    const p = getModuleProgress('0.1');
    expect(deliverableSatisfied(p)).toBe(true);
    expect(isModuleComplete(p)).toBe(true);
    expect(modulePercent(p)).toBe(100);
    expect(p.completedAt).toBeTruthy();
    expect(p.quizPassedAt).toBeTruthy();
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
    completeModuleInApp('0.1');
    expect(nextRecommendedModule()).toBe('0.2');
    expect(localStorage.getItem(TRAINING_STORAGE_KEY)).toBeTruthy();
    expect(overallStats(readTrainingProgress()).completed).toBe(1);
  });
});
