-- Construction induction (new-worker safety brief) acknowledgments under client sites.

create table if not exists public.safety_induction_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.safety_audit_clients(id) on delete cascade,
  site_id uuid not null references public.safety_client_sites(id) on delete restrict,
  employee_id uuid not null references public.safety_client_employees(id) on delete cascade,
  language_code text not null default 'he',
  access_token uuid not null unique default gen_random_uuid(),
  status text not null default 'assigned'
    check (status in ('assigned', 'in_progress', 'completed')),
  signer_name text,
  signer_id_number text,
  job_title text,
  declaration_date date,
  company_name text,
  instructor_name text,
  site_manager_name text,
  height_training_valid_until date,
  signature_data_url text
    check (signature_data_url is null or (
      signature_data_url like 'data:image/%'
      and length(signature_data_url) <= 700000
    )),
  acknowledged_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint safety_induction_language_len check (char_length(language_code) between 2 and 16)
);

create index if not exists idx_induction_assignments_client
  on public.safety_induction_assignments(client_id, created_at desc);
create index if not exists idx_induction_assignments_site
  on public.safety_induction_assignments(site_id, created_at desc);
create index if not exists idx_induction_assignments_employee
  on public.safety_induction_assignments(employee_id, created_at desc);

alter table public.safety_induction_assignments enable row level security;

drop policy if exists induction_assignments_select on public.safety_induction_assignments;
create policy induction_assignments_select on public.safety_induction_assignments
  for select to authenticated using (public.can_access_safety_client(client_id));
drop policy if exists induction_assignments_insert on public.safety_induction_assignments;
create policy induction_assignments_insert on public.safety_induction_assignments
  for insert to authenticated with check (
    public.can_access_safety_client(client_id)
    and exists (
      select 1 from public.safety_client_employees e
      where e.id = employee_id and e.client_id = client_id and e.active
    )
    and exists (
      select 1 from public.safety_client_sites s
      where s.id = site_id and s.client_id = client_id and s.active
    )
  );
drop policy if exists induction_assignments_delete on public.safety_induction_assignments;
create policy induction_assignments_delete on public.safety_induction_assignments
  for delete to authenticated using (public.can_access_safety_client(client_id));

grant select, insert, delete on public.safety_induction_assignments to authenticated;

create or replace function public.get_safety_induction_assignment(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  update public.safety_induction_assignments
  set status = case when status = 'assigned' then 'in_progress' else status end
  where access_token = p_token;

  select jsonb_build_object(
    'id', a.id,
    'status', a.status,
    'language_code', a.language_code,
    'signer_name', a.signer_name,
    'signer_id_number', a.signer_id_number,
    'job_title', a.job_title,
    'declaration_date', a.declaration_date,
    'company_name', a.company_name,
    'instructor_name', a.instructor_name,
    'site_manager_name', a.site_manager_name,
    'height_training_valid_until', a.height_training_valid_until,
    'signature_data_url', a.signature_data_url,
    'acknowledged_at', a.acknowledged_at,
    'employee_name', e.full_name,
    'employee_id_number', e.id_number,
    'employee_job_title', e.job_title,
    'client_name', c.name,
    'site_name', s.name,
    'site_address', s.address
  )
  into result
  from public.safety_induction_assignments a
  join public.safety_client_employees e on e.id = a.employee_id
  join public.safety_audit_clients c on c.id = a.client_id
  join public.safety_client_sites s on s.id = a.site_id
  where a.access_token = p_token;

  if result is null then
    raise exception 'Assignment not found' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

create or replace function public.complete_safety_induction(
  p_token uuid,
  p_signer_name text,
  p_signature_data_url text,
  p_signer_id_number text,
  p_job_title text,
  p_declaration_date date,
  p_company_name text,
  p_instructor_name text,
  p_site_manager_name text,
  p_height_training_valid_until date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment public.safety_induction_assignments%rowtype;
  clean_name text;
  clean_id text;
  clean_job text;
  clean_company text;
  clean_instructor text;
  clean_manager text;
  clean_date date;
  certificate text;
begin
  select * into assignment
  from public.safety_induction_assignments
  where access_token = p_token
  for update;

  if assignment.id is null then
    raise exception 'Assignment not found' using errcode = 'P0002';
  end if;

  if assignment.status = 'completed' then
    return jsonb_build_object(
      'status', assignment.status,
      'acknowledged_at', assignment.acknowledged_at,
      'signer_name', assignment.signer_name,
      'signer_id_number', assignment.signer_id_number,
      'job_title', assignment.job_title,
      'declaration_date', assignment.declaration_date,
      'company_name', assignment.company_name,
      'instructor_name', assignment.instructor_name,
      'site_manager_name', assignment.site_manager_name,
      'height_training_valid_until', assignment.height_training_valid_until
    );
  end if;

  clean_name := nullif(trim(coalesce(p_signer_name, '')), '');
  clean_id := nullif(trim(coalesce(p_signer_id_number, '')), '');
  clean_job := nullif(trim(coalesce(p_job_title, '')), '');
  clean_company := nullif(trim(coalesce(p_company_name, '')), '');
  clean_instructor := nullif(trim(coalesce(p_instructor_name, '')), '');
  clean_manager := nullif(trim(coalesce(p_site_manager_name, '')), '');
  clean_date := coalesce(p_declaration_date, current_date);

  if clean_name is null or char_length(clean_name) < 2 then
    raise exception 'Signer name required';
  end if;
  if clean_id is null or char_length(clean_id) < 4 then
    raise exception 'Signer ID number required';
  end if;
  if clean_job is null or char_length(clean_job) < 2 then
    raise exception 'Job title required';
  end if;
  if clean_company is null or char_length(clean_company) < 2 then
    raise exception 'Company name required';
  end if;
  if clean_instructor is null or char_length(clean_instructor) < 2 then
    raise exception 'Instructor name required';
  end if;
  if clean_manager is null or char_length(clean_manager) < 2 then
    raise exception 'Site manager name required';
  end if;
  if p_signature_data_url is null
    or p_signature_data_url not like 'data:image/%'
    or length(p_signature_data_url) > 700000 then
    raise exception 'Valid signature required';
  end if;

  update public.safety_induction_assignments
  set status = 'completed',
      signer_name = clean_name,
      signer_id_number = clean_id,
      job_title = clean_job,
      declaration_date = clean_date,
      company_name = clean_company,
      instructor_name = clean_instructor,
      site_manager_name = clean_manager,
      height_training_valid_until = p_height_training_valid_until,
      signature_data_url = p_signature_data_url,
      acknowledged_at = now()
  where id = assignment.id;

  certificate := 'CI-' || extract(year from current_date)::text || '-' || upper(substring(p_token::text from 1 for 8));
  if not exists (
    select 1 from public.safety_employee_training_records
    where employee_id = assignment.employee_id and certificate_number = certificate
  ) then
    insert into public.safety_employee_training_records (
      employee_id, training_type, completed_at, certificate_number, notes
    ) values (
      assignment.employee_id,
      'new_employee',
      clean_date,
      certificate,
      'הוראות בטיחות לעובד חדש באתר בנייה — נחתם דיגיטלית'
    );
  end if;

  return jsonb_build_object(
    'status', 'completed',
    'acknowledged_at', now(),
    'signer_name', clean_name,
    'signer_id_number', clean_id,
    'job_title', clean_job,
    'declaration_date', clean_date,
    'company_name', clean_company,
    'instructor_name', clean_instructor,
    'site_manager_name', clean_manager,
    'height_training_valid_until', p_height_training_valid_until,
    'certificate_number', certificate
  );
end;
$$;

revoke all on function public.get_safety_induction_assignment(uuid) from public;
revoke all on function public.complete_safety_induction(uuid, text, text, text, text, date, text, text, text, date) from public;
grant execute on function public.get_safety_induction_assignment(uuid) to anon, authenticated;
grant execute on function public.complete_safety_induction(uuid, text, text, text, text, date, text, text, text, date) to anon, authenticated;

notify pgrst, 'reload schema';
