-- TEMPORARY operator bypass: allow the safety app to work without login.
-- Requested to remove the login gate before an on-site training.
-- Re-secure later by dropping these overrides and restoring auth checks.

create or replace function public.is_safety_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select true;
$$;

create or replace function public.can_access_safety_client(requested_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select requested_client_id is not null;
$$;

-- Allow anonymous (no-login) clients to use the same table grants as authenticated.
grant select, insert, update, delete on public.profiles to anon;
grant select, insert, update, delete on public.safety_audit_clients to anon;
grant select, insert, update, delete on public.client_members to anon;
grant select, insert, update, delete on public.safety_audit_reports to anon;
grant select, insert, update, delete on public.safety_audit_defects to anon;
grant select, insert, update, delete on public.safety_audit_defect_photos to anon;
grant select, insert, update, delete on public.safety_training_sessions to anon;
grant select, insert, update, delete on public.safety_training_participants to anon;

drop policy if exists clients_read_anon on public.safety_audit_clients;
create policy clients_read_anon on public.safety_audit_clients
  for all to anon
  using (true)
  with check (true);

drop policy if exists reports_access_anon on public.safety_audit_reports;
create policy reports_access_anon on public.safety_audit_reports
  for all to anon
  using (true)
  with check (true);

drop policy if exists defects_access_anon on public.safety_audit_defects;
create policy defects_access_anon on public.safety_audit_defects
  for all to anon
  using (true)
  with check (true);

drop policy if exists photos_access_anon on public.safety_audit_defect_photos;
create policy photos_access_anon on public.safety_audit_defect_photos
  for all to anon
  using (true)
  with check (true);

drop policy if exists training_sessions_anon on public.safety_training_sessions;
create policy training_sessions_anon on public.safety_training_sessions
  for all to anon
  using (true)
  with check (true);

drop policy if exists training_participants_anon on public.safety_training_participants;
create policy training_participants_anon on public.safety_training_participants
  for all to anon
  using (true)
  with check (true);

drop policy if exists profiles_anon on public.profiles;
create policy profiles_anon on public.profiles
  for all to anon
  using (true)
  with check (true);

drop policy if exists client_members_anon on public.client_members;
create policy client_members_anon on public.client_members
  for all to anon
  using (true)
  with check (true);

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
  if p_category not in ('general', 'fire', 'work_at_height', 'ramp_loading') then
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
    when 'ramp_loading' then 'TR-R-'
    else 'TR-H-'
  end;
  return prefix || current_year || '-' || lpad(allocated::text, 3, '0');
end;
$$;

revoke all on function public.allocate_safety_training_number(text) from public;
grant execute on function public.allocate_safety_training_number(text) to authenticated, anon;

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
  if p_report_type not in (
    'workplace',
    'construction',
    'infrastructure',
    'railway',
    'building_survey',
    'education_institution'
  ) then
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

  prefix := case p_report_type
    when 'construction' then 'BN-'
    when 'infrastructure' then 'TI-'
    when 'railway' then 'IR-'
    when 'building_survey' then 'BS-'
    when 'education_institution' then 'ED-'
    else 'SB-'
  end;
  return prefix || current_year || '-' || lpad(allocated::text, 3, '0');
end;
$$;

revoke all on function public.allocate_safety_report_number(text) from public;
grant execute on function public.allocate_safety_report_number(text) to authenticated, anon;

-- Storage: allow anon read/write on audit-files (needed for signatures / photos without login).
drop policy if exists audit_files_anon_all on storage.objects;
create policy audit_files_anon_all on storage.objects
  for all to anon
  using (bucket_id = 'audit-files')
  with check (bucket_id = 'audit-files');
