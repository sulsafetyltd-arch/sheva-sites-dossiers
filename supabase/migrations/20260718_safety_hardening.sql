-- Final integrity and security hardening after the end-to-end audit.

create table if not exists public.safety_report_counters (
  report_year integer not null,
  report_type text not null check (report_type in ('workplace', 'construction')),
  last_number integer not null default 0,
  primary key (report_year, report_type)
);
alter table public.safety_report_counters enable row level security;
revoke all on public.safety_report_counters from anon, authenticated;

create or replace function public.allocate_safety_report_number(p_report_type text)
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
  if p_report_type not in ('workplace', 'construction') then
    raise exception 'Invalid report type';
  end if;

  insert into public.safety_report_counters (report_year, report_type, last_number)
  values (
    current_year,
    p_report_type,
    coalesce((
      select max(substring(report_number from '[0-9]+$')::integer)
      from public.safety_audit_reports
      where report_type = p_report_type
        and extract(year from date) = current_year
    ), 0) + 1
  )
  on conflict (report_year, report_type)
  do update set last_number = public.safety_report_counters.last_number + 1
  returning last_number into allocated;

  prefix := case when p_report_type = 'construction' then 'BN-' else 'SB-' end;
  return prefix || current_year || '-' || lpad(allocated::text, 3, '0');
end;
$$;
revoke all on function public.allocate_safety_report_number(text) from public, anon;
grant execute on function public.allocate_safety_report_number(text) to authenticated;

-- Topic-linked defect creation is idempotent, preventing mobile double taps
-- from creating duplicate defects.
create or replace function public.create_safety_defect(
  p_report_id uuid,
  p_checklist_topic_key text,
  p_description text,
  p_severity text,
  p_corrective_action text,
  p_responsible text,
  p_due_date date,
  p_sort_order integer
)
returns public.safety_audit_defects
language plpgsql
security definer
set search_path = public
as $$
declare
  created_defect public.safety_audit_defects;
begin
  if auth.uid() is null or not public.can_access_safety_report(p_report_id) then
    raise exception 'Not authorized for this report' using errcode = '42501';
  end if;

  if p_checklist_topic_key is not null then
    select * into created_defect
    from public.safety_audit_defects
    where report_id = p_report_id and checklist_topic_key = p_checklist_topic_key
    order by created_at
    limit 1;
    if found then return created_defect; end if;
  end if;

  insert into public.safety_audit_defects (
    report_id, checklist_topic_key, description, severity,
    corrective_action, responsible, due_date, sort_order
  )
  values (
    p_report_id, p_checklist_topic_key, p_description, p_severity,
    p_corrective_action, p_responsible, p_due_date, coalesce(p_sort_order, 0)
  )
  returning * into created_defect;
  return created_defect;
end;
$$;
revoke all on function public.create_safety_defect(uuid, text, text, text, text, text, date, integer)
  from public, anon;
grant execute on function public.create_safety_defect(uuid, text, text, text, text, text, date, integer)
  to authenticated;

-- The first-account check is based on Auth users, not a possibly truncated
-- profiles table.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  first_account boolean;
begin
  perform pg_advisory_xact_lock(739210);
  select not exists(select 1 from auth.users where id <> new.id) into first_account;
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    case when first_account then 'admin' else 'member' end,
    first_account
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.prevent_last_safety_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'admin' and old.is_active and (
    tg_op = 'DELETE' or new.role <> 'admin' or not new.is_active
  ) and not exists (
    select 1 from public.profiles
    where id <> old.id and role = 'admin' and is_active
  ) then
    raise exception 'Cannot remove the last active admin';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
drop trigger if exists protect_last_safety_admin on public.profiles;
create trigger protect_last_safety_admin
before update or delete on public.profiles
for each row execute function public.prevent_last_safety_admin_removal();

-- Personal image payloads are deliberately capped to prevent database bloat.
create or replace function public.update_own_safety_profile(
  profile_full_name text,
  profile_job_title text,
  profile_phone text,
  profile_signature_data_url text,
  profile_stamp_data_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if profile_signature_data_url is not null and (
    length(profile_signature_data_url) > 700000
    or profile_signature_data_url not like 'data:image/%'
  ) then
    raise exception 'Invalid or oversized signature image';
  end if;
  if profile_stamp_data_url is not null and (
    length(profile_stamp_data_url) > 700000
    or profile_stamp_data_url not like 'data:image/%'
  ) then
    raise exception 'Invalid or oversized stamp image';
  end if;

  update public.profiles
  set
    full_name = nullif(trim(profile_full_name), ''),
    job_title = nullif(trim(profile_job_title), ''),
    phone = nullif(trim(profile_phone), ''),
    signature_data_url = profile_signature_data_url,
    stamp_data_url = profile_stamp_data_url,
    updated_at = now()
  where id = auth.uid();
  if not found then raise exception 'Profile not found'; end if;
end;
$$;
revoke all on function public.update_own_safety_profile(text, text, text, text, text)
  from public, anon;
grant execute on function public.update_own_safety_profile(text, text, text, text, text)
  to authenticated;

-- Report deletion is an admin operation. Members can still create and update
-- reports for their assigned clients.
drop policy if exists reports_access_delete on public.safety_audit_reports;
create policy reports_access_delete on public.safety_audit_reports
  for delete to authenticated
  using (public.is_safety_admin());

-- Legacy dossier writes are no longer anonymous. Keep public reads for
-- backwards-compatible image URLs, but require an active authenticated user
-- for table and storage mutations.
drop policy if exists "Allow all access to dossiers" on public.dossiers;
drop policy if exists "Allow all access to dossier_tasks" on public.dossier_tasks;
create policy dossiers_active_users on public.dossiers
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_active))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_active));
create policy dossier_tasks_active_users on public.dossier_tasks
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_active))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_active));

drop policy if exists "Anyone can upload dossier files" on storage.objects;
drop policy if exists "Anyone can delete dossier files" on storage.objects;
create policy dossier_files_authenticated_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dossier-files'
    and exists (select 1 from public.profiles where id = auth.uid() and is_active)
  );
create policy dossier_files_authenticated_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dossier-files'
    and exists (select 1 from public.profiles where id = auth.uid() and is_active)
  );
