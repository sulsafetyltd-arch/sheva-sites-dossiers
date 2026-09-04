import type {
  ModuleProgress,
  TrainingLayerId,
  TrainingProgress,
} from '@/types/training';
import { LAYER_ORDER } from '@/types/training';
import { TRAINING_MODULES } from '@/data/training-curriculum';
import { getInteractiveContent } from '@/data/interactive-content';

export const TRAINING_STORAGE_KEY = 'real-estate-training-v1';

function emptyModule(): ModuleProgress {
  return {
    layers: {},
    deliverableNotes: '',
    readIds: [],
    deliverableAnswers: {},
    quizAnswers: {},
  };
}

function defaultProgress(): TrainingProgress {
  const now = new Date().toISOString();
  return { modules: {}, milestones: {}, startedAt: now, updatedAt: now };
}

function normalizeModule(p: ModuleProgress | undefined): ModuleProgress {
  const base = p ?? emptyModule();
  return {
    ...emptyModule(),
    ...base,
    layers: base.layers ?? {},
    deliverableNotes: base.deliverableNotes ?? '',
    readIds: base.readIds ?? [],
    deliverableAnswers: base.deliverableAnswers ?? {},
    quizAnswers: base.quizAnswers ?? {},
  };
}

export function readTrainingProgress(): TrainingProgress {
  try {
    const raw = localStorage.getItem(TRAINING_STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as TrainingProgress;
    if (!parsed || typeof parsed !== 'object') return defaultProgress();
    return {
      modules: parsed.modules ?? {},
      milestones: parsed.milestones ?? {},
      startedAt: parsed.startedAt ?? new Date().toISOString(),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return defaultProgress();
  }
}

function write(progress: TrainingProgress): TrainingProgress {
  const next = { ...progress, updatedAt: new Date().toISOString() };
  localStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function getModuleProgress(moduleId: string): ModuleProgress {
  return normalizeModule(readTrainingProgress().modules[moduleId]);
}

function combinedDeliverableNotes(p: ModuleProgress): string {
  const fromAnswers = Object.values(p.deliverableAnswers ?? {})
    .map((v) => v.trim())
    .filter(Boolean)
    .join('\n');
  return (fromAnswers || p.deliverableNotes || '').trim();
}

/** כלל ברזל: תוצר מעשי דורש סימון + תיעוד (≥8 תווים) */
export function deliverableSatisfied(p: ModuleProgress): boolean {
  return Boolean(p.layers.deliverable) && combinedDeliverableNotes(p).length >= 8;
}

export function isModuleComplete(p: ModuleProgress): boolean {
  if (!deliverableSatisfied(p)) return false;
  return LAYER_ORDER.every((layer) => Boolean(p.layers[layer]));
}

function withCompletion(p: ModuleProgress): ModuleProgress {
  if (isModuleComplete(p)) {
    return { ...p, completedAt: p.completedAt ?? new Date().toISOString() };
  }
  return { ...p, completedAt: undefined };
}

export function setLayerComplete(
  moduleId: string,
  layer: TrainingLayerId,
  complete: boolean,
): TrainingProgress {
  const all = readTrainingProgress();
  const current = normalizeModule(all.modules[moduleId]);
  const layers = { ...current.layers, [layer]: complete };

  if (layer === 'deliverable' && complete && combinedDeliverableNotes(current).length < 8) {
    layers.deliverable = false;
  }
  if (layer === 'exam' && complete && !current.quizPassedAt) {
    layers.exam = false;
  }

  const next = withCompletion({ ...current, layers });
  return write({ ...all, modules: { ...all.modules, [moduleId]: next } });
}

export function setDeliverableNotes(moduleId: string, notes: string): TrainingProgress {
  const all = readTrainingProgress();
  const current = normalizeModule(all.modules[moduleId]);
  const layers = { ...current.layers };
  if (layers.deliverable && notes.trim().length < 8) {
    layers.deliverable = false;
  }
  const next = withCompletion({ ...current, deliverableNotes: notes, layers });
  return write({ ...all, modules: { ...all.modules, [moduleId]: next } });
}

export function setDeliverableAnswer(
  moduleId: string,
  promptId: string,
  value: string,
): TrainingProgress {
  const all = readTrainingProgress();
  const current = normalizeModule(all.modules[moduleId]);
  const deliverableAnswers = { ...current.deliverableAnswers, [promptId]: value };
  const notes = Object.values(deliverableAnswers)
    .map((v) => v.trim())
    .filter(Boolean)
    .join('\n');
  const layers = { ...current.layers };
  if (layers.deliverable && notes.length < 8) {
    layers.deliverable = false;
  }
  const next = withCompletion({
    ...current,
    deliverableAnswers,
    deliverableNotes: notes,
    layers,
  });
  return write({ ...all, modules: { ...all.modules, [moduleId]: next } });
}

export function markContentRead(moduleId: string, contentId: string): TrainingProgress {
  const all = readTrainingProgress();
  const current = normalizeModule(all.modules[moduleId]);
  if (current.readIds?.includes(contentId)) return all;
  const readIds = [...(current.readIds ?? []), contentId];
  const next = withCompletion({ ...current, readIds });
  return write({ ...all, modules: { ...all.modules, [moduleId]: next } });
}

export function markManyRead(moduleId: string, contentIds: string[]): TrainingProgress {
  const all = readTrainingProgress();
  const current = normalizeModule(all.modules[moduleId]);
  const set = new Set(current.readIds ?? []);
  contentIds.forEach((id) => set.add(id));
  const next = withCompletion({ ...current, readIds: [...set] });
  return write({ ...all, modules: { ...all.modules, [moduleId]: next } });
}

export function submitQuiz(
  moduleId: string,
  answers: Record<string, number>,
): { progress: TrainingProgress; score: number; passed: boolean } {
  const content = getInteractiveContent(moduleId);
  let correct = 0;
  for (const q of content.quiz) {
    if (answers[q.id] === q.correctIndex) correct += 1;
  }
  const score = content.quiz.length ? correct / content.quiz.length : 0;
  const passed = score >= content.passScore;

  const all = readTrainingProgress();
  const current = normalizeModule(all.modules[moduleId]);
  const layers = { ...current.layers, exam: passed };
  const next = withCompletion({
    ...current,
    quizAnswers: answers,
    quizScore: score,
    quizPassedAt: passed ? current.quizPassedAt ?? new Date().toISOString() : undefined,
    layers,
  });
  const progress = write({ ...all, modules: { ...all.modules, [moduleId]: next } });
  return { progress, score, passed };
}

export function setMilestoneDone(milestoneId: string, done: boolean): TrainingProgress {
  const all = readTrainingProgress();
  return write({
    ...all,
    milestones: { ...all.milestones, [milestoneId]: done },
  });
}

export function setExplainerWatched(moduleId: string): TrainingProgress {
  const all = readTrainingProgress();
  const current = normalizeModule(all.modules[moduleId]);
  if (current.explainerWatchedAt) {
    return all;
  }
  const next: ModuleProgress = {
    ...current,
    explainerWatchedAt: new Date().toISOString(),
  };
  return write({ ...all, modules: { ...all.modules, [moduleId]: next } });
}

export function resetTrainingProgress(): TrainingProgress {
  localStorage.removeItem(TRAINING_STORAGE_KEY);
  return write(defaultProgress());
}

export function completedModuleCount(progress = readTrainingProgress()): number {
  return TRAINING_MODULES.filter((m) =>
    isModuleComplete(normalizeModule(progress.modules[m.id])),
  ).length;
}

export function isContentRead(p: ModuleProgress, id: string): boolean {
  return Boolean(p.readIds?.includes(id));
}

export function layerContentReady(
  moduleId: string,
  layer: TrainingLayerId,
  p: ModuleProgress,
): boolean {
  const content = getInteractiveContent(moduleId);
  const read = new Set(p.readIds ?? []);
  if (layer === 'law') {
    const ids = [...content.lessons, ...content.statutes].map((x) => x.id);
    return ids.every((id) => read.has(id));
  }
  if (layer === 'literature') {
    return content.literatureDigests.every((d) => read.has(d.id));
  }
  if (layer === 'cases') {
    return content.caseBriefs.every((c) => read.has(c.id));
  }
  if (layer === 'deliverable') {
    return combinedDeliverableNotes(p).length >= 8;
  }
  if (layer === 'exam') {
    return Boolean(p.quizPassedAt);
  }
  return true;
}
