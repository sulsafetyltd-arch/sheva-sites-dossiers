import type {
  SafetyAuditReport,
  SafetyAuditDefect,
  SafetyAuditDefectPhoto,
  SafetyAuditClient,
  ReportType,
} from '@/types/safety-audit';

const CLIENTS_KEY = 'safety_audit_clients_v1';
const REPORTS_KEY = 'safety_audit_reports_v1';
const DEFECTS_KEY = 'safety_audit_defects_v1';
const PHOTOS_KEY = 'safety_audit_defect_photos_v1';
const BACKUP_VERSION = 2;
const LEGACY_CLIENT_ID = 'legacy-existing-reports';

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

export interface SafetyAuditBackup {
  version: number;
  exportedAt: string;
  clients: SafetyAuditClient[];
  reports: SafetyAuditReport[];
  defects: SafetyAuditDefect[];
  photos: SafetyAuditDefectPhoto[];
}

export function exportSafetyAuditBackup(): SafetyAuditBackup {
  migrateClientsAndReports();
  return {
    version: BACKUP_VERSION,
    exportedAt: nowIso(),
    clients: readJson<SafetyAuditClient[]>(CLIENTS_KEY, []),
    reports: readJson<SafetyAuditReport[]>(REPORTS_KEY, []).map(normalizeReport),
    defects: readJson<SafetyAuditDefect[]>(DEFECTS_KEY, []),
    photos: readJson<SafetyAuditDefectPhoto[]>(PHOTOS_KEY, []),
  };
}

export function importSafetyAuditBackup(backup: SafetyAuditBackup): void {
  if (
    !backup ||
    ![1, BACKUP_VERSION].includes(backup.version) ||
    !Array.isArray(backup.reports) ||
    !Array.isArray(backup.defects) ||
    !Array.isArray(backup.photos)
  ) {
    throw new Error('קובץ הגיבוי אינו תקין');
  }
  const clients = Array.isArray(backup.clients) ? backup.clients : [];
  writeJson(CLIENTS_KEY, clients);
  writeJson(REPORTS_KEY, backup.reports.map(normalizeReport));
  writeJson(DEFECTS_KEY, backup.defects);
  writeJson(PHOTOS_KEY, backup.photos);
  migrateClientsAndReports();
}

function normalizeReport(r: SafetyAuditReport): SafetyAuditReport {
  return {
    ...r,
    clientId: r.clientId || LEGACY_CLIENT_ID,
    reportType: r.reportType ?? 'workplace',
  };
}

function migrateClientsAndReports(): void {
  const reports = readJson<SafetyAuditReport[]>(REPORTS_KEY, []);
  const hasUnassigned = reports.some((report) => !report.clientId);
  if (!hasUnassigned) return;

  const clients = readJson<SafetyAuditClient[]>(CLIENTS_KEY, []);
  if (!clients.some((client) => client.id === LEGACY_CLIENT_ID)) {
    const timestamp = nowIso();
    clients.unshift({
      id: LEGACY_CLIENT_ID,
      name: 'דוחות קיימים',
      notes: 'נוצר אוטומטית עבור דוחות שנוצרו לפני הוספת ניהול הלקוחות',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    writeJson(CLIENTS_KEY, clients);
  }
  writeJson(
    REPORTS_KEY,
    reports.map((report) => normalizeReport(report))
  );
}

export async function listClients(): Promise<SafetyAuditClient[]> {
  migrateClientsAndReports();
  return readJson<SafetyAuditClient[]>(CLIENTS_KEY, []).sort((a, b) =>
    a.name.localeCompare(b.name, 'he')
  );
}

export async function getClient(id: string): Promise<SafetyAuditClient | null> {
  migrateClientsAndReports();
  return readJson<SafetyAuditClient[]>(CLIENTS_KEY, []).find((client) => client.id === id) ?? null;
}

export async function createClient(
  partial: Pick<SafetyAuditClient, 'name'> & Partial<SafetyAuditClient>
): Promise<SafetyAuditClient> {
  const clients = readJson<SafetyAuditClient[]>(CLIENTS_KEY, []);
  const timestamp = nowIso();
  const client: SafetyAuditClient = {
    id: uid(),
    name: partial.name.trim(),
    contactName: partial.contactName?.trim() || undefined,
    phone: partial.phone?.trim() || undefined,
    email: partial.email?.trim() || undefined,
    address: partial.address?.trim() || undefined,
    notes: partial.notes?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  if (!client.name) throw new Error('יש להזין שם לקוח');
  clients.push(client);
  writeJson(CLIENTS_KEY, clients);
  return client;
}

export async function updateClient(
  id: string,
  partial: Partial<SafetyAuditClient>
): Promise<SafetyAuditClient> {
  const clients = readJson<SafetyAuditClient[]>(CLIENTS_KEY, []);
  const index = clients.findIndex((client) => client.id === id);
  if (index < 0) throw new Error('לקוח לא נמצא');
  const updated = { ...clients[index], ...partial, id, updatedAt: nowIso() };
  clients[index] = updated;
  writeJson(CLIENTS_KEY, clients);
  return updated;
}

export async function deleteClient(id: string): Promise<void> {
  const reports = await listReportsByClient(id);
  for (const report of reports) await deleteReport(report.id);
  const clients = readJson<SafetyAuditClient[]>(CLIENTS_KEY, []);
  writeJson(CLIENTS_KEY, clients.filter((client) => client.id !== id));
}

function nextReportNumber(reports: SafetyAuditReport[], type: ReportType): string {
  const year = new Date().getFullYear();
  const prefix = type === 'construction' ? `BN-${year}-` : `SB-${year}-`;
  const nums = reports
    .map((r) => r.reportNumber)
    .filter((n): n is string => !!n && n.startsWith(prefix))
    .map((n) => Number(n.slice(prefix.length)))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export async function listReports(): Promise<SafetyAuditReport[]> {
  migrateClientsAndReports();
  const reports = readJson<SafetyAuditReport[]>(REPORTS_KEY, []).map(normalizeReport);
  return [...reports].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listReportsByClient(clientId: string): Promise<SafetyAuditReport[]> {
  return (await listReports()).filter((report) => report.clientId === clientId);
}

export async function getReport(id: string): Promise<SafetyAuditReport | null> {
  const reports = readJson<SafetyAuditReport[]>(REPORTS_KEY, []);
  const found = reports.find((r) => r.id === id);
  return found ? normalizeReport(found) : null;
}

export async function createReport(
  partial: Partial<SafetyAuditReport> & { siteName?: string; reportType?: ReportType }
): Promise<SafetyAuditReport> {
  const reports = readJson<SafetyAuditReport[]>(REPORTS_KEY, []);
  const createdAt = nowIso();
  const reportType: ReportType = partial.reportType ?? 'workplace';
  if (!partial.clientId) throw new Error('יש לבחור לקוח לפני יצירת דוח');
  const report: SafetyAuditReport = {
    id: uid(),
    clientId: partial.clientId,
    reportType,
    reportNumber: partial.reportNumber ?? nextReportNumber(reports, reportType),
    date: partial.date ?? today(),
    recipient: partial.recipient,
    riskLevel: partial.riskLevel,
    immediateAction: partial.immediateAction ?? false,
    executiveSummary: partial.executiveSummary,
    siteName: partial.siteName,
    projectName: partial.projectName,
    block: partial.block,
    parcel: partial.parcel,
    contractor: partial.contractor,
    auditDate: partial.auditDate ?? today(),
    auditor: partial.auditor ?? (reportType === 'construction' ? 'שלומי סולטן' : undefined),
    auditorRole: partial.auditorRole ?? (reportType === 'construction' ? 'ממונה בטיחות' : undefined),
    attendees: partial.attendees,
    siteManager: partial.siteManager,
    workHours: partial.workHours,
    workersCount: partial.workersCount,
    workStage: partial.workStage,
    workStagesDetail: partial.workStagesDetail,
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
  Array<
    SafetyAuditDefectPhoto & {
      defectDescription: string;
      severity: string;
      checklistTopicKey?: string;
    }
  >
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
        checklistTopicKey: d.checklistTopicKey,
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
