-- Construction sites under clients + trade risk summary acknowledgment links.

create table if not exists public.safety_client_sites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.safety_audit_clients(id) on delete cascade,
  name text not null,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint safety_client_sites_name_len check (char_length(trim(name)) between 1 and 200)
);

create index if not exists idx_safety_client_sites_client
  on public.safety_client_sites(client_id, active, name);

alter table public.safety_client_sites enable row level security;

drop policy if exists safety_client_sites_select on public.safety_client_sites;
create policy safety_client_sites_select on public.safety_client_sites
  for select to authenticated using (public.can_access_safety_client(client_id));
drop policy if exists safety_client_sites_insert on public.safety_client_sites;
create policy safety_client_sites_insert on public.safety_client_sites
  for insert to authenticated with check (public.can_access_safety_client(client_id));
drop policy if exists safety_client_sites_update on public.safety_client_sites;
create policy safety_client_sites_update on public.safety_client_sites
  for update to authenticated
  using (public.can_access_safety_client(client_id))
  with check (public.can_access_safety_client(client_id));
drop policy if exists safety_client_sites_delete on public.safety_client_sites;
create policy safety_client_sites_delete on public.safety_client_sites
  for delete to authenticated using (public.can_access_safety_client(client_id));

grant select, insert, update, delete on public.safety_client_sites to authenticated;

create table if not exists public.safety_trade_risk_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.safety_audit_clients(id) on delete cascade,
  site_id uuid not null references public.safety_client_sites(id) on delete restrict,
  employee_id uuid not null references public.safety_client_employees(id) on delete cascade,
  trade_code text not null,
  language_code text not null default 'he',
  access_token uuid not null unique default gen_random_uuid(),
  status text not null default 'assigned'
    check (status in ('assigned', 'in_progress', 'completed')),
  signer_name text,
  signature_data_url text
    check (signature_data_url is null or (
      signature_data_url like 'data:image/%'
      and length(signature_data_url) <= 700000
    )),
  acknowledged_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint safety_trade_risk_trade_code_len check (char_length(trade_code) between 2 and 64),
  constraint safety_trade_risk_language_len check (char_length(language_code) between 2 and 16)
);

create index if not exists idx_trade_risk_assignments_client
  on public.safety_trade_risk_assignments(client_id, created_at desc);
create index if not exists idx_trade_risk_assignments_site
  on public.safety_trade_risk_assignments(site_id, created_at desc);
create index if not exists idx_trade_risk_assignments_employee
  on public.safety_trade_risk_assignments(employee_id, created_at desc);

alter table public.safety_trade_risk_assignments enable row level security;

drop policy if exists trade_risk_assignments_select on public.safety_trade_risk_assignments;
create policy trade_risk_assignments_select on public.safety_trade_risk_assignments
  for select to authenticated using (public.can_access_safety_client(client_id));
drop policy if exists trade_risk_assignments_insert on public.safety_trade_risk_assignments;
create policy trade_risk_assignments_insert on public.safety_trade_risk_assignments
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
drop policy if exists trade_risk_assignments_delete on public.safety_trade_risk_assignments;
create policy trade_risk_assignments_delete on public.safety_trade_risk_assignments
  for delete to authenticated using (public.can_access_safety_client(client_id));

grant select, insert, delete on public.safety_trade_risk_assignments to authenticated;

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

create or replace function public.complete_safety_trade_risk(
  p_token uuid,
  p_signer_name text,
  p_signature_data_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment public.safety_trade_risk_assignments%rowtype;
  clean_name text;
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
      'signer_name', assignment.signer_name
    );
  end if;

  clean_name := nullif(trim(coalesce(p_signer_name, '')), '');
  if clean_name is null or char_length(clean_name) < 2 then
    raise exception 'Signer name required';
  end if;
  if p_signature_data_url is null
    or p_signature_data_url not like 'data:image/%'
    or length(p_signature_data_url) > 700000 then
    raise exception 'Valid signature required';
  end if;

  update public.safety_trade_risk_assignments
  set status = 'completed',
      signer_name = clean_name,
      signature_data_url = p_signature_data_url,
      acknowledged_at = now()
  where id = assignment.id;

  return jsonb_build_object(
    'status', 'completed',
    'acknowledged_at', now(),
    'signer_name', clean_name
  );
end;
$$;

revoke all on function public.get_safety_trade_risk_assignment(uuid) from public;
revoke all on function public.complete_safety_trade_risk(uuid, text, text) from public;
grant execute on function public.get_safety_trade_risk_assignment(uuid) to anon, authenticated;
grant execute on function public.complete_safety_trade_risk(uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
