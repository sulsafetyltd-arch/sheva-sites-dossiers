import { SafetyReport, SafetyReportMeta } from '@/types/safety-report';
import { slimPhotosForStorage } from '@/lib/photo-cache';

const STORAGE_KEY = 'safety_reports_v1';

function readLocal(): SafetyReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SafetyReport[];
  } catch {
    return [];
  }
}

function writeLocal(reports: SafetyReport[]): void {
  const payload = JSON.stringify(reports);
  try {
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (err) {
    // QuotaExceeded – drop oldest drafts' photos further and retry once
    console.warn('localStorage write failed, compacting:', err);
    const compacted = reports.map((r) => ({
      ...r,
      photos: slimPhotosForStorage(r.photos).map((p) => ({
        ...p,
        url: p.url.startsWith('http') ? p.url : `local://${p.id}`,
      })),
    }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compacted));
    } catch (err2) {
      console.error('localStorage still full:', err2);
      throw err2;
    }
  }
}

function toMeta(r: SafetyReport): SafetyReportMeta {
  return {
    id: r.id,
    title: r.title,
    siteName: r.siteName,
    domain: r.domain,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    defectCount: r.detections.filter((d) => d.status !== 'rejected').length,
    criticalCount: r.detections.filter(
      (d) => d.severity === 'critical' && d.status !== 'rejected',
    ).length,
  };
}

function prepareForStorage(report: SafetyReport): SafetyReport {
  return {
    ...report,
    photos: slimPhotosForStorage(report.photos),
  };
}

export async function getAllSafetyReports(): Promise<SafetyReportMeta[]> {
  return readLocal()
    .map(toMeta)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getSafetyReport(id: string): Promise<SafetyReport | undefined> {
  return readLocal().find((r) => r.id === id);
}

export async function saveSafetyReport(report: SafetyReport): Promise<void> {
  const updated = prepareForStorage({
    ...report,
    updatedAt: new Date().toISOString(),
  });
  const all = readLocal().filter((r) => r.id !== updated.id);
  all.push(updated);
  writeLocal(all);
}

export async function deleteSafetyReport(id: string): Promise<void> {
  writeLocal(readLocal().filter((r) => r.id !== id));
}

export async function createSafetyReport(
  partial: Pick<SafetyReport, 'siteName' | 'domain'> &
    Partial<Pick<SafetyReport, 'title' | 'address' | 'inspectorName'>>,
): Promise<SafetyReport> {
  const now = new Date().toISOString();
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `rpt-${Date.now()}`;
  const report: SafetyReport = {
    id,
    title: partial.title || `בדיקת בטיחות – ${partial.siteName}`,
    siteName: partial.siteName,
    address: partial.address ?? '',
    inspectorName: partial.inspectorName ?? '',
    domain: partial.domain,
    status: 'draft',
    photos: [],
    detections: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
  await saveSafetyReport(report);
  return report;
}
