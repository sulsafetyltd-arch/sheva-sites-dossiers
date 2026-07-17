import { supabase } from '@/integrations/supabase/client';
import type { SafetyProfile, SafetyRole } from '@/contexts/SafetyAuthContext';

function mapProfile(row: Record<string, unknown>): SafetyProfile {
  return {
    id: String(row.id),
    email: String(row.email ?? ''),
    fullName: row.full_name ? String(row.full_name) : undefined,
    jobTitle: row.job_title ? String(row.job_title) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    signatureDataUrl: row.signature_data_url ? String(row.signature_data_url) : undefined,
    stampDataUrl: row.stamp_data_url ? String(row.stamp_data_url) : undefined,
    role: row.role === 'admin' ? 'admin' : 'member',
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
  };
}

export async function listSafetyProfiles(): Promise<SafetyProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapProfile);
}

export async function updateSafetyProfile(
  id: string,
  patch: { isActive?: boolean; role?: SafetyRole },
): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.isActive !== undefined) payload.is_active = patch.isActive;
  if (patch.role !== undefined) payload.role = patch.role;
  const { error } = await supabase.from('profiles').update(payload).eq('id', id);
  if (error) throw error;
}

export async function listClientMemberAssignments(): Promise<Record<string, string[]>> {
  const { data, error } = await supabase.from('client_members').select('client_id,user_id');
  if (error) throw error;
  const result: Record<string, string[]> = {};
  for (const row of data ?? []) {
    (result[String(row.user_id)] ??= []).push(String(row.client_id));
  }
  return result;
}

export async function setClientMemberAccess(
  userId: string,
  clientId: string,
  allowed: boolean,
): Promise<void> {
  if (allowed) {
    const { error } = await supabase
      .from('client_members')
      .upsert({ user_id: userId, client_id: clientId }, { onConflict: 'client_id,user_id' });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('client_members')
      .delete()
      .eq('user_id', userId)
      .eq('client_id', clientId);
    if (error) throw error;
  }
}
