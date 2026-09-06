-- Extend temporary no-login bypass to employee registry tables.
-- Fixes: new row violates row-level security policy for table "safety_client_employees"

grant select, insert, update, delete on public.safety_client_employees to anon;
grant select, insert, update, delete on public.safety_employee_training_records to anon;

drop policy if exists client_employees_anon_all on public.safety_client_employees;
create policy client_employees_anon_all on public.safety_client_employees
  for all to anon
  using (true)
  with check (true);

drop policy if exists employee_training_anon_all on public.safety_employee_training_records;
create policy employee_training_anon_all on public.safety_employee_training_records
  for all to anon
  using (true)
  with check (true);
