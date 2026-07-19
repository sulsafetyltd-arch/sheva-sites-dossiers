import { supabase } from '@/integrations/supabase/client';
import type {
  EmployeeTrainingType,
  SafetyClientEmployee,
  SafetyEmployeeTrainingRecord,
} from '@/types/safety-employee';
import { defaultTrainingExpiry } from '@/types/safety-employee';
import type { SafetyTrainingParticipant, SafetyTrainingSession } from '@/types/safety-training';

type Row = Record<string, unknown>;

function fail(error: { message?: string } | null): void {
  if (error) throw new Error(error.message || 'פעולת העובדים נכשלה');
}

const optionalText = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value : undefined;

function mapEmployee(row: Row): SafetyClientEmployee {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    fullName: String(row.full_name),
    idNumber: optionalText(row.id_number),
    jobTitle: optionalText(row.job_title),
    phone: optionalText(row.phone),
    email: optionalText(row.email),
    active: row.active !== false,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRecord(row: Row): SafetyEmployeeTrainingRecord {
  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    trainingType: row.training_type as EmployeeTrainingType,
    completedAt: String(row.completed_at),
    expiresAt: optionalText(row.expires_at),
    certificateNumber: optionalText(row.certificate_number),
    notes: optionalText(row.notes),
    createdAt: String(row.created_at),
  };
}

export async function listClientEmployees(clientId: string): Promise<SafetyClientEmployee[]> {
  const { data, error } = await supabase
    .from('safety_client_employees')
    .select('*')
    .eq('client_id', clientId)
    .order('active', { ascending: false })
    .order('full_name');
  fail(error);
  return (data ?? []).map((row) => mapEmployee(row as Row));
}

export async function createClientEmployee(
  clientId: string,
  employee: Pick<SafetyClientEmployee, 'fullName'> & Partial<SafetyClientEmployee>,
): Promise<SafetyClientEmployee> {
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('safety_client_employees')
    .insert({
      client_id: clientId,
      full_name: employee.fullName.trim(),
      id_number: employee.idNumber?.trim() || null,
      job_title: employee.jobTitle?.trim() || null,
      phone: employee.phone?.trim() || null,
      email: employee.email?.trim() || null,
      created_by: authData.user?.id,
    })
    .select('*')
    .single();
  fail(error);
  return mapEmployee(data as Row);
}

export async function importClientEmployees(
  clientId: string,
  employees: Array<Pick<SafetyClientEmployee, 'fullName'> & Partial<SafetyClientEmployee>>,
): Promise<{ created: SafetyClientEmployee[]; failed: number }> {
  const created: SafetyClientEmployee[] = [];
  let failed = 0;
  for (const employee of employees) {
    try {
      created.push(await createClientEmployee(clientId, employee));
    } catch {
      failed += 1;
    }
  }
  return { created, failed };
}

export async function updateClientEmployee(
  id: string,
  patch: Partial<SafetyClientEmployee>,
): Promise<SafetyClientEmployee> {
  const fields: Record<string, unknown> = {};
  const columns: Record<string, string> = {
    fullName: 'full_name',
    idNumber: 'id_number',
    jobTitle: 'job_title',
    phone: 'phone',
    email: 'email',
    active: 'active',
  };
  for (const [key, column] of Object.entries(columns)) {
    if (key in patch) fields[column] = patch[key as keyof SafetyClientEmployee] ?? null;
  }
  const { data, error } = await supabase
    .from('safety_client_employees')
    .update(fields)
    .eq('id', id)
    .select('*')
    .single();
  fail(error);
  return mapEmployee(data as Row);
}

export async function deleteClientEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('safety_client_employees').delete().eq('id', id);
  fail(error);
}

export async function listEmployeeTrainingRecords(
  employeeIds: string[],
): Promise<SafetyEmployeeTrainingRecord[]> {
  if (employeeIds.length === 0) return [];
  const { data, error } = await supabase
    .from('safety_employee_training_records')
    .select('*')
    .in('employee_id', employeeIds)
    .order('completed_at', { ascending: false });
  fail(error);
  return (data ?? []).map((row) => mapRecord(row as Row));
}

export async function createEmployeeTrainingRecord(
  employeeId: string,
  input: {
    trainingType: EmployeeTrainingType;
    completedAt: string;
    expiresAt?: string;
    certificateNumber?: string;
    notes?: string;
  },
): Promise<SafetyEmployeeTrainingRecord> {
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('safety_employee_training_records')
    .insert({
      employee_id: employeeId,
      training_type: input.trainingType,
      completed_at: input.completedAt,
      expires_at: input.expiresAt || null,
      certificate_number: input.certificateNumber?.trim() || null,
      notes: input.notes?.trim() || null,
      created_by: authData.user?.id,
    })
    .select('*')
    .single();
  fail(error);
  return mapRecord(data as Row);
}

export async function deleteEmployeeTrainingRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from('safety_employee_training_records')
    .delete()
    .eq('id', id);
  fail(error);
}

export async function syncTrainingSessionToEmployeeRegistry(
  session: SafetyTrainingSession,
  participants: SafetyTrainingParticipant[],
): Promise<void> {
  const trainingType: EmployeeTrainingType | null =
    session.category === 'work_at_height'
      ? 'work_at_height'
      : session.category === 'general'
        ? session.formDetails?.generalTrainingRecordType ?? 'annual_safety'
        : null;
  if (!trainingType) return;

  for (const participant of participants) {
    let query = supabase
      .from('safety_client_employees')
      .select('*')
      .eq('client_id', session.clientId);
    query = participant.employeeIdNumber
      ? query.eq('id_number', participant.employeeIdNumber)
      : query.eq('full_name', participant.employeeName);
    const { data: existing, error: employeeError } = await query.limit(1).maybeSingle();
    fail(employeeError);
    const employee = existing
      ? mapEmployee(existing as Row)
      : await createClientEmployee(session.clientId, {
          fullName: participant.employeeName,
          idNumber: participant.employeeIdNumber,
          jobTitle: participant.jobTitle,
        });

    const { data: existingRecord, error: recordError } = await supabase
      .from('safety_employee_training_records')
      .select('id')
      .eq('employee_id', employee.id)
      .eq('training_type', trainingType)
      .eq('completed_at', session.trainingDate)
      .limit(1)
      .maybeSingle();
    fail(recordError);
    if (existingRecord) continue;

    await createEmployeeTrainingRecord(employee.id, {
      trainingType,
      completedAt: session.trainingDate,
      expiresAt:
        trainingType === 'work_at_height'
          ? session.formDetails?.validUntil
          : defaultTrainingExpiry(trainingType, session.trainingDate),
      certificateNumber: session.sessionNumber,
      notes: `נוצר אוטומטית מטופס הדרכה ${session.sessionNumber || ''}`.trim(),
    });
  }
}
