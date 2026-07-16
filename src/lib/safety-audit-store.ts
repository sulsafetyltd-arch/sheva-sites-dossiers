import { supabase } from '@/integrations/supabase/client';
import type {
  SafetyAuditReport,
  SafetyAuditDefect,
  SafetyAuditDefectPhoto,
  ChecklistStatus,
} from '@/types/safety-audit';

function toReport(row: any): SafetyAuditReport {
  return {
    id: row.id,
    reportNumber: row.report_number ?? undefined,
    date: row.date,
    recipient: row.recipient ?? undefined,
    riskLevel: row.risk_level ?? undefined,
    immediateAction: row.immediate_action ?? undefined,
    executiveSummary: row.executive_summary ?? undefined,
    siteName: row.site_name ?? undefined,
    contractor: row.contractor ?? undefined,
    auditDate: row.audit_date ?? undefined,
    auditor: row.auditor ?? undefined,
    attendees: row.attendees ?? undefined,
    siteManager: row.site_manager ?? undefined,
    workHours: row.work_hours ?? undefined,
    workersCount: row.workers_count ?? undefined,
    workStage: row.work_stage ?? undefined,
    status: row.status,
    siteManagerSignatureUrl: row.site_manager_signature_url ?? undefined,
    auditorSignatureUrl: row.auditor_signature_url ?? undefined,
    checklist: row.checklist ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listReports(): Promise<SafetyAuditReport[]> {
  const { data, error } = await supabase
    .from('safety_audit_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toReport);
}

export async function getReport(id: string): Promise<SafetyAuditReport | null> {
  const { data, error } = await supabase
    .from('safety_audit_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toReport(data) : null;
}

export async function createReport(
  partial: Partial<SafetyAuditReport> & { siteName?: string }
): Promise<SafetyAuditReport> {
  const insert = {
    report_number: partial.reportNumber ?? null,
    date: partial.date ?? new Date().toISOString().slice(0, 10),
    recipient: partial.recipient ?? null,
    risk_level: partial.riskLevel ?? null,
    immediate_action: partial.immediateAction ?? false,
    executive_summary: partial.executiveSummary ?? null,
    site_name: partial.siteName ?? null,
    contractor: partial.contractor ?? null,
    audit_date: partial.auditDate ?? null,
    auditor: partial.auditor ?? null,
    attendees: partial.attendees ?? null,
    site_manager: partial.siteManager ?? null,
    work_hours: partial.workHours ?? null,
    workers_count: partial.workersCount ?? null,
    work_stage: partial.workStage ?? null,
    status: partial.status ?? 'draft',
    site_manager_signature_url: partial.siteManagerSignatureUrl ?? null,
    auditor_signature_url: partial.auditorSignatureUrl ?? null,
    checklist: partial.checklist ?? {},
  };
  const { data, error } = await supabase
    .from('safety_audit_reports')
    .insert(insert)
    .select('*')
    .single();
  if (error) throw error;
  return toReport(data);
}

export async function updateReport(
  id: string,
  partial: Partial<SafetyAuditReport>
): Promise<SafetyAuditReport> {
  const update: any = {};
  if ('reportNumber' in partial) update.report_number = partial.reportNumber ?? null;
  if ('date' in partial) update.date = partial.date ?? null;
  if ('recipient' in partial) update.recipient = partial.recipient ?? null;
  if ('riskLevel' in partial) update.risk_level = partial.riskLevel ?? null;
  if ('immediateAction' in partial) update.immediate_action = partial.immediateAction ?? null;
  if ('executiveSummary' in partial) update.executive_summary = partial.executiveSummary ?? null;
  if ('siteName' in partial) update.site_name = partial.siteName ?? null;
  if ('contractor' in partial) update.contractor = partial.contractor ?? null;
  if ('auditDate' in partial) update.audit_date = partial.auditDate ?? null;
  if ('auditor' in partial) update.auditor = partial.auditor ?? null;
  if ('attendees' in partial) update.attendees = partial.attendees ?? null;
  if ('siteManager' in partial) update.site_manager = partial.siteManager ?? null;
  if ('workHours' in partial) update.work_hours = partial.workHours ?? null;
  if ('workersCount' in partial) update.workers_count = partial.workersCount ?? null;
  if ('workStage' in partial) update.work_stage = partial.workStage ?? null;
  if ('status' in partial) update.status = partial.status ?? null;
  if ('siteManagerSignatureUrl' in partial) update.site_manager_signature_url = partial.siteManagerSignatureUrl ?? null;
  if ('auditorSignatureUrl' in partial) update.auditor_signature_url = partial.auditorSignatureUrl ?? null;
  if ('checklist' in partial) update.checklist = partial.checklist ?? {};

  const { data, error } = await supabase
    .from('safety_audit_reports')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toReport(data);
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from('safety_audit_reports').delete().eq('id', id);
  if (error) throw error;
}

function toDefect(row: any): SafetyAuditDefect {
  return {
    id: row.id,
    reportId: row.report_id,
    checklistTopicKey: row.checklist_topic_key ?? undefined,
    description: row.description,
    severity: row.severity,
    correctiveAction: row.corrective_action ?? undefined,
    responsible: row.responsible ?? undefined,
    dueDate: row.due_date ?? undefined,
    sortOrder: row.sort_order ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listDefects(reportId: string): Promise<SafetyAuditDefect[]> {
  const { data, error } = await supabase
    .from('safety_audit_defects')
    .select('*')
    .eq('report_id', reportId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toDefect);
}

export async function createDefect(
  reportId: string,
  payload: Omit<SafetyAuditDefect, 'id' | 'reportId' | 'createdAt'>
): Promise<SafetyAuditDefect> {
  const insert = {
    report_id: reportId,
    checklist_topic_key: payload.checklistTopicKey ?? null,
    description: payload.description,
    severity: payload.severity,
    corrective_action: payload.correctiveAction ?? null,
    responsible: payload.responsible ?? null,
    due_date: payload.dueDate ?? null,
    sort_order: payload.sortOrder ?? 0,
  };
  const { data, error } = await supabase
    .from('safety_audit_defects')
    .insert(insert)
    .select('*')
    .single();
  if (error) throw error;
  return toDefect(data);
}

export async function updateDefect(
  id: string,
  partial: Partial<SafetyAuditDefect>
): Promise<SafetyAuditDefect> {
  const update: any = {};
  if ('checklistTopicKey' in partial) update.checklist_topic_key = partial.checklistTopicKey ?? null;
  if ('description' in partial) update.description = partial.description ?? null;
  if ('severity' in partial) update.severity = partial.severity ?? null;
  if ('correctiveAction' in partial) update.corrective_action = partial.correctiveAction ?? null;
  if ('responsible' in partial) update.responsible = partial.responsible ?? null;
  if ('dueDate' in partial) update.due_date = partial.dueDate ?? null;
  if ('sortOrder' in partial) update.sort_order = partial.sortOrder ?? 0;

  const { data, error } = await supabase
    .from('safety_audit_defects')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toDefect(data);
}

export async function deleteDefect(id: string): Promise<void> {
  const { error } = await supabase.from('safety_audit_defects').delete().eq('id', id);
  if (error) throw error;
}

export async function addDefectPhoto(
  defectId: string,
  file: File,
  caption?: string,
  takenAt?: string
): Promise<SafetyAuditDefectPhoto> {
  // upload to storage
  const path = `defects/${defectId}/${Date.now()}_${file.name}`;
  const { error: upErr } = await supabase.storage.from('audit-files').upload(path, file, {
    upsert: false,
  });
  if (upErr) throw upErr;
  const insert = {
    defect_id: defectId,
    storage_path: path,
    caption: caption ?? null,
    taken_at: takenAt ?? null,
  };
  const { data, error } = await supabase
    .from('safety_audit_defect_photos')
    .insert(insert)
    .select('*')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    defectId,
    storagePath: data.storage_path,
    caption: data.caption ?? undefined,
    takenAt: data.taken_at ?? undefined,
    createdAt: data.created_at,
  };
}

export function getPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from('audit-files').getPublicUrl(storagePath);
  return data.publicUrl;
}

