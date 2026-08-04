-- Defect lifecycle (open/fixed/verified) + after photos + report finalize/lock with snapshot

alter table public.safety_audit_defects
  add column if not exists status text not null default 'open',
  add column if not exists fixed_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by text,
  add column if not exists resolution_notes text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'safety_audit_defects_status_check'
  ) then
    alter table public.safety_audit_defects
      add constraint safety_audit_defects_status_check
      check (status in ('open', 'fixed', 'verified'));
  end if;
end $$;

alter table public.safety_audit_defect_photos
  add column if not exists photo_kind text not null default 'before';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'safety_audit_defect_photos_kind_check'
  ) then
    alter table public.safety_audit_defect_photos
      add constraint safety_audit_defect_photos_kind_check
      check (photo_kind in ('before', 'after'));
  end if;
end $$;

alter table public.safety_audit_reports
  add column if not exists finalized_at timestamptz,
  add column if not exists finalized_by text,
  add column if not exists finalized_by_user_id uuid references auth.users(id),
  add column if not exists final_snapshot jsonb,
  add column if not exists final_pdf_path text;

create or replace function public.safety_report_is_locked(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.safety_audit_reports r
    where r.id = p_report_id
      and r.status = 'final'
  );
$$;

revoke all on function public.safety_report_is_locked(uuid) from public, anon;
grant execute on function public.safety_report_is_locked(uuid) to authenticated;

create or replace function public.prevent_locked_safety_report_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_id uuid;
  locked boolean;
begin
  if tg_table_name = 'safety_audit_reports' then
    report_id := coalesce(new.id, old.id);
    locked := (
      select status = 'final'
      from public.safety_audit_reports
      where id = report_id
    );
    -- Allow finalize/reopen RPCs (security definer) and status transitions via those RPCs only.
    if tg_op = 'UPDATE'
      and locked
      and (
        new.status is distinct from old.status
        or new.finalized_at is distinct from old.finalized_at
        or new.finalized_by is distinct from old.finalized_by
        or new.finalized_by_user_id is distinct from old.finalized_by_user_id
        or new.final_snapshot is distinct from old.final_snapshot
        or new.final_pdf_path is distinct from old.final_pdf_path
        or new.updated_at is distinct from old.updated_at
      )
      and (
        -- Block content edits while locked; allow only lock-metadata changes from RPCs
        new.site_name is not distinct from old.site_name
        and new.project_name is not distinct from old.project_name
        and new.checklist is not distinct from old.checklist
        and new.domain_details is not distinct from old.domain_details
        and new.auditor_signature_url is not distinct from old.auditor_signature_url
        and new.site_manager_signature_url is not distinct from old.site_manager_signature_url
        and new.executive_summary is not distinct from old.executive_summary
        and new.recipient is not distinct from old.recipient
        and new.risk_level is not distinct from old.risk_level
        and new.immediate_action is not distinct from old.immediate_action
        and new.contractor is not distinct from old.contractor
        and new.attendees is not distinct from old.attendees
        and new.site_manager is not distinct from old.site_manager
        and new.auditor is not distinct from old.auditor
        and new.auditor_role is not distinct from old.auditor_role
        and new.auditor_phone is not distinct from old.auditor_phone
        and new.work_hours is not distinct from old.work_hours
        and new.workers_count is not distinct from old.workers_count
        and new.work_stage is not distinct from old.work_stage
        and new.work_stages_detail is not distinct from old.work_stages_detail
        and new.block is not distinct from old.block
        and new.parcel is not distinct from old.parcel
        and new.audit_date is not distinct from old.audit_date
        and new.date is not distinct from old.date
        and new.auditor_stamp_url is not distinct from old.auditor_stamp_url
        and new.site_manager_signed_at is not distinct from old.site_manager_signed_at
        and new.auditor_signed_at is not distinct from old.auditor_signed_at
      )
    then
      return new;
    end if;

    if locked and tg_op = 'UPDATE' and new.status = 'final' and old.status = 'final' then
      -- content change attempted on locked report
      if new.site_name is distinct from old.site_name
        or new.checklist is distinct from old.checklist
        or new.domain_details is distinct from old.domain_details
        or new.auditor_signature_url is distinct from old.auditor_signature_url
        or new.site_manager_signature_url is distinct from old.site_manager_signature_url
        or new.executive_summary is distinct from old.executive_summary
        or new.recipient is distinct from old.recipient
        or new.risk_level is distinct from old.risk_level
        or new.immediate_action is distinct from old.immediate_action
        or new.contractor is distinct from old.contractor
        or new.attendees is distinct from old.attendees
        or new.site_manager is distinct from old.site_manager
        or new.auditor is distinct from old.auditor
        or new.auditor_role is distinct from old.auditor_role
        or new.auditor_phone is distinct from old.auditor_phone
        or new.work_hours is distinct from old.work_hours
        or new.workers_count is distinct from old.workers_count
        or new.work_stage is distinct from old.work_stage
        or new.work_stages_detail is distinct from old.work_stages_detail
        or new.project_name is distinct from old.project_name
        or new.block is distinct from old.block
        or new.parcel is distinct from old.parcel
        or new.audit_date is distinct from old.audit_date
        or new.date is distinct from old.date
        or new.auditor_stamp_url is distinct from old.auditor_stamp_url
        or new.site_manager_signed_at is distinct from old.site_manager_signed_at
        or new.auditor_signed_at is distinct from old.auditor_signed_at
      then
        raise exception 'הדוח נעול ולא ניתן לערוך אותו' using errcode = 'P0001';
      end if;
    end if;

    if tg_op = 'DELETE' and locked and not public.is_safety_admin() then
      raise exception 'הדוח נעול ולא ניתן למחוק אותו' using errcode = 'P0001';
    end if;
    return coalesce(new, old);
  end if;

  if tg_table_name = 'safety_audit_defects' then
    report_id := coalesce(new.report_id, old.report_id);
  elsif tg_table_name = 'safety_audit_defect_photos' then
    select d.report_id into report_id
    from public.safety_audit_defects d
    where d.id = coalesce(new.defect_id, old.defect_id);
  end if;

  if report_id is not null and public.safety_report_is_locked(report_id) then
    raise exception 'הדוח נעול ולא ניתן לשנות ליקויים או תמונות' using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_lock_safety_reports on public.safety_audit_reports;
create trigger trg_lock_safety_reports
  before update or delete on public.safety_audit_reports
  for each row execute function public.prevent_locked_safety_report_mutation();

drop trigger if exists trg_lock_safety_defects on public.safety_audit_defects;
create trigger trg_lock_safety_defects
  before insert or update or delete on public.safety_audit_defects
  for each row execute function public.prevent_locked_safety_report_mutation();

drop trigger if exists trg_lock_safety_defect_photos on public.safety_audit_defect_photos;
create trigger trg_lock_safety_defect_photos
  before insert or update or delete on public.safety_audit_defect_photos
  for each row execute function public.prevent_locked_safety_report_mutation();

create or replace function public.finalize_safety_report(
  p_report_id uuid,
  p_snapshot jsonb,
  p_final_pdf_path text default null
)
returns public.safety_audit_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row public.safety_audit_reports;
  actor_name text;
begin
  if auth.uid() is null or not public.can_access_safety_report(p_report_id) then
    raise exception 'Not authorized for this report' using errcode = '42501';
  end if;

  select * into report_row
  from public.safety_audit_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;

  if report_row.status = 'final' then
    raise exception 'הדוח כבר נעול' using errcode = 'P0001';
  end if;

  if report_row.auditor_signature_url is null or btrim(report_row.auditor_signature_url) = '' then
    raise exception 'יש לחתום כממונה בטיחות לפני נעילת הדוח' using errcode = 'P0001';
  end if;

  select coalesce(nullif(btrim(p.full_name), ''), auth.email())
  into actor_name
  from public.profiles p
  where p.id = auth.uid();

  update public.safety_audit_reports
  set
    status = 'final',
    finalized_at = now(),
    finalized_by = actor_name,
    finalized_by_user_id = auth.uid(),
    final_snapshot = p_snapshot,
    final_pdf_path = coalesce(p_final_pdf_path, final_pdf_path),
    updated_at = now()
  where id = p_report_id
  returning * into report_row;

  return report_row;
end;
$$;

revoke all on function public.finalize_safety_report(uuid, jsonb, text) from public, anon;
grant execute on function public.finalize_safety_report(uuid, jsonb, text) to authenticated;

create or replace function public.reopen_safety_report(p_report_id uuid)
returns public.safety_audit_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row public.safety_audit_reports;
begin
  if auth.uid() is null or not public.is_safety_admin() then
    raise exception 'רק מנהל יכול לפתוח מחדש דוח נעול' using errcode = '42501';
  end if;

  update public.safety_audit_reports
  set
    status = 'draft',
    finalized_at = null,
    finalized_by = null,
    finalized_by_user_id = null,
    -- Keep snapshot/pdf as archival evidence of the previous final version
    updated_at = now()
  where id = p_report_id
  returning * into report_row;

  if not found then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;

  return report_row;
end;
$$;

revoke all on function public.reopen_safety_report(uuid) from public, anon;
grant execute on function public.reopen_safety_report(uuid) to authenticated;
