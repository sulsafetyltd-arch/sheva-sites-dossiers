-- Full employee declaration fields on trade-risk acknowledgments.

alter table public.safety_trade_risk_assignments
  add column if not exists signer_id_number text,
  add column if not exists declaration_date date,
  add column if not exists contractor_name text,
  add column if not exists instructor_name text;

create or replace function public.get_safety_trade_risk_assignment(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  update public.safety_trade_risk_assignments
  set status = case when status = 'assigned' then 'in_progress' else status end
  where access_token = p_token;

  select jsonb_build_object(
    'id', a.id,
    'status', a.status,
    'trade_code', a.trade_code,
    'language_code', a.language_code,
    'signer_name', a.signer_name,
    'signer_id_number', a.signer_id_number,
    'declaration_date', a.declaration_date,
    'contractor_name', a.contractor_name,
    'instructor_name', a.instructor_name,
    'signature_data_url', a.signature_data_url,
    'acknowledged_at', a.acknowledged_at,
    'employee_name', e.full_name,
    'employee_id_number', e.id_number,
    'client_name', c.name,
    'site_name', s.name,
    'site_address', s.address
  )
  into result
  from public.safety_trade_risk_assignments a
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

drop function if exists public.complete_safety_trade_risk(uuid, text, text);
drop function if exists public.complete_safety_trade_risk(uuid, text, text, text, date, text, text);

create or replace function public.complete_safety_trade_risk(
  p_token uuid,
  p_signer_name text,
  p_signature_data_url text,
  p_signer_id_number text default null,
  p_declaration_date date default null,
  p_contractor_name text default null,
  p_instructor_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment public.safety_trade_risk_assignments%rowtype;
  clean_name text;
  clean_id text;
  clean_contractor text;
  clean_instructor text;
  clean_date date;
begin
  select * into assignment
  from public.safety_trade_risk_assignments
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
      'declaration_date', assignment.declaration_date,
      'contractor_name', assignment.contractor_name,
      'instructor_name', assignment.instructor_name
    );
  end if;

  clean_name := nullif(trim(coalesce(p_signer_name, '')), '');
  clean_id := nullif(trim(coalesce(p_signer_id_number, '')), '');
  clean_contractor := nullif(trim(coalesce(p_contractor_name, '')), '');
  clean_instructor := nullif(trim(coalesce(p_instructor_name, '')), '');
  clean_date := coalesce(p_declaration_date, current_date);

  if clean_name is null or char_length(clean_name) < 2 then
    raise exception 'Signer name required';
  end if;
  if clean_id is null or char_length(clean_id) < 4 then
    raise exception 'Signer ID number required';
  end if;
  if clean_contractor is null or char_length(clean_contractor) < 2 then
    raise exception 'Contractor name required';
  end if;
  if clean_instructor is null or char_length(clean_instructor) < 2 then
    raise exception 'Instructor name required';
  end if;
  if p_signature_data_url is null
    or p_signature_data_url not like 'data:image/%'
    or length(p_signature_data_url) > 700000 then
    raise exception 'Valid signature required';
  end if;

  update public.safety_trade_risk_assignments
  set status = 'completed',
      signer_name = clean_name,
      signer_id_number = clean_id,
      declaration_date = clean_date,
      contractor_name = clean_contractor,
      instructor_name = clean_instructor,
      signature_data_url = p_signature_data_url,
      acknowledged_at = now()
  where id = assignment.id;

  return jsonb_build_object(
    'status', 'completed',
    'acknowledged_at', now(),
    'signer_name', clean_name,
    'signer_id_number', clean_id,
    'declaration_date', clean_date,
    'contractor_name', clean_contractor,
    'instructor_name', clean_instructor
  );
end;
$$;

revoke all on function public.complete_safety_trade_risk(uuid, text, text, text, date, text, text) from public;
grant execute on function public.get_safety_trade_risk_assignment(uuid) to anon, authenticated;
grant execute on function public.complete_safety_trade_risk(uuid, text, text, text, date, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
