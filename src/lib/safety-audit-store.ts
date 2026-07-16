import type {
  SafetyAuditReport,
  SafetyAuditDefect,
  SafetyAuditDefectPhoto,
} from '@/types/safety-audit';

const REPORTS_KEY = 'safety_audit_reports_v1';
const DEFECTS_KEY = 'safety_audit_defects_v1';
const PHOTOS_KEY = 'safety_audit_defect_photos_v1';

function uid(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function nextReportNumber(reports: SafetyAuditReport[]): string {
  const year = new Date().getFullYear();
  const prefix = `SB-${year}-`;
  const nums = reports
    .map((r) => r.reportNumber)
    .filter((n): n is string => !!n && n.startsWith(prefix))
    .map((n) => Number(n.slice(prefix.length)))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export async function listReports(): Promise<SafetyAuditReport[]> {
  const reports = readJson<SafetyAuditReport[]>(REPORTS_KEY, []);
  return [...reports].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getReport(id: string): Promise<SafetyAuditReport | null> {
  const reports = readJson<SafetyAuditReport[]>(REPORTS_KEY, []);
  return reports.find((r) => r.id === id) ?? null;
}

export async function createReport(
  partial: Partial<SafetyAuditReport> & { siteName?: string }
): Promise<SafetyAuditReport> {
  const reports = readJson<SafetyAuditReport[]>(REPORTS_KEY, []);
  const createdAt = nowIso();
  const report: SafetyAuditReport = {
    id: uid(),
    reportNumber: partial.reportNumber ?? nextReportNumber(reports),
    date: partial.date ?? today(),
    recipient: partial.recipient,
    riskLevel: partial.riskLevel,
    immediateAction: partial.immediateAction ?? false,
    executiveSummary: partial.executiveSummary,
    siteName: partial.siteName,
    contractor: partial.contractor,
    auditDate: partial.auditDate ?? today(),
    auditor: partial.auditor,
    attendees: partial.attendees,
    siteManager: partial.siteManager,
    workHours: partial.workHours,
    workersCount: partial.workersCount,
    workStage: partial.workStage,
    status: partial.status ?? 'draft',
    siteManagerSignatureUrl: partial.siteManagerSignatureUrl,
    auditorSignatureUrl: partial.auditorSignatureUrl,
    checklist: partial.checklist ?? {},
    createdAt,
    updatedAt: createdAt,
  };
  reports.unshift(report);
  writeJson(REPORTS_KEY, reports);
  return report;
}

export async function updateReport(
  id: string,
  partial: Partial<SafetyAuditReport>
): Promise<SafetyAuditReport> {
  const reports = readJson<SafetyAuditReport[]>(REPORTS_KEY, []);
  const idx = reports.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error('דוח לא נמצא');
  const updated: SafetyAuditReport = {
    ...reports[idx],
    ...partial,
    id,
    updatedAt: nowIso(),
  };
  reports[idx] = updated;
  writeJson(REPORTS_KEY, reports);
  return updated;
}

export async function deleteReport(id: string): Promise<void> {
  const reports = readJson<SafetyAuditReport[]>(REPORTS_KEY, []);
  writeJson(
    REPORTS_KEY,
    reports.filter((r) => r.id !== id)
  );
  const defects = readJson<SafetyAuditDefect[]>(DEFECTS_KEY, []);
  const remainingDefects = defects.filter((d) => d.reportId !== id);
  const removedIds = new Set(defects.filter((d) => d.reportId === id).map((d) => d.id));
  writeJson(DEFECTS_KEY, remainingDefects);
  const photos = readJson<SafetyAuditDefectPhoto[]>(PHOTOS_KEY, []);
  writeJson(
    PHOTOS_KEY,
    photos.filter((p) => !removedIds.has(p.defectId))
  );
}

export async function listDefects(reportId: string): Promise<SafetyAuditDefect[]> {
  const defects = readJson<SafetyAuditDefect[]>(DEFECTS_KEY, []);
  return defects
    .filter((d) => d.reportId === reportId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.createdAt.localeCompare(b.createdAt));
}

export async function createDefect(
  reportId: string,
  payload: Omit<SafetyAuditDefect, 'id' | 'reportId' | 'createdAt'>
): Promise<SafetyAuditDefect> {
  const defects = readJson<SafetyAuditDefect[]>(DEFECTS_KEY, []);
  const defect: SafetyAuditDefect = {
    id: uid(),
    reportId,
    checklistTopicKey: payload.checklistTopicKey,
    description: payload.description,
    severity: payload.severity,
    correctiveAction: payload.correctiveAction,
    responsible: payload.responsible,
    dueDate: payload.dueDate,
    sortOrder: payload.sortOrder ?? defects.filter((d) => d.reportId === reportId).length,
    createdAt: nowIso(),
  };
  defects.push(defect);
  writeJson(DEFECTS_KEY, defects);
  return defect;
}

export async function updateDefect(
  id: string,
  partial: Partial<SafetyAuditDefect>
): Promise<SafetyAuditDefect> {
  const defects = readJson<SafetyAuditDefect[]>(DEFECTS_KEY, []);
  const idx = defects.findIndex((d) => d.id === id);
  if (idx < 0) throw new Error('ליקוי לא נמצא');
  const updated: SafetyAuditDefect = { ...defects[idx], ...partial, id, reportId: defects[idx].reportId };
  defects[idx] = updated;
  writeJson(DEFECTS_KEY, defects);
  return updated;
}

export async function deleteDefect(id: string): Promise<void> {
  const defects = readJson<SafetyAuditDefect[]>(DEFECTS_KEY, []);
  writeJson(
    DEFECTS_KEY,
    defects.filter((d) => d.id !== id)
  );
  const photos = readJson<SafetyAuditDefectPhoto[]>(PHOTOS_KEY, []);
  writeJson(
    PHOTOS_KEY,
    photos.filter((p) => p.defectId !== id)
  );
}

export async function listDefectPhotos(defectId: string): Promise<SafetyAuditDefectPhoto[]> {
  const photos = readJson<SafetyAuditDefectPhoto[]>(PHOTOS_KEY, []);
  return photos.filter((p) => p.defectId === defectId);
}

export async function listReportPhotos(reportId: string): Promise<
  Array<SafetyAuditDefectPhoto & { defectDescription: string; severity: string }>
> {
  const defects = await listDefects(reportId);
  const photos = readJson<SafetyAuditDefectPhoto[]>(PHOTOS_KEY, []);
  const byId = new Map(defects.map((d) => [d.id, d]));
  return photos
    .filter((p) => byId.has(p.defectId))
    .map((p) => {
      const d = byId.get(p.defectId)!;
      return {
        ...p,
        defectDescription: d.description,
        severity: d.severity,
      };
    });
}

/** Store photo as data URL in localStorage (demo mode; no Supabase). */
export async function addDefectPhoto(
  defectId: string,
  file: File,
  caption?: string,
  takenAt?: string
): Promise<SafetyAuditDefectPhoto> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('קריאת הקובץ נכשלה'));
    reader.readAsDataURL(file);
  });

  const photos = readJson<SafetyAuditDefectPhoto[]>(PHOTOS_KEY, []);
  const photo: SafetyAuditDefectPhoto = {
    id: uid(),
    defectId,
    storagePath: dataUrl,
    caption,
    takenAt: takenAt ?? nowIso(),
    createdAt: nowIso(),
  };
  photos.push(photo);
  writeJson(PHOTOS_KEY, photos);
  return photo;
}

export function getPublicUrl(storagePath: string): string {
  // In local mode storagePath is already a data URL (or blob URL).
  return storagePath;
}
