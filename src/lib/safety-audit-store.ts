import { supabase } from '@/integrations/supabase/client';
import { resizeImageToBlob } from '@/lib/storage-utils';
import type {
  ReportType,
  SafetyAuditClient,
  SafetyAuditDefect,
  SafetyAuditDefectPhoto,
  SafetyAuditReport,
} from '@/types/safety-audit';

export interface SafetyAuditBackup {
  version: number;
  exportedAt: string;
  clients: SafetyAuditClient[];
  reports: SafetyAuditReport[];
  defects: SafetyAuditDefect[];
  photos: SafetyAuditDefectPhoto[];
}

const AUDIT_BUCKET = 'audit-files';
const signedUrlCache = new Map<string, string>();

function nowIso(): string {
  return new Date().toISOString();
}

function today(): string {
  return nowIso().slice(0, 10);
}

function throwIfError(error: { message: string; code?: string } | null): void {
  if (!error) return;
  if (error.code === '42P01') {
    throw new Error('טבלאות Supabase טרם הוגדרו. יש להריץ את קובץ ההתקנה.');
  }
  throw new Error(error.message);
}

function mapClient(row: Record<string, any>): SafetyAuditClient {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReport(row: Record<string, any>): SafetyAuditReport {
  return {
    id: row.id,
    clientId: row.client_id,
    reportType: row.report_type ?? 'workplace',
    reportNumber: row.report_number ?? undefined,
    date: row.date,
    recipient: row.recipient ?? undefined,
    riskLevel: row.risk_level ?? undefined,
    immediateAction: row.immediate_action ?? false,
    executiveSummary: row.executive_summary ?? undefined,
    siteName: row.site_name ?? undefined,
    projectName: row.project_name ?? undefined,
    block: row.block ?? undefined,
    parcel: row.parcel ?? undefined,
    contractor: row.contractor ?? undefined,
    auditDate: row.audit_date ?? undefined,
    auditor: row.auditor ?? undefined,
    auditorRole: row.auditor_role ?? undefined,
    attendees: row.attendees ?? undefined,
    siteManager: row.site_manager ?? undefined,
    workHours: row.work_hours ?? undefined,
    workersCount: row.workers_count ?? undefined,
    workStage: row.work_stage ?? undefined,
    workStagesDetail: row.work_stages_detail ?? undefined,
    status: row.status,
    siteManagerSignatureUrl: row.site_manager_signature_url ?? undefined,
    auditorSignatureUrl: row.auditor_signature_url ?? undefined,
    siteManagerSignedAt: row.site_manager_signed_at ?? undefined,
    auditorSignedAt: row.auditor_signed_at ?? undefined,
    checklist: row.checklist ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDefect(row: Record<string, any>): SafetyAuditDefect {
  return {
    id: row.id,
    reportId: row.report_id,
    checklistTopicKey: row.checklist_topic_key ?? undefined,
    description: row.description,
    severity: row.severity,
    correctiveAction: row.corrective_action ?? undefined,
    responsible: row.responsible ?? undefined,
    dueDate: row.due_date ?? undefined,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

function mapPhoto(row: Record<string, any>): SafetyAuditDefectPhoto {
  return {
    id: row.id,
    defectId: row.defect_id,
    storagePath: row.storage_path,
    caption: row.caption ?? undefined,
    takenAt: row.taken_at ?? undefined,
    createdAt: row.created_at,
  };
}

async function cacheSignedUrls(paths: string[]): Promise<void> {
  const missing = [...new Set(paths.filter((path) => path && !signedUrlCache.has(path)))];
  await Promise.all(
    missing.map(async (path) => {
      const { data, error } = await supabase.storage.from(AUDIT_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
      if (!error && data?.signedUrl) signedUrlCache.set(path, data.signedUrl);
    }),
  );
}

export async function listClients(): Promise<SafetyAuditClient[]> {
  const { data, error } = await supabase
    .from('safety_audit_clients')
    .select('*')
    .order('name', { ascending: true });
  throwIfError(error);
  return (data ?? []).map(mapClient);
}

export async function getClient(id: string): Promise<SafetyAuditClient | null> {
  const { data, error } = await supabase
    .from('safety_audit_clients')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  throwIfError(error);
  return data ? mapClient(data) : null;
}

export async function createClient(
  partial: Pick<SafetyAuditClient, 'name'> & Partial<SafetyAuditClient>,
): Promise<SafetyAuditClient> {
  if (!partial.name.trim()) throw new Error('יש להזין שם לקוח');
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('safety_audit_clients')
    .insert({
      name: partial.name.trim(),
      contact_name: partial.contactName?.trim() || null,
      phone: partial.phone?.trim() || null,
      email: partial.email?.trim() || null,
      address: partial.address?.trim() || null,
      notes: partial.notes?.trim() || null,
      created_by: authData.user?.id ?? null,
    })
    .select()
    .single();
  throwIfError(error);
  return mapClient(data);
}

export async function updateClient(
  id: string,
  partial: Partial<SafetyAuditClient>,
): Promise<SafetyAuditClient> {
  const payload: Record<string, unknown> = { updated_at: nowIso() };
  if ('name' in partial) payload.name = partial.name?.trim();
  if ('contactName' in partial) payload.contact_name = partial.contactName?.trim() || null;
  if ('phone' in partial) payload.phone = partial.phone?.trim() || null;
  if ('email' in partial) payload.email = partial.email?.trim() || null;
  if ('address' in partial) payload.address = partial.address?.trim() || null;
  if ('notes' in partial) payload.notes = partial.notes?.trim() || null;
  const { data, error } = await supabase
    .from('safety_audit_clients')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  throwIfError(error);
  return mapClient(data);
}

async function pathsForReports(reportIds: string[]): Promise<string[]> {
  if (!reportIds.length) return [];
  const { data: defects, error: defectsError } = await supabase
    .from('safety_audit_defects')
    .select('id')
    .in('report_id', reportIds);
  throwIfError(defectsError);
  const defectIds = (defects ?? []).map((row) => row.id);
  if (!defectIds.length) return [];
  const { data: photos, error: photosError } = await supabase
    .from('safety_audit_defect_photos')
    .select('storage_path')
    .in('defect_id', defectIds);
  throwIfError(photosError);
  return (photos ?? []).map((row) => row.storage_path);
}

export async function deleteClient(id: string): Promise<void> {
  const reports = await listReportsByClient(id);
  const paths = await pathsForReports(reports.map((report) => report.id));
  const { error } = await supabase.from('safety_audit_clients').delete().eq('id', id);
  throwIfError(error);
  if (paths.length) await supabase.storage.from(AUDIT_BUCKET).remove(paths);
}

function nextReportNumber(reports: SafetyAuditReport[], type: ReportType): string {
  const year = new Date().getFullYear();
  const prefix = type === 'construction' ? `BN-${year}-` : `SB-${year}-`;
  const numbers = reports
    .map((report) => report.reportNumber)
    .filter((number): number is string => Boolean(number?.startsWith(prefix)))
    .map((number) => Number(number.slice(prefix.length)))
    .filter(Number.isFinite);
  return `${prefix}${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, '0')}`;
}

export async function listReports(): Promise<SafetyAuditReport[]> {
  const { data, error } = await supabase
    .from('safety_audit_reports')
    .select('*')
    .order('created_at', { ascending: false });
  throwIfError(error);
  return (data ?? []).map(mapReport);
}

export async function listReportsByClient(clientId: string): Promise<SafetyAuditReport[]> {
  const { data, error } = await supabase
    .from('safety_audit_reports')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  throwIfError(error);
  return (data ?? []).map(mapReport);
}

export async function getReport(id: string): Promise<SafetyAuditReport | null> {
  const { data, error } = await supabase
    .from('safety_audit_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  throwIfError(error);
  return data ? mapReport(data) : null;
}

export async function createReport(
  partial: Partial<SafetyAuditReport> & { siteName?: string; reportType?: ReportType },
): Promise<SafetyAuditReport> {
  if (!partial.clientId) throw new Error('יש לבחור לקוח לפני יצירת דוח');
  const reportType = partial.reportType ?? 'workplace';
  const reports = await listReports();
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('safety_audit_reports')
    .insert({
      client_id: partial.clientId,
      report_type: reportType,
      report_number: partial.reportNumber ?? nextReportNumber(reports, reportType),
      date: partial.date ?? today(),
      recipient: partial.recipient ?? null,
      risk_level: partial.riskLevel ?? null,
      immediate_action: partial.immediateAction ?? false,
      executive_summary: partial.executiveSummary ?? null,
      site_name: partial.siteName ?? null,
      project_name: partial.projectName ?? null,
      block: partial.block ?? null,
      parcel: partial.parcel ?? null,
      contractor: partial.contractor ?? null,
      audit_date: partial.auditDate ?? today(),
      auditor: partial.auditor ?? (reportType === 'construction' ? 'שלומי סולטן' : null),
      auditor_role: partial.auditorRole ?? (reportType === 'construction' ? 'ממונה בטיחות' : null),
      attendees: partial.attendees ?? null,
      site_manager: partial.siteManager ?? null,
      work_hours: partial.workHours ?? null,
      workers_count: partial.workersCount ?? null,
      work_stage: partial.workStage ?? null,
      work_stages_detail: partial.workStagesDetail ?? null,
      status: partial.status ?? 'draft',
      checklist: partial.checklist ?? {},
      created_by: authData.user?.id ?? null,
    })
    .select()
    .single();
  throwIfError(error);
  return mapReport(data);
}

const reportColumnMap: Record<keyof SafetyAuditReport, string> = {
  id: 'id',
  clientId: 'client_id',
  reportType: 'report_type',
  reportNumber: 'report_number',
  date: 'date',
  recipient: 'recipient',
  riskLevel: 'risk_level',
  immediateAction: 'immediate_action',
  executiveSummary: 'executive_summary',
  siteName: 'site_name',
  projectName: 'project_name',
  block: 'block',
  parcel: 'parcel',
  contractor: 'contractor',
  auditDate: 'audit_date',
  auditor: 'auditor',
  auditorRole: 'auditor_role',
  attendees: 'attendees',
  siteManager: 'site_manager',
  workHours: 'work_hours',
  workersCount: 'workers_count',
  workStage: 'work_stage',
  workStagesDetail: 'work_stages_detail',
  status: 'status',
  siteManagerSignatureUrl: 'site_manager_signature_url',
  auditorSignatureUrl: 'auditor_signature_url',
  siteManagerSignedAt: 'site_manager_signed_at',
  auditorSignedAt: 'auditor_signed_at',
  checklist: 'checklist',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export async function updateReport(
  id: string,
  partial: Partial<SafetyAuditReport>,
): Promise<SafetyAuditReport> {
  const payload: Record<string, unknown> = { updated_at: nowIso() };
  for (const [key, value] of Object.entries(partial)) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
    const column = reportColumnMap[key as keyof SafetyAuditReport];
    if (column) payload[column] = value ?? null;
  }
  const { data, error } = await supabase
    .from('safety_audit_reports')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  throwIfError(error);
  return mapReport(data);
}

export async function deleteReport(id: string): Promise<void> {
  const paths = await pathsForReports([id]);
  const { error } = await supabase.from('safety_audit_reports').delete().eq('id', id);
  throwIfError(error);
  if (paths.length) await supabase.storage.from(AUDIT_BUCKET).remove(paths);
}

export async function listDefects(reportId: string): Promise<SafetyAuditDefect[]> {
  const { data, error } = await supabase
    .from('safety_audit_defects')
    .select('*')
    .eq('report_id', reportId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  throwIfError(error);
  return (data ?? []).map(mapDefect);
}

export async function createDefect(
  reportId: string,
  payload: Omit<SafetyAuditDefect, 'id' | 'reportId' | 'createdAt'>,
): Promise<SafetyAuditDefect> {
  const { data, error } = await supabase
    .from('safety_audit_defects')
    .insert({
      report_id: reportId,
      checklist_topic_key: payload.checklistTopicKey ?? null,
      description: payload.description,
      severity: payload.severity,
      corrective_action: payload.correctiveAction ?? null,
      responsible: payload.responsible ?? null,
      due_date: payload.dueDate ?? null,
      sort_order: payload.sortOrder ?? 0,
    })
    .select()
    .single();
  throwIfError(error);
  return mapDefect(data);
}

export async function updateDefect(
  id: string,
  partial: Partial<SafetyAuditDefect>,
): Promise<SafetyAuditDefect> {
  const map: Record<string, string> = {
    checklistTopicKey: 'checklist_topic_key',
    description: 'description',
    severity: 'severity',
    correctiveAction: 'corrective_action',
    responsible: 'responsible',
    dueDate: 'due_date',
    sortOrder: 'sort_order',
  };
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(partial)) {
    if (map[key]) payload[map[key]] = value ?? null;
  }
  const { data, error } = await supabase
    .from('safety_audit_defects')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  throwIfError(error);
  return mapDefect(data);
}

export async function deleteDefect(id: string): Promise<void> {
  const { data: photos, error: photoError } = await supabase
    .from('safety_audit_defect_photos')
    .select('storage_path')
    .eq('defect_id', id);
  throwIfError(photoError);
  const { error } = await supabase.from('safety_audit_defects').delete().eq('id', id);
  throwIfError(error);
  const paths = (photos ?? []).map((photo) => photo.storage_path);
  if (paths.length) await supabase.storage.from(AUDIT_BUCKET).remove(paths);
}

export async function listDefectPhotos(defectId: string): Promise<SafetyAuditDefectPhoto[]> {
  const { data, error } = await supabase
    .from('safety_audit_defect_photos')
    .select('*')
    .eq('defect_id', defectId)
    .order('created_at', { ascending: true });
  throwIfError(error);
  const photos = (data ?? []).map(mapPhoto);
  await cacheSignedUrls(photos.map((photo) => photo.storagePath));
  return photos;
}

export async function listReportPhotos(reportId: string): Promise<
  Array<SafetyAuditDefectPhoto & {
    defectDescription: string;
    severity: string;
    checklistTopicKey?: string;
  }>
> {
  const defects = await listDefects(reportId);
  if (!defects.length) return [];
  const { data, error } = await supabase
    .from('safety_audit_defect_photos')
    .select('*')
    .in('defect_id', defects.map((defect) => defect.id))
    .order('created_at', { ascending: true });
  throwIfError(error);
  const photos = (data ?? []).map(mapPhoto);
  await cacheSignedUrls(photos.map((photo) => photo.storagePath));
  const byId = new Map(defects.map((defect) => [defect.id, defect]));
  return photos.map((photo) => {
    const defect = byId.get(photo.defectId)!;
    return {
      ...photo,
      defectDescription: defect.description,
      severity: defect.severity,
      checklistTopicKey: defect.checklistTopicKey,
    };
  });
}

export async function addDefectPhoto(
  defectId: string,
  file: File,
  caption?: string,
  takenAt?: string,
): Promise<SafetyAuditDefectPhoto> {
  const { data: defect, error: defectError } = await supabase
    .from('safety_audit_defects')
    .select('report_id')
    .eq('id', defectId)
    .single();
  throwIfError(defectError);
  const { data: report, error: reportError } = await supabase
    .from('safety_audit_reports')
    .select('client_id')
    .eq('id', defect.report_id)
    .single();
  throwIfError(reportError);

  const path = `${report.client_id}/${defect.report_id}/${defectId}/${crypto.randomUUID()}.jpg`;
  const blob = await resizeImageToBlob(file, 1600, 0.78);
  const { error: uploadError } = await supabase.storage
    .from(AUDIT_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg' });
  throwIfError(uploadError);

  const { data, error } = await supabase
    .from('safety_audit_defect_photos')
    .insert({
      defect_id: defectId,
      storage_path: path,
      caption: caption?.trim() || null,
      taken_at: takenAt ?? nowIso(),
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from(AUDIT_BUCKET).remove([path]);
    throwIfError(error);
  }
  await cacheSignedUrls([path]);
  return mapPhoto(data);
}

export function getPublicUrl(storagePath: string): string {
  return signedUrlCache.get(storagePath) ?? storagePath;
}

// Local backups remain readable as a safety net during the cloud migration.
const LOCAL_KEYS = {
  clients: 'safety_audit_clients_v1',
  reports: 'safety_audit_reports_v1',
  defects: 'safety_audit_defects_v1',
  photos: 'safety_audit_defect_photos_v1',
};

function readLocal<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[];
  } catch {
    return [];
  }
}

export function exportSafetyAuditBackup(): SafetyAuditBackup {
  return {
    version: 2,
    exportedAt: nowIso(),
    clients: readLocal(LOCAL_KEYS.clients),
    reports: readLocal(LOCAL_KEYS.reports),
    defects: readLocal(LOCAL_KEYS.defects),
    photos: readLocal(LOCAL_KEYS.photos),
  };
}

export function importSafetyAuditBackup(): void {
  throw new Error('שחזור לענן יתאפשר לאחר השלמת הגדרת מסד הנתונים');
}
