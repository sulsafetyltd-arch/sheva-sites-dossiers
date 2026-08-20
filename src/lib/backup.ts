import type { Deal } from '@/types/real-estate';
import { STORAGE_KEY } from '@/lib/real-estate-store';
import { OFFICE_KEY } from '@/lib/office-profile';
import { CUSTOM_TEMPLATES_KEY } from '@/lib/custom-templates';

const OVERRIDES_PREFIX = 'solo-doc-overrides-';
const HISTORY_KEY = 'solo-backup-history-v1';

export interface BackupFile {
  app: 'solo-nadlan';
  version: 1;
  exportedAt: string;
  deals: Deal[];
  office: unknown;
  docOverrides: Record<string, unknown>;
  customTemplates?: unknown[];
}

export function getBackupHistory(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function recordBackup(timestamp: string): void {
  const history = [timestamp, ...getBackupHistory()].slice(0, 10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function buildBackup(): BackupFile {
  let deals: Deal[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (Array.isArray(parsed)) deals = parsed;
  } catch {
    deals = [];
  }
  let office: unknown = null;
  try {
    office = JSON.parse(localStorage.getItem(OFFICE_KEY) ?? 'null');
  } catch {
    office = null;
  }
  const docOverrides: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(OVERRIDES_PREFIX)) {
      try {
        docOverrides[key] = JSON.parse(localStorage.getItem(key) ?? 'null');
      } catch {
        // skip unreadable entry
      }
    }
  }
  let customTemplates: unknown[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) ?? '[]');
    if (Array.isArray(parsed)) customTemplates = parsed;
  } catch {
    customTemplates = [];
  }
  return {
    app: 'solo-nadlan',
    version: 1,
    exportedAt: new Date().toISOString(),
    deals,
    office,
    docOverrides,
    customTemplates,
  };
}

export function downloadBackup(): void {
  const backup = buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `solo-nadlan-backup-${backup.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  recordBackup(backup.exportedAt);
}

function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export async function restoreBackup(file: File): Promise<{ deals: number }> {
  const text = await readFileText(file);
  const parsed = JSON.parse(text) as Partial<BackupFile>;
  if (parsed.app !== 'solo-nadlan' || !Array.isArray(parsed.deals)) {
    throw new Error('הקובץ אינו גיבוי של סולו נדלן');
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.deals));
  if (parsed.office) localStorage.setItem(OFFICE_KEY, JSON.stringify(parsed.office));
  if (parsed.docOverrides) {
    for (const [key, value] of Object.entries(parsed.docOverrides)) {
      if (key.startsWith(OVERRIDES_PREFIX)) localStorage.setItem(key, JSON.stringify(value));
    }
  }
  if (Array.isArray(parsed.customTemplates)) {
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(parsed.customTemplates));
  }
  return { deals: parsed.deals.length };
}
