-- Client employee registry and per-employee training validity history.
-- Also includes the immediately preceding identity-document columns so this
-- migration can be used safely if that additive migration was not run yet.

alter table public.safety_training_participants
  add column if not exists id_document_type text,
  add column if not exists id_document_storage_path text;

alter table public.safety_training_participants
  drop constraint if exists safety_training_participants_id_document_type_check;
alter table public.safety_training_participants
  add constraint safety_training_participants_id_document_type_check
  check (id_document_type is null or id_document_type in ('id_card', 'drivers_license'));

create table if not exists public.safety_client_employees (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.safety_audit_clients(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0),
  id_number text,
  job_title text,
  phone text,
  email text,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_safety_client_employees_identity
  on public.safety_client_employees(client_id, id_number)
  where id_number is not null and id_number <> '';
create index if not exists idx_safety_client_employees_client
  on public.safety_client_employees(client_id, active, full_name);

create table if not exists public.safety_employee_training_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.safety_client_employees(id) on delete cascade,
  training_type text not null
    check (training_type in ('annual_safety', 'work_at_height', 'new_employee')),
  completed_at date not null,
  expires_at date,
  certificate_number text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_training_records_employee
  on public.safety_employee_training_records(employee_id, completed_at desc);
create index if not exists idx_employee_training_records_expiry
  on public.safety_employee_training_records(expires_at)
  where expires_at is not null;

create or replace function public.can_access_safety_employee(requested_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.safety_client_employees e
    where e.id = requested_employee_id
      and public.can_access_safety_client(e.client_id)
  );
$$;

revoke all on function public.can_access_safety_employee(uuid) from public, anon;
grant execute on function public.can_access_safety_employee(uuid) to authenticated;

alter table public.safety_client_employees enable row level security;
alter table public.safety_employee_training_records enable row level security;

drop policy if exists client_employees_access_select on public.safety_client_employees;
create policy client_employees_access_select on public.safety_client_employees
  for select to authenticated using (public.can_access_safety_client(client_id));
drop policy if exists client_employees_access_insert on public.safety_client_employees;
create policy client_employees_access_insert on public.safety_client_employees
  for insert to authenticated with check (public.can_access_safety_client(client_id));
drop policy if exists client_employees_access_update on public.safety_client_employees;
create policy client_employees_access_update on public.safety_client_employees
  for update to authenticated
  using (public.can_access_safety_client(client_id))
  with check (public.can_access_safety_client(client_id));
drop policy if exists client_employees_admin_delete on public.safety_client_employees;
create policy client_employees_admin_delete on public.safety_client_employees
  for delete to authenticated using (public.is_safety_admin());

drop policy if exists employee_training_access_select on public.safety_employee_training_records;
create policy employee_training_access_select on public.safety_employee_training_records
  for select to authenticated using (public.can_access_safety_employee(employee_id));
drop policy if exists employee_training_access_insert on public.safety_employee_training_records;
create policy employee_training_access_insert on public.safety_employee_training_records
  for insert to authenticated with check (public.can_access_safety_employee(employee_id));
drop policy if exists employee_training_access_update on public.safety_employee_training_records;
create policy employee_training_access_update on public.safety_employee_training_records
  for update to authenticated
  using (public.can_access_safety_employee(employee_id))
  with check (public.can_access_safety_employee(employee_id));
drop policy if exists employee_training_access_delete on public.safety_employee_training_records;
create policy employee_training_access_delete on public.safety_employee_training_records
  for delete to authenticated using (public.can_access_safety_employee(employee_id));

grant select, insert, update, delete on public.safety_client_employees to authenticated;
grant select, insert, update, delete on public.safety_employee_training_records to authenticated;

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

drop trigger if exists trg_safety_client_employees_updated_at on public.safety_client_employees;
create trigger trg_safety_client_employees_updated_at
before update on public.safety_client_employees
for each row execute function public.set_updated_at();
