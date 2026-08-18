import { createClient } from '@supabase/supabase-js';
import type { Deal } from '@/types/real-estate';
import { STORAGE_KEY } from '@/lib/real-estate-store';
import { getOfficeProfile, saveOfficeProfile, type OfficeProfile } from '@/lib/office-profile';

export interface CloudSettings {
  url: string;
  anonKey: string;
  autoSync: boolean;
  lastSyncAt?: string;
}

export const CLOUD_KEY = 'solo-nadlan-cloud-v1';

export const SETUP_SQL = `create table if not exists solo_deals (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists solo_kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table solo_deals enable row level security;
alter table solo_kv enable row level security;
create policy "anon all deals" on solo_deals for all using (true) with check (true);
create policy "anon all kv" on solo_kv for all using (true) with check (true);`;

export function getCloudSettings(): CloudSettings {
  try {
    const raw = localStorage.getItem(CLOUD_KEY);
    if (!raw) return { url: '', anonKey: '', autoSync: false };
    return { url: '', anonKey: '', autoSync: false, ...JSON.parse(raw) };
  } catch {
    return { url: '', anonKey: '', autoSync: false };
  }
}

export function saveCloudSettings(settings: CloudSettings): void {
  localStorage.setItem(CLOUD_KEY, JSON.stringify(settings));
}

export function isCloudConfigured(): boolean {
  const s = getCloudSettings();
  return Boolean(s.url.trim() && s.anonKey.trim());
}

function readLocalDeals(): Deal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  total: number;
}

/**
 * Two-way merge: newer `updatedAt` wins per deal.
 * Deletions are not propagated (a deleted local deal that exists remotely is restored).
 */
export async function syncNow(): Promise<SyncResult> {
  const settings = getCloudSettings();
  if (!settings.url.trim() || !settings.anonKey.trim()) {
    throw new Error('חסרים פרטי חיבור ל-Supabase');
  }
  const client = createClient(settings.url.trim(), settings.anonKey.trim());

  const { data: remoteRows, error: pullError } = await client
    .from('solo_deals')
    .select('id, data');
  if (pullError) throw new Error(`שגיאת קריאה מהענן: ${pullError.message}`);

  const local = readLocalDeals();
  const localById = new Map(local.map((d) => [d.id, d]));
  const remoteById = new Map<string, Deal>(
    (remoteRows ?? []).map((r) => [r.id as string, r.data as Deal]),
  );

  let pulled = 0;
  const toPush: Deal[] = [];

  for (const [id, remote] of remoteById) {
    const mine = localById.get(id);
    if (!mine || (remote.updatedAt ?? '') > (mine.updatedAt ?? '')) {
      localById.set(id, remote);
      pulled += 1;
    }
  }
  for (const [id, mine] of localById) {
    const remote = remoteById.get(id);
    if (!remote || (mine.updatedAt ?? '') > (remote.updatedAt ?? '')) {
      toPush.push(mine);
    }
  }

  if (toPush.length > 0) {
    const { error: pushError } = await client.from('solo_deals').upsert(
      toPush.map((d) => ({ id: d.id, data: d, updated_at: d.updatedAt })),
    );
    if (pushError) throw new Error(`שגיאת כתיבה לענן: ${pushError.message}`);
  }

  const merged = [...localById.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

  const office = getOfficeProfile();
  const hasOffice = Object.values(office).some((v) => typeof v === 'string' && v.trim());
  const { data: kvRow } = await client.from('solo_kv').select('value').eq('key', 'office').maybeSingle();
  if (kvRow?.value && !hasOffice) {
    saveOfficeProfile(kvRow.value as OfficeProfile);
  } else if (hasOffice) {
    await client.from('solo_kv').upsert({ key: 'office', value: office, updated_at: new Date().toISOString() });
  }

  saveCloudSettings({ ...settings, lastSyncAt: new Date().toISOString() });
  return { pushed: toPush.length, pulled, total: merged.length };
}
