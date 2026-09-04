import type {
  ModuleProgress,
  TrainingLayerId,
  TrainingProgress,
} from '@/types/training';
import { LAYER_ORDER } from '@/types/training';
import { TRAINING_MODULES } from '@/data/training-curriculum';

export const TRAINING_STORAGE_KEY = 'real-estate-training-v1';

function emptyModule(): ModuleProgress {
  return { layers: {}, deliverableNotes: '' };
}

function defaultProgress(): TrainingProgress {
  const now = new Date().toISOString();
  return { modules: {}, milestones: {}, startedAt: now, updatedAt: now };
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
  return readTrainingProgress().modules[moduleId] ?? emptyModule();
}

/** כלל ברזל: תוצר מעשי דורש סימון + תיעוד (≥8 תווים) */
export function deliverableSatisfied(p: ModuleProgress): boolean {
  return Boolean(p.layers.deliverable) && p.deliverableNotes.trim().length >= 8;
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
  const current = all.modules[moduleId] ?? emptyModule();
  const layers = { ...current.layers, [layer]: complete };

  if (layer === 'deliverable' && complete && current.deliverableNotes.trim().length < 8) {
    layers.deliverable = false;
  }

  const next = withCompletion({ ...current, layers });
  return write({ ...all, modules: { ...all.modules, [moduleId]: next } });
}

export function setDeliverableNotes(moduleId: string, notes: string): TrainingProgress {
  const all = readTrainingProgress();
  const current = all.modules[moduleId] ?? emptyModule();
  const layers = { ...current.layers };
  if (layers.deliverable && notes.trim().length < 8) {
    layers.deliverable = false;
  }
  const next = withCompletion({ ...current, deliverableNotes: notes, layers });
  return write({ ...all, modules: { ...all.modules, [moduleId]: next } });
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
  const current = all.modules[moduleId] ?? emptyModule();
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
    isModuleComplete(progress.modules[m.id] ?? emptyModule()),
  ).length;
}
