import {
  TRAINING_MILESTONES,
  TRAINING_MODULES,
  TRAINING_STAGES,
  modulesForStage,
} from '@/data/training-curriculum';
import {
  deliverableSatisfied,
  isModuleComplete,
  readTrainingProgress,
} from '@/lib/training-store';
import type { ModuleProgress, TrainingLayerId, TrainingProgress } from '@/types/training';
import { LAYER_ORDER } from '@/types/training';

const empty = (): ModuleProgress => ({ layers: {}, deliverableNotes: '' });

export function layerProgressCount(progress: ModuleProgress): number {
  return LAYER_ORDER.filter((l) => Boolean(progress.layers[l])).length;
}

export function modulePercent(progress: ModuleProgress): number {
  let score = layerProgressCount(progress);
  if (progress.layers.deliverable && !deliverableSatisfied(progress)) score -= 1;
  return Math.round((score / LAYER_ORDER.length) * 100);
}

export function stageStats(stageId: string, progress: TrainingProgress = readTrainingProgress()) {
  const modules = modulesForStage(stageId);
  const completed = modules.filter((m) =>
    isModuleComplete(progress.modules[m.id] ?? empty()),
  ).length;
  const percents = modules.map((m) => modulePercent(progress.modules[m.id] ?? empty()));
  const percent = modules.length
    ? Math.round(percents.reduce((a, b) => a + b, 0) / modules.length)
    : 0;
  return { total: modules.length, completed, percent };
}

export function overallStats(progress: TrainingProgress = readTrainingProgress()) {
  const total = TRAINING_MODULES.length;
  const completed = TRAINING_MODULES.filter((m) =>
    isModuleComplete(progress.modules[m.id] ?? empty()),
  ).length;
  const stagePercents = TRAINING_STAGES.map((s) => stageStats(s.id, progress).percent);
  const percent = stagePercents.length
    ? Math.round(stagePercents.reduce((a, b) => a + b, 0) / stagePercents.length)
    : 0;
  return { total, completed, percent };
}

export function milestoneAutoReady(
  milestoneId: string,
  progress: TrainingProgress = readTrainingProgress(),
): boolean {
  const m = TRAINING_MILESTONES.find((x) => x.id === milestoneId);
  if (!m?.relatedModuleIds?.length) return false;
  return m.relatedModuleIds.every((id) =>
    isModuleComplete(progress.modules[id] ?? empty()),
  );
}

export function nextRecommendedModule(
  progress: TrainingProgress = readTrainingProgress(),
): string | null {
  for (const stage of TRAINING_STAGES) {
    for (const id of stage.moduleIds) {
      if (!isModuleComplete(progress.modules[id] ?? empty())) return id;
    }
  }
  return null;
}

export function canToggleLayer(
  layer: TrainingLayerId,
  progress: ModuleProgress,
  nextValue: boolean,
): { ok: boolean; reason?: string } {
  if (layer === 'deliverable' && nextValue && progress.deliverableNotes.trim().length < 8) {
    return {
      ok: false,
      reason: 'כלל ברזל: יש לתעד את התוצר המעשי (לפחות כמה מילים / קישור) לפני הסימון.',
    };
  }
  return { ok: true };
}

export function weeksSinceStart(progress: TrainingProgress = readTrainingProgress()): number {
  const start = new Date(progress.startedAt).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / (7 * 24 * 60 * 60 * 1000)));
}
