-- Secure multi-user access for the Safety Audit PWA.
-- The earliest registered account is the administrator. Later accounts are
-- inactive members until the administrator activates and assigns them.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bootstrap accounts that existed before this migration. Only the oldest one
-- becomes admin.
with ranked_users as (
  select id, coalesce(email, ''), raw_user_meta_data, created_at,
         row_number() over (order by created_at, id) as position
  from auth.users
)
insert into public.profiles (id, email, full_name, role, is_active, created_at)
select
  id,
  coalesce,
  raw_user_meta_data ->> 'full_name',
  case when position = 1 then 'admin' else 'member' end,
  position = 1,
  created_at
from ranked_users
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_account boolean;
begin
  perform pg_advisory_xact_lock(739210);
  select not exists(select 1 from public.profiles) into first_account;

  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    case when first_account then 'admin' else 'member' end,
    first_account
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.safety_audit_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_members (
  client_id uuid not null references public.safety_audit_clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, user_id)
);

-- Base audit tables are included here so this file can be run by itself in a
-- fresh Supabase project's SQL editor.
create table if not exists public.safety_audit_reports (
  id uuid primary key default gen_random_uuid(),
  report_number text unique,
  date date not null default now(),
  recipient text,
  risk_level text check (risk_level in ('low', 'medium', 'high')),
  immediate_action boolean default false,
  executive_summary text,
  site_name text,
  contractor text,
  audit_date date,
  auditor text,
  attendees text,
  site_manager text,
  work_hours text,
  workers_count int,
  work_stage text,
  status text not null default 'draft' check (status in ('draft', 'final')),
  site_manager_signature_url text,
  auditor_signature_url text,
  checklist jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.safety_audit_defects (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.safety_audit_reports(id) on delete cascade,
  checklist_topic_key text,
  description text not null,
  severity text not null check (severity in ('high', 'medium', 'low')),
  corrective_action text,
  responsible text,
  due_date date,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.safety_audit_defect_photos (
  id uuid primary key default gen_random_uuid(),
  defect_id uuid not null references public.safety_audit_defects(id) on delete cascade,
  storage_path text not null,
  caption text,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_safety_audit_defects_report_id
  on public.safety_audit_defects(report_id);
create index if not exists idx_safety_audit_defect_photos_defect_id
  on public.safety_audit_defect_photos(defect_id);

-- Bring the original report schema in line with the current TypeScript model.
alter table public.safety_audit_reports
  add column if not exists client_id uuid references public.safety_audit_clients(id) on delete cascade,
  add column if not exists report_type text not null default 'workplace'
    check (report_type in ('workplace', 'construction')),
  add column if not exists project_name text,
  add column if not exists block text,
  add column if not exists parcel text,
  add column if not exists auditor_role text,
  add column if not exists work_stages_detail text,
  add column if not exists site_manager_signed_at timestamptz,
  add column if not exists auditor_signed_at timestamptz,
  add column if not exists created_by uuid references auth.users(id);

create index if not exists idx_safety_audit_reports_client_id
  on public.safety_audit_reports(client_id);
create index if not exists idx_client_members_user_id
  on public.client_members(user_id);

create or replace function public.is_safety_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

create or replace function public.can_access_safety_client(requested_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_safety_admin() or exists (
    select 1
    from public.client_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.client_id = requested_client_id
      and cm.user_id = auth.uid()
      and p.is_active
  );
$$;

alter table public.profiles enable row level security;
alter table public.safety_audit_clients enable row level security;
alter table public.client_members enable row level security;
alter table public.safety_audit_reports enable row level security;
alter table public.safety_audit_defects enable row level security;
alter table public.safety_audit_defect_photos enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_safety_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.is_safety_admin())
  with check (public.is_safety_admin());

drop policy if exists clients_read on public.safety_audit_clients;
create policy clients_read on public.safety_audit_clients
  for select to authenticated
  using (public.can_access_safety_client(id));

drop policy if exists clients_admin_insert on public.safety_audit_clients;
create policy clients_admin_insert on public.safety_audit_clients
  for insert to authenticated
  with check (public.is_safety_admin());

drop policy if exists clients_admin_update on public.safety_audit_clients;
create policy clients_admin_update on public.safety_audit_clients
  for update to authenticated
  using (public.is_safety_admin())
  with check (public.is_safety_admin());

drop policy if exists clients_admin_delete on public.safety_audit_clients;
create policy clients_admin_delete on public.safety_audit_clients
  for delete to authenticated
  using (public.is_safety_admin());

drop policy if exists client_members_read on public.client_members;
create policy client_members_read on public.client_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_safety_admin());

drop policy if exists client_members_admin_insert on public.client_members;
create policy client_members_admin_insert on public.client_members
  for insert to authenticated
  with check (public.is_safety_admin());

drop policy if exists client_members_admin_delete on public.client_members;
create policy client_members_admin_delete on public.client_members
  for delete to authenticated
  using (public.is_safety_admin());

drop policy if exists safety_audit_reports_open on public.safety_audit_reports;
drop policy if exists reports_access_select on public.safety_audit_reports;
create policy reports_access_select on public.safety_audit_reports
  for select to authenticated
  using (public.can_access_safety_client(client_id));

drop policy if exists reports_access_insert on public.safety_audit_reports;
create policy reports_access_insert on public.safety_audit_reports
  for insert to authenticated
  with check (public.can_access_safety_client(client_id));

drop policy if exists reports_access_update on public.safety_audit_reports;
create policy reports_access_update on public.safety_audit_reports
  for update to authenticated
  using (public.can_access_safety_client(client_id))
  with check (public.can_access_safety_client(client_id));

drop policy if exists reports_access_delete on public.safety_audit_reports;
create policy reports_access_delete on public.safety_audit_reports
  for delete to authenticated
  using (public.can_access_safety_client(client_id));

drop policy if exists safety_audit_defects_open on public.safety_audit_defects;
drop policy if exists defects_access_all on public.safety_audit_defects;
create policy defects_access_all on public.safety_audit_defects
  for all to authenticated
  using (
    exists (
      select 1 from public.safety_audit_reports r
      where r.id = report_id and public.can_access_safety_client(r.client_id)
    )
  )
  with check (
    exists (
      select 1 from public.safety_audit_reports r
      where r.id = report_id and public.can_access_safety_client(r.client_id)
    )
  );

drop policy if exists safety_audit_defect_photos_open on public.safety_audit_defect_photos;
drop policy if exists photos_access_all on public.safety_audit_defect_photos;
create policy photos_access_all on public.safety_audit_defect_photos
  for all to authenticated
  using (
    exists (
      select 1
      from public.safety_audit_defects d
      join public.safety_audit_reports r on r.id = d.report_id
      where d.id = defect_id and public.can_access_safety_client(r.client_id)
    )
  )
  with check (
    exists (
      select 1
      from public.safety_audit_defects d
      join public.safety_audit_reports r on r.id = d.report_id
      where d.id = defect_id and public.can_access_safety_client(r.client_id)
    )
  );

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.safety_audit_clients to authenticated;
grant select, insert, update, delete on public.client_members to authenticated;
grant select, insert, update, delete on public.safety_audit_reports to authenticated;
grant select, insert, update, delete on public.safety_audit_defects to authenticated;
grant select, insert, update, delete on public.safety_audit_defect_photos to authenticated;

-- Private photo storage. The first path segment is always the client UUID.
insert into storage.buckets (id, name, public)
values ('audit-files', 'audit-files', false)
on conflict (id) do update set public = false;

drop policy if exists "Public Access Audit Files" on storage.objects;
drop policy if exists "Upload Audit Files" on storage.objects;
drop policy if exists "Delete Audit Files" on storage.objects;
drop policy if exists audit_files_read on storage.objects;
create policy audit_files_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'audit-files'
    and exists (
      select 1 from public.safety_audit_clients c
      where c.id::text = (storage.foldername(name))[1]
        and public.can_access_safety_client(c.id)
    )
  );

drop policy if exists audit_files_insert on storage.objects;
create policy audit_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'audit-files'
    and exists (
      select 1 from public.safety_audit_clients c
      where c.id::text = (storage.foldername(name))[1]
        and public.can_access_safety_client(c.id)
    )
  );

drop policy if exists audit_files_delete on storage.objects;
create policy audit_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'audit-files'
    and exists (
      select 1 from public.safety_audit_clients c
      where c.id::text = (storage.foldername(name))[1]
        and public.can_access_safety_client(c.id)
    )
  );
