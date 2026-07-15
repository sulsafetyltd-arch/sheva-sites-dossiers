import { SafetyReport, SafetyReportMeta } from '@/types/safety-report';

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
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

export async function getAllSafetyReports(): Promise<SafetyReportMeta[]> {
  return readLocal()
    .map(toMeta)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getSafetyReport(id: string): Promise<SafetyReport | undefined> {
  return readLocal().find((r) => r.id === id);
}

export async function saveSafetyReport(report: SafetyReport): Promise<void> {
  const updated: SafetyReport = {
    ...report,
    updatedAt: new Date().toISOString(),
  };
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
  const report: SafetyReport = {
    id: crypto.randomUUID(),
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
