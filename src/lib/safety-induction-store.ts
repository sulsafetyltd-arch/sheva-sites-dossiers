import { supabase } from '@/integrations/supabase/client';
import { CONSTRUCTION_INDUCTION_DOCUMENTS } from '@/lib/construction-induction-documents';
import type { ConstructionInductionLanguage } from '@/types/safety-training';
import type { SafetyClientEmployee } from '@/types/safety-employee';
import type {
  InductionDeclarationInput,
  PublicInductionAssignment,
  SafetyInductionAssignment,
} from '@/types/safety-induction';
import { listClientSites } from '@/lib/safety-trade-risk-store';

type Row = Record<string, unknown>;

function fail(error: { message?: string } | null): void {
  if (error) throw new Error(error.message || 'פעולת הוראות הבטיחות נכשלה');
}

function mapAssignment(row: Row): SafetyInductionAssignment {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    siteId: String(row.site_id),
    employeeId: String(row.employee_id),
    languageCode: String(row.language_code) as ConstructionInductionLanguage,
    accessToken: String(row.access_token),
    status: row.status as SafetyInductionAssignment['status'],
    signerName: typeof row.signer_name === 'string' ? row.signer_name : undefined,
    signerIdNumber: typeof row.signer_id_number === 'string' ? row.signer_id_number : undefined,
    jobTitle: typeof row.job_title === 'string' ? row.job_title : undefined,
    declarationDate: typeof row.declaration_date === 'string' ? row.declaration_date : undefined,
    companyName: typeof row.company_name === 'string' ? row.company_name : undefined,
    instructorName: typeof row.instructor_name === 'string' ? row.instructor_name : undefined,
    siteManagerName: typeof row.site_manager_name === 'string' ? row.site_manager_name : undefined,
    heightTrainingValidUntil:
      typeof row.height_training_valid_until === 'string' ? row.height_training_valid_until : undefined,
    signatureDataUrl: typeof row.signature_data_url === 'string' ? row.signature_data_url : undefined,
    acknowledgedAt: typeof row.acknowledged_at === 'string' ? row.acknowledged_at : undefined,
    createdAt: String(row.created_at),
    siteName: typeof row.site_name === 'string' ? row.site_name : undefined,
    employeeName: typeof row.employee_name === 'string' ? row.employee_name : undefined,
  };
}

export async function listInductionAssignments(clientId: string): Promise<SafetyInductionAssignment[]> {
  const [{ data, error }, sites, employeesResult] = await Promise.all([
    supabase
      .from('safety_induction_assignments')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    listClientSites(clientId),
    supabase
      .from('safety_client_employees')
      .select('id, full_name')
      .eq('client_id', clientId),
  ]);
  fail(error);
  fail(employeesResult.error);
  const siteNames = new Map(sites.map((site) => [site.id, site.name]));
  const employeeNames = new Map(
    (employeesResult.data ?? []).map((row) => [String(row.id), String(row.full_name)]),
  );
  return (data ?? []).map((row) => {
    const raw = row as Row;
    return mapAssignment({
      ...raw,
      site_name: siteNames.get(String(raw.site_id)),
      employee_name: employeeNames.get(String(raw.employee_id)),
    });
  });
}

export async function createInductionAssignment(input: {
  employee: SafetyClientEmployee;
  siteId: string;
  languageCode: ConstructionInductionLanguage;
}): Promise<SafetyInductionAssignment> {
  if (!CONSTRUCTION_INDUCTION_DOCUMENTS.some((document) => document.code === input.languageCode)) {
    throw new Error('לא נמצא מסמך הוראות בטיחות בשפה שנבחרה');
  }
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('safety_induction_assignments')
    .insert({
      client_id: input.employee.clientId,
      site_id: input.siteId,
      employee_id: input.employee.id,
      language_code: input.languageCode,
      created_by: authData.user?.id,
    })
    .select('*')
    .single();
  fail(error);
  return mapAssignment(data as Row);
}

export function inductionShareUrl(accessToken: string): string {
  const url = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  url.searchParams.set('ci', accessToken);
  return url.toString();
}

export function inductionShareMessage(options: {
  employeeName: string;
  siteName: string;
  languageLabel: string;
  url: string;
}): string {
  return [
    `שלום ${options.employeeName},`,
    `נא לקרוא ולחתום על הוראות הבטיחות לעובד חדש באתר ${options.siteName} (${options.languageLabel}).`,
    '',
    'לחצו על הקישור:',
    `\u200E${options.url}`,
  ].join('\n');
}

export async function getPublicInductionAssignment(token: string): Promise<PublicInductionAssignment> {
  const { data, error } = await supabase.rpc('get_safety_induction_assignment', { p_token: token });
  fail(error);
  const row = data as Row;
  const languageCode = String(row.language_code) as ConstructionInductionLanguage;
  const document = CONSTRUCTION_INDUCTION_DOCUMENTS.find((item) => item.code === languageCode);
  return {
    id: String(row.id),
    status: row.status as PublicInductionAssignment['status'],
    languageCode,
    languageLabel: document ? `${document.label} — ${document.nativeLabel}` : languageCode,
    employeeName: String(row.employee_name),
    employeeIdNumber: typeof row.employee_id_number === 'string' ? row.employee_id_number : undefined,
    employeeJobTitle: typeof row.employee_job_title === 'string' ? row.employee_job_title : undefined,
    clientName: String(row.client_name),
    siteName: String(row.site_name),
    siteAddress: typeof row.site_address === 'string' ? row.site_address : undefined,
    signerName: typeof row.signer_name === 'string' ? row.signer_name : undefined,
    signerIdNumber: typeof row.signer_id_number === 'string' ? row.signer_id_number : undefined,
    jobTitle: typeof row.job_title === 'string' ? row.job_title : undefined,
    declarationDate: typeof row.declaration_date === 'string' ? row.declaration_date : undefined,
    companyName: typeof row.company_name === 'string' ? row.company_name : undefined,
    instructorName: typeof row.instructor_name === 'string' ? row.instructor_name : undefined,
    siteManagerName: typeof row.site_manager_name === 'string' ? row.site_manager_name : undefined,
    heightTrainingValidUntil:
      typeof row.height_training_valid_until === 'string' ? row.height_training_valid_until : undefined,
    signatureDataUrl: typeof row.signature_data_url === 'string' ? row.signature_data_url : undefined,
    acknowledgedAt: typeof row.acknowledged_at === 'string' ? row.acknowledged_at : undefined,
  };
}

export async function completePublicInduction(
  token: string,
  declaration: InductionDeclarationInput,
): Promise<Partial<PublicInductionAssignment> & { status: string }> {
  const { data, error } = await supabase.rpc('complete_safety_induction', {
    p_token: token,
    p_signer_name: declaration.signerName,
    p_signature_data_url: declaration.signatureDataUrl,
    p_signer_id_number: declaration.signerIdNumber,
    p_job_title: declaration.jobTitle,
    p_declaration_date: declaration.declarationDate,
    p_company_name: declaration.companyName,
    p_instructor_name: declaration.instructorName,
    p_site_manager_name: declaration.siteManagerName,
    p_height_training_valid_until: declaration.heightTrainingValidUntil || null,
  });
  fail(error);
  const row = data as Row;
  return {
    status: String(row.status),
    acknowledgedAt: typeof row.acknowledged_at === 'string' ? row.acknowledged_at : undefined,
    signerName: typeof row.signer_name === 'string' ? row.signer_name : undefined,
    signerIdNumber: typeof row.signer_id_number === 'string' ? row.signer_id_number : undefined,
    jobTitle: typeof row.job_title === 'string' ? row.job_title : undefined,
    declarationDate: typeof row.declaration_date === 'string' ? row.declaration_date : undefined,
    companyName: typeof row.company_name === 'string' ? row.company_name : undefined,
    instructorName: typeof row.instructor_name === 'string' ? row.instructor_name : undefined,
    siteManagerName: typeof row.site_manager_name === 'string' ? row.site_manager_name : undefined,
    heightTrainingValidUntil:
      typeof row.height_training_valid_until === 'string' ? row.height_training_valid_until : undefined,
    certificateNumber: typeof row.certificate_number === 'string' ? row.certificate_number : undefined,
  };
}
