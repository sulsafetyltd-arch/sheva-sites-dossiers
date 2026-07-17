import { supabase } from '@/integrations/supabase/client';
import type {
  SafetyTrainingParticipant,
  SafetyTrainingSession,
  TrainingCategory,
} from '@/types/safety-training';
import { TRAINING_CATEGORY_DETAILS } from '@/types/safety-training';

type Row = Record<string, unknown>;

function fail(error: { message?: string } | null): void {
  if (error) throw new Error(error.message || 'פעולת ההדרכה נכשלה');
}

const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

function mapSession(row: Row): SafetyTrainingSession {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    category: row.category as TrainingCategory,
    sessionNumber: text(row.session_number),
    status: row.status === 'final' ? 'final' : 'draft',
    trainingDate: String(row.training_date),
    location: text(row.location),
    topic: String(row.topic),
    durationHours: typeof row.duration_hours === 'number' ? row.duration_hours : undefined,
    language: text(row.language),
    notes: text(row.notes),
    instructorName: text(row.instructor_name),
    instructorRole: text(row.instructor_role),
    instructorPhone: text(row.instructor_phone),
    instructorLicenseNumber: text(row.instructor_license_number),
    instructorSignatureDataUrl: text(row.instructor_signature_data_url),
    instructorSignedAt: text(row.instructor_signed_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapParticipant(row: Row): SafetyTrainingParticipant {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    sortOrder: Number(row.sort_order) || 0,
    employeeName: String(row.employee_name),
    employeeIdNumber: text(row.employee_id_number),
    employer: text(row.employer),
    jobTitle: text(row.job_title),
    signatureStoragePath: text(row.signature_storage_path),
    signedAt: text(row.signed_at),
    remarks: text(row.remarks),
    createdAt: String(row.created_at),
  };
}

export async function listTrainingSessions(clientId: string): Promise<SafetyTrainingSession[]> {
  const { data, error } = await supabase
    .from('safety_training_sessions')
    .select('*')
    .eq('client_id', clientId)
    .order('training_date', { ascending: false });
  fail(error);
  return (data ?? []).map((row) => mapSession(row as Row));
}

export async function getTrainingSession(id: string): Promise<SafetyTrainingSession | null> {
  const { data, error } = await supabase
    .from('safety_training_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  fail(error);
  return data ? mapSession(data as Row) : null;
}

export async function createTrainingSession(
  clientId: string,
  category: TrainingCategory,
  location?: string,
): Promise<SafetyTrainingSession> {
  const { data: authData } = await supabase.auth.getUser();
  const { data: profile, error: profileError } = authData.user
    ? await supabase
        .from('profiles')
        .select('full_name,job_title,phone,signature_data_url')
        .eq('id', authData.user.id)
        .single()
    : { data: null, error: null };
  fail(profileError);
  if (!profile?.full_name) throw new Error('יש להשלים שם מלא בפרופיל לפני יצירת הדרכה');

  const { data: number, error: numberError } = await supabase.rpc(
    'allocate_safety_training_number',
    { p_category: category },
  );
  fail(numberError);

  const { data, error } = await supabase
    .from('safety_training_sessions')
    .insert({
      client_id: clientId,
      category,
      session_number: number,
      training_date: new Date().toISOString().slice(0, 10),
      location: location || null,
      topic: TRAINING_CATEGORY_DETAILS[category].defaultTopic,
      language: 'עברית',
      instructor_name: profile.full_name,
      instructor_role: profile.job_title,
      instructor_phone: profile.phone,
      instructor_signature_data_url: profile.signature_data_url,
      instructor_signed_at: profile.signature_data_url ? new Date().toISOString() : null,
      created_by: authData.user?.id,
    })
    .select('*')
    .single();
  fail(error);
  return mapSession(data as Row);
}

export async function updateTrainingSession(
  id: string,
  patch: Partial<SafetyTrainingSession>,
): Promise<SafetyTrainingSession> {
  const fields: Record<string, unknown> = {};
  const names: Record<string, string> = {
    status: 'status',
    trainingDate: 'training_date',
    location: 'location',
    topic: 'topic',
    durationHours: 'duration_hours',
    language: 'language',
    notes: 'notes',
    instructorName: 'instructor_name',
    instructorRole: 'instructor_role',
    instructorPhone: 'instructor_phone',
    instructorLicenseNumber: 'instructor_license_number',
    instructorSignatureDataUrl: 'instructor_signature_data_url',
    instructorSignedAt: 'instructor_signed_at',
  };
  for (const [key, column] of Object.entries(names)) {
    if (key in patch) fields[column] = patch[key as keyof SafetyTrainingSession] ?? null;
  }
  const { data, error } = await supabase
    .from('safety_training_sessions')
    .update(fields)
    .eq('id', id)
    .select('*')
    .single();
  fail(error);
  return mapSession(data as Row);
}

export async function deleteTrainingSession(id: string): Promise<void> {
  const { error } = await supabase.from('safety_training_sessions').delete().eq('id', id);
  fail(error);
}

export async function listTrainingParticipants(sessionId: string): Promise<SafetyTrainingParticipant[]> {
  const { data, error } = await supabase
    .from('safety_training_participants')
    .select('*')
    .eq('session_id', sessionId)
    .order('sort_order');
  fail(error);
  return (data ?? []).map((row) => mapParticipant(row as Row));
}

export async function createTrainingParticipant(
  sessionId: string,
  employeeName: string,
  sortOrder: number,
): Promise<SafetyTrainingParticipant> {
  const { data, error } = await supabase
    .from('safety_training_participants')
    .insert({ session_id: sessionId, employee_name: employeeName, sort_order: sortOrder })
    .select('*')
    .single();
  fail(error);
  return mapParticipant(data as Row);
}

export async function updateTrainingParticipant(
  id: string,
  patch: Partial<SafetyTrainingParticipant>,
): Promise<SafetyTrainingParticipant> {
  const fields: Record<string, unknown> = {};
  const names: Record<string, string> = {
    employeeName: 'employee_name',
    employeeIdNumber: 'employee_id_number',
    employer: 'employer',
    jobTitle: 'job_title',
    remarks: 'remarks',
    sortOrder: 'sort_order',
  };
  for (const [key, column] of Object.entries(names)) {
    if (key in patch) fields[column] = patch[key as keyof SafetyTrainingParticipant] ?? null;
  }
  const { data, error } = await supabase
    .from('safety_training_participants')
    .update(fields)
    .eq('id', id)
    .select('*')
    .single();
  fail(error);
  return mapParticipant(data as Row);
}

export async function saveParticipantSignature(
  session: SafetyTrainingSession,
  participant: SafetyTrainingParticipant,
  dataUrl: string | null,
): Promise<SafetyTrainingParticipant> {
  const path = `${session.clientId}/training/${session.id}/${participant.id}/signature.png`;
  if (dataUrl) {
    const blob = await (await fetch(dataUrl)).blob();
    const { error: uploadError } = await supabase.storage
      .from('audit-files')
      .upload(path, blob, { contentType: 'image/png', upsert: true });
    fail(uploadError);
  } else if (participant.signatureStoragePath) {
    const { error: removeError } = await supabase.storage
      .from('audit-files')
      .remove([participant.signatureStoragePath]);
    fail(removeError);
  }
  const { data, error } = await supabase
    .from('safety_training_participants')
    .update({
      signature_storage_path: dataUrl ? path : null,
      signed_at: dataUrl ? new Date().toISOString() : null,
    })
    .eq('id', participant.id)
    .select('*')
    .single();
  fail(error);
  return mapParticipant(data as Row);
}

export async function deleteTrainingParticipant(participant: SafetyTrainingParticipant): Promise<void> {
  if (participant.signatureStoragePath) {
    const { error: storageError } = await supabase.storage
      .from('audit-files')
      .remove([participant.signatureStoragePath]);
    fail(storageError);
  }
  const { error } = await supabase
    .from('safety_training_participants')
    .delete()
    .eq('id', participant.id);
  fail(error);
}

export async function getTrainingSignatureUrls(paths: string[]): Promise<Record<string, string>> {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  if (uniquePaths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from('audit-files')
    .createSignedUrls(uniquePaths, 60 * 60);
  fail(error);
  return Object.fromEntries(
    (data ?? [])
      .filter((item) => item.signedUrl)
      .map((item) => [item.path, item.signedUrl]),
  );
}
