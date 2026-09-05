import { TRAINING_STORAGE_KEY, readTrainingProgress } from '@/lib/training-store';
import { STORAGE_KEY, getAllDeals } from '@/lib/real-estate-store';
import type { TrainingProgress } from '@/types/training';
import type { Deal } from '@/types/real-estate';

export const BACKUP_FORMAT = 'solo-nadlan-backup' as const;
export const BACKUP_VERSION = 1 as const;

export interface AppBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  training: TrainingProgress;
  deals: Deal[];
}

export type ImportMode = 'replace' | 'merge';

export interface ImportResult {
  ok: true;
  mode: ImportMode;
  modules: number;
  deals: number;
}

export interface ImportError {
  ok: false;
  error: string;
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDealArray(value: unknown): value is Deal[] {
  return Array.isArray(value) && value.every((d) => d && typeof d === 'object' && 'id' in d);
}

function isTrainingProgress(value: unknown): value is TrainingProgress {
  if (!value || typeof value !== 'object') return false;
  const v = value as TrainingProgress;
  return typeof v.modules === 'object' && v.modules !== null;
}

export function buildAppBackup(): AppBackup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    training: readTrainingProgress(),
    deals: getAllDeals(),
  };
}

export function backupToJson(backup: AppBackup = buildAppBackup()): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function downloadAppBackup(filename = `solo-nadlan-backup-${dateStamp()}.json`): void {
  const blob = new Blob([backupToJson()], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseAppBackup(raw: string): AppBackup | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'קובץ לא תקין — צפוי JSON' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { error: 'מבנה גיבוי לא מזוהה' };
  }
  const obj = parsed as Partial<AppBackup>;
  if (!isTrainingProgress(obj.training)) {
    return { error: 'חסר מפתח training תקין בגיבוי' };
  }
  if (!isDealArray(obj.deals)) {
    return { error: 'חסר מפתח deals תקין בגיבוי' };
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    training: {
      modules: obj.training.modules ?? {},
      milestones: obj.training.milestones ?? {},
      startedAt: obj.training.startedAt ?? new Date().toISOString(),
      updatedAt: obj.training.updatedAt ?? new Date().toISOString(),
    },
    deals: obj.deals,
  };
}

export function applyAppBackup(backup: AppBackup, mode: ImportMode = 'replace'): ImportResult {
  if (mode === 'replace') {
    localStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(backup.training));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.deals));
    return {
      ok: true,
      mode,
      modules: Object.keys(backup.training.modules).length,
      deals: backup.deals.length,
    };
  }

  const currentTraining = readTrainingProgress();
  const mergedTraining: TrainingProgress = {
    ...currentTraining,
    modules: { ...currentTraining.modules, ...backup.training.modules },
    milestones: { ...currentTraining.milestones, ...backup.training.milestones },
    startedAt: currentTraining.startedAt || backup.training.startedAt,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(mergedTraining));

  const currentDeals = getAllDeals();
  const byId = new Map(currentDeals.map((d) => [d.id, d]));
  for (const d of backup.deals) byId.set(d.id, d);
  const mergedDeals = [...byId.values()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedDeals));

  return {
    ok: true,
    mode,
    modules: Object.keys(mergedTraining.modules).length,
    deals: mergedDeals.length,
  };
}

export function importAppBackupFromText(
  raw: string,
  mode: ImportMode = 'replace',
): ImportResult | ImportError {
  const parsed = parseAppBackup(raw);
  if ('error' in parsed) return { ok: false, error: parsed.error };
  return applyAppBackup(parsed, mode);
}
