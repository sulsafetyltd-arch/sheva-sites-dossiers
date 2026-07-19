-- Dedicated Israel Railways site safety report format.

alter table public.safety_audit_reports
  add column if not exists domain_details jsonb not null default '{}'::jsonb;

alter table public.safety_audit_reports
  drop constraint if exists safety_audit_reports_report_type_check;
alter table public.safety_audit_reports
  add constraint safety_audit_reports_report_type_check
  check (report_type in ('workplace', 'construction', 'infrastructure', 'railway'));

alter table public.safety_report_counters
  drop constraint if exists safety_report_counters_report_type_check;
alter table public.safety_report_counters
  add constraint safety_report_counters_report_type_check
  check (report_type in ('workplace', 'construction', 'infrastructure', 'railway'));

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
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid() and is_active
  ) then
    raise exception 'Active user required' using errcode = '42501';
  end if;
  if p_report_type not in ('workplace', 'construction', 'infrastructure', 'railway') then
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
    else 'SB-'
  end;
  return prefix || current_year || '-' || lpad(allocated::text, 3, '0');
end;
$$;

revoke all on function public.allocate_safety_report_number(text) from public, anon;
grant execute on function public.allocate_safety_report_number(text) to authenticated;
