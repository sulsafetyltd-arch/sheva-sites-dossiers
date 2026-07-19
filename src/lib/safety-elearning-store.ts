import { supabase } from '@/integrations/supabase/client';
import type { SafetyClientEmployee } from '@/types/safety-employee';
import type { SafetyElearningAssignment } from '@/types/safety-elearning';

type Row = Record<string, unknown>;

function fail(error: { message?: string } | null): void {
  if (error) throw new Error(error.message || 'פעולת הלומדה נכשלה');
}

function mapAssignment(row: Row): SafetyElearningAssignment {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    employeeId: String(row.employee_id),
    accessToken: String(row.access_token),
    status: row.status as SafetyElearningAssignment['status'],
    score: typeof row.score === 'number' ? row.score : undefined,
    completedAt: typeof row.completed_at === 'string' ? row.completed_at : undefined,
    certificateNumber: typeof row.certificate_number === 'string' ? row.certificate_number : undefined,
    createdAt: String(row.created_at),
  };
}

export async function listElearningAssignments(clientId: string): Promise<SafetyElearningAssignment[]> {
  const { data, error } = await supabase
    .from('safety_elearning_assignments')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  fail(error);
  return (data ?? []).map((row) => mapAssignment(row as Row));
}

export async function createElearningAssignment(
  employee: SafetyClientEmployee,
): Promise<SafetyElearningAssignment> {
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('safety_elearning_assignments')
    .insert({
      client_id: employee.clientId,
      employee_id: employee.id,
      created_by: authData.user?.id,
    })
    .select('*')
    .single();
  fail(error);
  return mapAssignment(data as Row);
}

export async function deleteElearningAssignment(id: string): Promise<void> {
  const { error } = await supabase.from('safety_elearning_assignments').delete().eq('id', id);
  fail(error);
}

export interface PublicElearningAssignment {
  id: string;
  status: 'assigned' | 'in_progress' | 'completed';
  score?: number;
  completedAt?: string;
  certificateNumber?: string;
  learnerSignatureDataUrl?: string;
  employeeName: string;
  employeeIdNumber?: string;
  clientName: string;
}

export async function getPublicElearningAssignment(
  token: string,
): Promise<PublicElearningAssignment> {
  const { data, error } = await supabase.rpc('get_safety_elearning_assignment', { p_token: token });
  fail(error);
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    status: row.status as PublicElearningAssignment['status'],
    score: typeof row.score === 'number' ? row.score : undefined,
    completedAt: typeof row.completed_at === 'string' ? row.completed_at : undefined,
    certificateNumber: typeof row.certificate_number === 'string' ? row.certificate_number : undefined,
    learnerSignatureDataUrl: typeof row.learner_signature_data_url === 'string' ? row.learner_signature_data_url : undefined,
    employeeName: String(row.employee_name),
    employeeIdNumber: typeof row.employee_id_number === 'string' ? row.employee_id_number : undefined,
    clientName: String(row.client_name),
  };
}

export async function completePublicElearning(
  token: string,
  answers: Record<string, string>,
  signatureDataUrl: string,
): Promise<{ score: number; passed: boolean; certificateNumber?: string }> {
  const { data, error } = await supabase.rpc('complete_safety_elearning', {
    p_token: token,
    p_answers: answers,
    p_signature_data_url: signatureDataUrl,
  });
  fail(error);
  const row = data as Record<string, unknown>;
  return {
    score: Number(row.score),
    passed: row.passed !== false,
    certificateNumber: typeof row.certificate_number === 'string' ? row.certificate_number : undefined,
  };
}
