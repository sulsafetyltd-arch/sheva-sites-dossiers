-- Avoid nested RLS evaluation when defects and photos check their parent row.
-- These helpers run as the function owner, but always scope the result to the
-- authenticated user through can_access_safety_client().

create or replace function public.can_access_safety_report(requested_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.safety_audit_reports r
    where r.id = requested_report_id
      and public.can_access_safety_client(r.client_id)
  );
$$;

create or replace function public.can_access_safety_defect(requested_defect_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.safety_audit_defects d
    where d.id = requested_defect_id
      and public.can_access_safety_report(d.report_id)
  );
$$;

revoke all on function public.can_access_safety_report(uuid) from public, anon;
revoke all on function public.can_access_safety_defect(uuid) from public, anon;
grant execute on function public.can_access_safety_report(uuid) to authenticated;
grant execute on function public.can_access_safety_defect(uuid) to authenticated;

drop policy if exists defects_access_all on public.safety_audit_defects;
drop policy if exists defects_access_select on public.safety_audit_defects;
drop policy if exists defects_access_insert on public.safety_audit_defects;
drop policy if exists defects_access_update on public.safety_audit_defects;
drop policy if exists defects_access_delete on public.safety_audit_defects;

create policy defects_access_select on public.safety_audit_defects
  for select to authenticated
  using (public.can_access_safety_report(report_id));

create policy defects_access_insert on public.safety_audit_defects
  for insert to authenticated
  with check (public.can_access_safety_report(report_id));

create policy defects_access_update on public.safety_audit_defects
  for update to authenticated
  using (public.can_access_safety_report(report_id))
  with check (public.can_access_safety_report(report_id));

create policy defects_access_delete on public.safety_audit_defects
  for delete to authenticated
  using (public.can_access_safety_report(report_id));

drop policy if exists photos_access_all on public.safety_audit_defect_photos;
drop policy if exists photos_access_select on public.safety_audit_defect_photos;
drop policy if exists photos_access_insert on public.safety_audit_defect_photos;
drop policy if exists photos_access_update on public.safety_audit_defect_photos;
drop policy if exists photos_access_delete on public.safety_audit_defect_photos;

create policy photos_access_select on public.safety_audit_defect_photos
  for select to authenticated
  using (public.can_access_safety_defect(defect_id));

create policy photos_access_insert on public.safety_audit_defect_photos
  for insert to authenticated
  with check (public.can_access_safety_defect(defect_id));

create policy photos_access_update on public.safety_audit_defect_photos
  for update to authenticated
  using (public.can_access_safety_defect(defect_id))
  with check (public.can_access_safety_defect(defect_id));

create policy photos_access_delete on public.safety_audit_defect_photos
  for delete to authenticated
  using (public.can_access_safety_defect(defect_id));
