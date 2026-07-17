import { supabase } from '@/integrations/supabase/client';
import { resizeImageToBlob } from '@/lib/storage-utils';
import type {
  ReportType,
  ChecklistItemState,
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
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const SIGNED_URL_REFRESH_MARGIN_MS = 5 * 60 * 1000;
const EMPTY_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

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

type DatabaseRow = Record<string, unknown>;

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function mapClient(row: DatabaseRow): SafetyAuditClient {
  return {
    id: String(row.id),
    name: String(row.name),
    contactName: optionalString(row.contact_name),
    phone: optionalString(row.phone),
    email: optionalString(row.email),
    address: optionalString(row.address),
    notes: optionalString(row.notes),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapSafetyReportRow(row: DatabaseRow): SafetyAuditReport {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    reportType: row.report_type === 'construction' ? 'construction' : 'workplace',
    reportNumber: optionalString(row.report_number),
    date: String(row.date),
    recipient: optionalString(row.recipient),
    riskLevel: row.risk_level === 'low' || row.risk_level === 'medium' || row.risk_level === 'high'
      ? row.risk_level
      : undefined,
    immediateAction: Boolean(row.immediate_action),
    executiveSummary: optionalString(row.executive_summary),
    siteName: optionalString(row.site_name),
    projectName: optionalString(row.project_name),
    block: optionalString(row.block),
    parcel: optionalString(row.parcel),
    contractor: optionalString(row.contractor),
    auditDate: optionalString(row.audit_date),
    auditor: optionalString(row.auditor),
    auditorRole: optionalString(row.auditor_role),
    auditorPhone: optionalString(row.auditor_phone),
    attendees: optionalString(row.attendees),
    siteManager: optionalString(row.site_manager),
    workHours: optionalString(row.work_hours),
    workersCount: typeof row.workers_count === 'number' ? row.workers_count : undefined,
    workStage: optionalString(row.work_stage),
    workStagesDetail: optionalString(row.work_stages_detail),
    status: row.status === 'final' ? 'final' : 'draft',
    siteManagerSignatureUrl: optionalString(row.site_manager_signature_url),
    auditorSignatureUrl: optionalString(row.auditor_signature_url),
    auditorStampUrl: optionalString(row.auditor_stamp_url),
    siteManagerSignedAt: optionalString(row.site_manager_signed_at),
    auditorSignedAt: optionalString(row.auditor_signed_at),
    checklist: (row.checklist as Record<string, ChecklistItemState> | null) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapDefect(row: DatabaseRow): SafetyAuditDefect {
  return {
    id: String(row.id),
    reportId: String(row.report_id),
    checklistTopicKey: optionalString(row.checklist_topic_key),
    description: String(row.description),
    severity: row.severity === 'high' || row.severity === 'low' ? row.severity : 'medium',
    correctiveAction: optionalString(row.corrective_action),
    responsible: optionalString(row.responsible),
    dueDate: optionalString(row.due_date),
    sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0,
    createdAt: String(row.created_at),
  };
}

function mapPhoto(row: DatabaseRow): SafetyAuditDefectPhoto {
  return {
    id: String(row.id),
    defectId: String(row.defect_id),
    storagePath: String(row.storage_path),
    caption: optionalString(row.caption),
    takenAt: optionalString(row.taken_at),
    createdAt: String(row.created_at),
  };
}

async function cacheSignedUrls(paths: string[]): Promise<void> {
  const now = Date.now();
  const missing = [
    ...new Set(
      paths.filter((path) => {
        if (!path) return false;
        const cached = signedUrlCache.get(path);
        return !cached || cached.expiresAt - SIGNED_URL_REFRESH_MARGIN_MS <= now;
      }),
    ),
  ];
  await Promise.all(
    missing.map(async (path) => {
      const { data, error } = await supabase.storage
        .from(AUDIT_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      throwIfError(error);
      if (!data?.signedUrl) throw new Error('לא ניתן לטעון תמונת ליקוי');
      signedUrlCache.set(path, {
        url: data.signedUrl,
        expiresAt: now + SIGNED_URL_TTL_SECONDS * 1000,
      });
    }),
  );
}

export function clearSafetyFileCache(): void {
  signedUrlCache.clear();
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
  if ('name' in partial && !partial.name?.trim()) throw new Error('שם הלקוח אינו יכול להיות ריק');
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
  if (paths.length) {
    const { error } = await supabase.storage.from(AUDIT_BUCKET).remove(paths);
    throwIfError(error);
  }
  const { error } = await supabase.from('safety_audit_clients').delete().eq('id', id);
  throwIfError(error);
}

export async function listReports(): Promise<SafetyAuditReport[]> {
  const { data, error } = await supabase
    .from('safety_audit_reports')
    .select('*')
    .order('created_at', { ascending: false });
  throwIfError(error);
  return (data ?? []).map(mapSafetyReportRow);
}

export async function listReportsByClient(clientId: string): Promise<SafetyAuditReport[]> {
  const { data, error } = await supabase
    .from('safety_audit_reports')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  throwIfError(error);
  return (data ?? []).map(mapSafetyReportRow);
}

export async function getReport(id: string): Promise<SafetyAuditReport | null> {
  const { data, error } = await supabase
    .from('safety_audit_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  throwIfError(error);
  return data ? mapSafetyReportRow(data) : null;
}

export async function createReport(
  partial: Partial<SafetyAuditReport> & { siteName?: string; reportType?: ReportType },
): Promise<SafetyAuditReport> {
  if (!partial.clientId) throw new Error('יש לבחור לקוח לפני יצירת דוח');
  const reportType = partial.reportType ?? 'workplace';
  const { data: authData } = await supabase.auth.getUser();
  const { data: issuerProfile, error: profileError } = authData.user
    ? await supabase
        .from('profiles')
        .select('full_name,job_title,phone,signature_data_url,stamp_data_url')
        .eq('id', authData.user.id)
        .single()
    : { data: null };
  throwIfError(profileError ?? null);
  if (!issuerProfile?.full_name) {
    throw new Error('יש להשלים שם מלא בפרופיל האישי לפני יצירת דוח');
  }
  const { data: allocatedNumber, error: numberError } = partial.reportNumber
    ? { data: partial.reportNumber, error: null }
    : await supabase.rpc('allocate_safety_report_number', { p_report_type: reportType });
  throwIfError(numberError);
  const { data, error } = await supabase
    .from('safety_audit_reports')
    .insert({
      client_id: partial.clientId,
      report_type: reportType,
      report_number: allocatedNumber,
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
      auditor: partial.auditor ?? issuerProfile?.full_name ?? (reportType === 'construction' ? 'שלומי סולטן' : null),
      auditor_role: partial.auditorRole ?? issuerProfile?.job_title ?? (reportType === 'construction' ? 'ממונה בטיחות' : null),
      auditor_phone: partial.auditorPhone ?? issuerProfile?.phone ?? null,
      attendees: partial.attendees ?? null,
      site_manager: partial.siteManager ?? null,
      work_hours: partial.workHours ?? null,
      workers_count: partial.workersCount ?? null,
      work_stage: partial.workStage ?? null,
      work_stages_detail: partial.workStagesDetail ?? null,
      status: partial.status ?? 'draft',
      auditor_signature_url: partial.auditorSignatureUrl ?? issuerProfile?.signature_data_url ?? null,
      auditor_stamp_url: partial.auditorStampUrl ?? issuerProfile?.stamp_data_url ?? null,
      auditor_signed_at: partial.auditorSignedAt ?? null,
      checklist: partial.checklist ?? {},
      created_by: authData.user?.id ?? null,
    })
    .select()
    .single();
  throwIfError(error);
  return mapSafetyReportRow(data);
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
  auditorPhone: 'auditor_phone',
  attendees: 'attendees',
  siteManager: 'site_manager',
  workHours: 'work_hours',
  workersCount: 'workers_count',
  workStage: 'work_stage',
  workStagesDetail: 'work_stages_detail',
  status: 'status',
  siteManagerSignatureUrl: 'site_manager_signature_url',
  auditorSignatureUrl: 'auditor_signature_url',
  auditorStampUrl: 'auditor_stamp_url',
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
    if (
      key === 'id' ||
      key === 'clientId' ||
      key === 'reportNumber' ||
      key === 'createdAt' ||
      key === 'updatedAt'
    ) continue;
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
  return mapSafetyReportRow(data);
}

export async function deleteReport(id: string): Promise<void> {
  const paths = await pathsForReports([id]);
  if (paths.length) {
    const { error } = await supabase.storage.from(AUDIT_BUCKET).remove(paths);
    throwIfError(error);
  }
  const { error } = await supabase.from('safety_audit_reports').delete().eq('id', id);
  throwIfError(error);
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
  const { data, error } = await supabase.rpc('create_safety_defect', {
    p_report_id: reportId,
    p_checklist_topic_key: payload.checklistTopicKey ?? null,
    p_description: payload.description,
    p_severity: payload.severity,
    p_corrective_action: payload.correctiveAction ?? null,
    p_responsible: payload.responsible ?? null,
    p_due_date: payload.dueDate ?? null,
    p_sort_order: payload.sortOrder ?? 0,
  });
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
  const paths = (photos ?? []).map((photo) => photo.storage_path);
  if (paths.length) {
    const { error } = await supabase.storage.from(AUDIT_BUCKET).remove(paths);
    throwIfError(error);
  }
  const { error } = await supabase.from('safety_audit_defects').delete().eq('id', id);
  throwIfError(error);
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
  return photos.flatMap((photo) => {
    const defect = byId.get(photo.defectId);
    if (!defect) return [];
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

export async function deleteDefectPhoto(photo: SafetyAuditDefectPhoto): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(AUDIT_BUCKET)
    .remove([photo.storagePath]);
  throwIfError(storageError);
  const { error } = await supabase
    .from('safety_audit_defect_photos')
    .delete()
    .eq('id', photo.id);
  throwIfError(error);
  signedUrlCache.delete(photo.storagePath);
}

export function getPublicUrl(storagePath: string): string {
  return signedUrlCache.get(storagePath)?.url ?? EMPTY_IMAGE;
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

const LEGACY_MIGRATION_KEY = 'safety_audit_cloud_migration_v1';

function cloudId(id: string, replacements: Map<string, string>): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const existing = replacements.get(id);
  if (existing) return existing;
  const replacement = crypto.randomUUID();
  replacements.set(id, replacement);
  return replacement;
}

export function hasLegacySafetyData(): boolean {
  if (localStorage.getItem(LEGACY_MIGRATION_KEY)) return false;
  return Object.values(LOCAL_KEYS).some((key) => readLocal<unknown>(key).length > 0);
}

export async function migrateLegacySafetyData(): Promise<{
  clients: number;
  reports: number;
  defects: number;
  photos: number;
}> {
  const backup = exportSafetyAuditBackup();
  const replacements = new Map<string, string>();
  const clientIds = new Map(backup.clients.map((client) => [client.id, cloudId(client.id, replacements)]));
  const reportIds = new Map(backup.reports.map((report) => [report.id, cloudId(report.id, replacements)]));
  const defectIds = new Map(backup.defects.map((defect) => [defect.id, cloudId(defect.id, replacements)]));
  const photoIds = new Map(backup.photos.map((photo) => [photo.id, cloudId(photo.id, replacements)]));
  const { data: authData } = await supabase.auth.getUser();

  if (backup.clients.length) {
    const { error } = await supabase.from('safety_audit_clients').upsert(
      backup.clients.map((client) => ({
        id: clientIds.get(client.id),
        name: client.name,
        contact_name: client.contactName ?? null,
        phone: client.phone ?? null,
        email: client.email ?? null,
        address: client.address ?? null,
        notes: client.notes ?? null,
        created_by: authData.user?.id ?? null,
        created_at: client.createdAt,
        updated_at: client.updatedAt,
      })),
      { onConflict: 'id' },
    );
    throwIfError(error);
  }

  if (backup.reports.length) {
    const { error } = await supabase.from('safety_audit_reports').upsert(
      backup.reports.map((report) => ({
        id: reportIds.get(report.id),
        client_id: clientIds.get(report.clientId) ?? cloudId(report.clientId, replacements),
        report_type: report.reportType ?? 'workplace',
        report_number: report.reportNumber ?? null,
        date: report.date,
        recipient: report.recipient ?? null,
        risk_level: report.riskLevel ?? null,
        immediate_action: report.immediateAction ?? false,
        executive_summary: report.executiveSummary ?? null,
        site_name: report.siteName ?? null,
        project_name: report.projectName ?? null,
        block: report.block ?? null,
        parcel: report.parcel ?? null,
        contractor: report.contractor ?? null,
        audit_date: report.auditDate ?? null,
        auditor: report.auditor ?? null,
        auditor_role: report.auditorRole ?? null,
        auditor_phone: report.auditorPhone ?? null,
        attendees: report.attendees ?? null,
        site_manager: report.siteManager ?? null,
        work_hours: report.workHours ?? null,
        workers_count: report.workersCount ?? null,
        work_stage: report.workStage ?? null,
        work_stages_detail: report.workStagesDetail ?? null,
        status: report.status,
        site_manager_signature_url: report.siteManagerSignatureUrl ?? null,
        auditor_signature_url: report.auditorSignatureUrl ?? null,
        auditor_stamp_url: report.auditorStampUrl ?? null,
        site_manager_signed_at: report.siteManagerSignedAt ?? null,
        auditor_signed_at: report.auditorSignedAt ?? null,
        checklist: report.checklist ?? {},
        created_by: authData.user?.id ?? null,
        created_at: report.createdAt,
        updated_at: report.updatedAt,
      })),
      { onConflict: 'id' },
    );
    throwIfError(error);
  }

  if (backup.defects.length) {
    const { error } = await supabase.from('safety_audit_defects').upsert(
      backup.defects.map((defect) => ({
        id: defectIds.get(defect.id),
        report_id: reportIds.get(defect.reportId),
        checklist_topic_key: defect.checklistTopicKey ?? null,
        description: defect.description,
        severity: defect.severity,
        corrective_action: defect.correctiveAction ?? null,
        responsible: defect.responsible ?? null,
        due_date: defect.dueDate ?? null,
        sort_order: defect.sortOrder ?? 0,
        created_at: defect.createdAt,
      })),
      { onConflict: 'id' },
    );
    throwIfError(error);
  }

  const reportsById = new Map(backup.reports.map((report) => [report.id, report]));
  const defectsById = new Map(backup.defects.map((defect) => [defect.id, defect]));
  let migratedPhotos = 0;
  const failedPhotos: string[] = [];
  for (const photo of backup.photos) {
    const defect = defectsById.get(photo.defectId);
    const report = defect ? reportsById.get(defect.reportId) : undefined;
    if (!defect || !report) continue;
    const clientId = clientIds.get(report.clientId) ?? cloudId(report.clientId, replacements);
    const reportId = reportIds.get(report.id)!;
    const defectId = defectIds.get(defect.id)!;
    const photoId = photoIds.get(photo.id)!;
    const path = `${clientId}/${reportId}/${defectId}/${photoId}.jpg`;
    try {
      const source = await fetch(photo.storagePath);
      if (!source.ok) throw new Error('Legacy photo is unavailable');
      const blob = await source.blob();
      const { error: uploadError } = await supabase.storage
        .from(AUDIT_BUCKET)
        .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
      throwIfError(uploadError);
      const { error: rowError } = await supabase.from('safety_audit_defect_photos').upsert({
        id: photoId,
        defect_id: defectId,
        storage_path: path,
        caption: photo.caption ?? null,
        taken_at: photo.takenAt ?? null,
        created_at: photo.createdAt,
      }, { onConflict: 'id' });
      throwIfError(rowError);
      migratedPhotos += 1;
    } catch {
      failedPhotos.push(photo.id);
      // Keep migrating the remaining data; the local backup is retained so a
      // failed legacy photo can be recovered manually.
    }
  }

  if (failedPhotos.length) {
    throw new Error(
      `הנתונים הועברו, אך ${failedPhotos.length} תמונות לא הועלו. ניתן לנסות שוב בלי לאבד את המקור.`,
    );
  }
  localStorage.setItem(LEGACY_MIGRATION_KEY, nowIso());
  return {
    clients: backup.clients.length,
    reports: backup.reports.length,
    defects: backup.defects.length,
    photos: migratedPhotos,
  };
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
