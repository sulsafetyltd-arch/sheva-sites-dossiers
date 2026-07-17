-- Client-scoped safety training sessions and signed attendance registers.

create table if not exists public.safety_training_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.safety_audit_clients(id) on delete cascade,
  category text not null check (category in ('general', 'fire', 'work_at_height')),
  session_number text unique,
  status text not null default 'draft' check (status in ('draft', 'final')),
  training_date date not null default current_date,
  location text,
  topic text not null,
  duration_hours numeric(4,1) check (duration_hours is null or duration_hours > 0),
  language text default 'עברית',
  notes text,
  instructor_name text,
  instructor_role text,
  instructor_phone text,
  instructor_license_number text,
  instructor_signature_data_url text
    check (instructor_signature_data_url is null or length(instructor_signature_data_url) <= 700000),
  instructor_signed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.safety_training_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.safety_training_sessions(id) on delete cascade,
  sort_order integer not null default 0,
  employee_name text not null check (length(trim(employee_name)) > 0),
  employee_id_number text,
  employer text,
  job_title text,
  signature_storage_path text,
  signed_at timestamptz,
  remarks text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_training_participants_session_identity
  on public.safety_training_participants(session_id, employee_id_number)
  where employee_id_number is not null and employee_id_number <> '';
create index if not exists idx_training_sessions_client_date
  on public.safety_training_sessions(client_id, training_date desc);
create index if not exists idx_training_participants_session
  on public.safety_training_participants(session_id, sort_order);

create table if not exists public.safety_training_counters (
  training_year integer not null,
  category text not null check (category in ('general', 'fire', 'work_at_height')),
  last_number integer not null default 0,
  primary key (training_year, category)
);

alter table public.safety_training_sessions enable row level security;
alter table public.safety_training_participants enable row level security;
alter table public.safety_training_counters enable row level security;
revoke all on public.safety_training_counters from anon, authenticated;

create or replace function public.can_access_safety_training_session(requested_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.safety_training_sessions s
    where s.id = requested_session_id
      and public.can_access_safety_client(s.client_id)
  );
$$;

revoke all on function public.can_access_safety_training_session(uuid) from public, anon;
grant execute on function public.can_access_safety_training_session(uuid) to authenticated;

drop policy if exists training_sessions_access_select on public.safety_training_sessions;
create policy training_sessions_access_select on public.safety_training_sessions
  for select to authenticated using (public.can_access_safety_client(client_id));
drop policy if exists training_sessions_access_insert on public.safety_training_sessions;
create policy training_sessions_access_insert on public.safety_training_sessions
  for insert to authenticated with check (public.can_access_safety_client(client_id));
drop policy if exists training_sessions_access_update on public.safety_training_sessions;
create policy training_sessions_access_update on public.safety_training_sessions
  for update to authenticated
  using (public.can_access_safety_client(client_id))
  with check (public.can_access_safety_client(client_id));
drop policy if exists training_sessions_admin_delete on public.safety_training_sessions;
create policy training_sessions_admin_delete on public.safety_training_sessions
  for delete to authenticated using (public.is_safety_admin());

drop policy if exists training_participants_access_select on public.safety_training_participants;
create policy training_participants_access_select on public.safety_training_participants
  for select to authenticated using (public.can_access_safety_training_session(session_id));
drop policy if exists training_participants_access_insert on public.safety_training_participants;
create policy training_participants_access_insert on public.safety_training_participants
  for insert to authenticated with check (public.can_access_safety_training_session(session_id));
drop policy if exists training_participants_access_update on public.safety_training_participants;
create policy training_participants_access_update on public.safety_training_participants
  for update to authenticated
  using (public.can_access_safety_training_session(session_id))
  with check (public.can_access_safety_training_session(session_id));
drop policy if exists training_participants_access_delete on public.safety_training_participants;
create policy training_participants_access_delete on public.safety_training_participants
  for delete to authenticated using (public.can_access_safety_training_session(session_id));

grant select, insert, update, delete on public.safety_training_sessions to authenticated;
grant select, insert, update, delete on public.safety_training_participants to authenticated;

-- Keep this migration self-contained for projects where the original audit
-- schema was installed manually without its shared timestamp trigger function.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_safety_training_sessions_updated_at on public.safety_training_sessions;
create trigger trg_safety_training_sessions_updated_at
before update on public.safety_training_sessions
for each row execute function public.set_updated_at();

create or replace function public.allocate_safety_training_number(p_category text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_year integer := extract(year from current_date)::integer;
  allocated integer;
  prefix text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid() and is_active
  ) then
    raise exception 'Active user required' using errcode = '42501';
  end if;
  if p_category not in ('general', 'fire', 'work_at_height') then
    raise exception 'Invalid training category';
  end if;

  insert into public.safety_training_counters (training_year, category, last_number)
  values (current_year, p_category, 1)
  on conflict (training_year, category)
  do update set last_number = public.safety_training_counters.last_number + 1
  returning last_number into allocated;

  prefix := case p_category
    when 'general' then 'TR-G-'
    when 'fire' then 'TR-F-'
    else 'TR-H-'
  end;
  return prefix || current_year || '-' || lpad(allocated::text, 3, '0');
end;
$$;

revoke all on function public.allocate_safety_training_number(text) from public, anon;
grant execute on function public.allocate_safety_training_number(text) to authenticated;
