-- Explicit authorized defect creation avoids PostgREST insert/RLS ambiguity
-- while still enforcing report access inside the database.
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

  insert into public.safety_audit_defects (
    report_id,
    checklist_topic_key,
    description,
    severity,
    corrective_action,
    responsible,
    due_date,
    sort_order
  )
  values (
    p_report_id,
    p_checklist_topic_key,
    p_description,
    p_severity,
    p_corrective_action,
    p_responsible,
    p_due_date,
    coalesce(p_sort_order, 0)
  )
  returning * into created_defect;

  return created_defect;
end;
$$;

revoke all on function public.create_safety_defect(uuid, text, text, text, text, text, date, integer)
  from public, anon;
grant execute on function public.create_safety_defect(uuid, text, text, text, text, text, date, integer)
  to authenticated;

-- Storage policies use a definer helper so checking the client folder does not
-- trigger nested client-table RLS.
create or replace function public.can_access_safety_storage_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select exists (
    select 1
    from public.safety_audit_clients c
    where c.id::text = (storage.foldername(object_name))[1]
      and public.can_access_safety_client(c.id)
  );
$$;

revoke all on function public.can_access_safety_storage_object(text) from public, anon;
grant execute on function public.can_access_safety_storage_object(text) to authenticated;

drop policy if exists audit_files_read on storage.objects;
drop policy if exists audit_files_insert on storage.objects;
drop policy if exists audit_files_update on storage.objects;
drop policy if exists audit_files_delete on storage.objects;

create policy audit_files_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'audit-files'
    and public.can_access_safety_storage_object(name)
  );

create policy audit_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'audit-files'
    and public.can_access_safety_storage_object(name)
  );

create policy audit_files_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'audit-files'
    and public.can_access_safety_storage_object(name)
  )
  with check (
    bucket_id = 'audit-files'
    and public.can_access_safety_storage_object(name)
  );

create policy audit_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'audit-files'
    and public.can_access_safety_storage_object(name)
  );
