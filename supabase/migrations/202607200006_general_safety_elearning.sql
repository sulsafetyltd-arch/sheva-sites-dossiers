-- Token-based general safety e-learning assignments for client employees.

create table if not exists public.safety_elearning_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.safety_audit_clients(id) on delete cascade,
  employee_id uuid not null references public.safety_client_employees(id) on delete cascade,
  access_token uuid not null unique default gen_random_uuid(),
  course_version text not null default 'general-safety-v1',
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'completed')),
  score integer check (score is null or score between 0 and 100),
  answers jsonb,
  learner_signature_data_url text
    check (learner_signature_data_url is null or (
      learner_signature_data_url like 'data:image/%'
      and length(learner_signature_data_url) <= 700000
    )),
  started_at timestamptz,
  completed_at timestamptz,
  certificate_number text unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_elearning_assignments_client
  on public.safety_elearning_assignments(client_id, created_at desc);
create index if not exists idx_elearning_assignments_employee
  on public.safety_elearning_assignments(employee_id, created_at desc);

alter table public.safety_elearning_assignments enable row level security;

drop policy if exists elearning_assignments_access_select on public.safety_elearning_assignments;
create policy elearning_assignments_access_select on public.safety_elearning_assignments
  for select to authenticated using (public.can_access_safety_client(client_id));
drop policy if exists elearning_assignments_access_insert on public.safety_elearning_assignments;
create policy elearning_assignments_access_insert on public.safety_elearning_assignments
  for insert to authenticated with check (
    public.can_access_safety_client(client_id)
    and exists (
      select 1 from public.safety_client_employees e
      where e.id = employee_id and e.client_id = client_id and e.active
    )
  );
drop policy if exists elearning_assignments_access_delete on public.safety_elearning_assignments;
create policy elearning_assignments_access_delete on public.safety_elearning_assignments
  for delete to authenticated using (public.can_access_safety_client(client_id));

grant select, insert, delete on public.safety_elearning_assignments to authenticated;

create or replace function public.get_safety_elearning_assignment(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  update public.safety_elearning_assignments
  set status = case when status = 'assigned' then 'in_progress' else status end,
      started_at = coalesce(started_at, now())
  where access_token = p_token;

  select jsonb_build_object(
    'id', a.id,
    'status', a.status,
    'score', a.score,
    'completed_at', a.completed_at,
    'certificate_number', a.certificate_number,
    'learner_signature_data_url', a.learner_signature_data_url,
    'employee_name', e.full_name,
    'employee_id_number', e.id_number,
    'client_name', c.name,
    'course_version', a.course_version
  )
  into result
  from public.safety_elearning_assignments a
  join public.safety_client_employees e on e.id = a.employee_id
  join public.safety_audit_clients c on c.id = a.client_id
  where a.access_token = p_token;

  if result is null then
    raise exception 'Assignment not found' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

create or replace function public.complete_safety_elearning(
  p_token uuid,
  p_answers jsonb,
  p_signature_data_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment public.safety_elearning_assignments%rowtype;
  calculated_score integer := 0;
  certificate text;
begin
  select * into assignment
  from public.safety_elearning_assignments
  where access_token = p_token
  for update;

  if assignment.id is null then
    raise exception 'Assignment not found' using errcode = 'P0002';
  end if;
  if assignment.status = 'completed' then
    return jsonb_build_object('score', assignment.score, 'certificate_number', assignment.certificate_number);
  end if;
  if p_signature_data_url is null
    or p_signature_data_url not like 'data:image/%'
    or length(p_signature_data_url) > 700000 then
    raise exception 'Valid learner signature required';
  end if;

  calculated_score :=
    (case when p_answers->>'q1' = 'no' then 10 else 0 end) +
    (case when p_answers->>'q2' = 'stop' then 10 else 0 end) +
    (case when p_answers->>'q3' = 'yes' then 10 else 0 end) +
    (case when p_answers->>'q4' = 'electrician' then 10 else 0 end) +
    (case when p_answers->>'q5' = 'remove' then 10 else 0 end) +
    (case when p_answers->>'q6' = 'no' then 10 else 0 end) +
    (case when p_answers->>'q7' = 'read' then 10 else 0 end) +
    (case when p_answers->>'q8' = 'alert' then 10 else 0 end) +
    (case when p_answers->>'q9' = 'no' then 10 else 0 end) +
    (case when p_answers->>'q10' = 'yes' then 10 else 0 end);

  if calculated_score < 80 then
    return jsonb_build_object('score', calculated_score, 'passed', false);
  end if;

  certificate := 'EL-' || extract(year from current_date)::text || '-' || upper(substring(p_token::text from 1 for 8));
  update public.safety_elearning_assignments
  set status = 'completed',
      score = calculated_score,
      answers = p_answers,
      learner_signature_data_url = p_signature_data_url,
      completed_at = now(),
      certificate_number = certificate
  where id = assignment.id;

  if not exists (
    select 1 from public.safety_employee_training_records
    where employee_id = assignment.employee_id and certificate_number = certificate
  ) then
    insert into public.safety_employee_training_records (
      employee_id, training_type, completed_at, expires_at,
      certificate_number, notes
    ) values (
      assignment.employee_id, 'annual_safety', current_date,
      (current_date + interval '1 year')::date,
      certificate, 'הושלם באמצעות לומדת בטיחות כללית דיגיטלית'
    );
  end if;

  return jsonb_build_object('score', calculated_score, 'passed', true, 'certificate_number', certificate);
end;
$$;

revoke all on function public.get_safety_elearning_assignment(uuid) from public;
revoke all on function public.complete_safety_elearning(uuid, jsonb, text) from public;
grant execute on function public.get_safety_elearning_assignment(uuid) to anon, authenticated;
grant execute on function public.complete_safety_elearning(uuid, jsonb, text) to anon, authenticated;

notify pgrst, 'reload schema';
