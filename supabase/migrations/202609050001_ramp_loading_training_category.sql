-- SOL-FORM-001: ramp loading / unloading bay training category (Bio-Rad).

alter table public.safety_training_sessions
  drop constraint if exists safety_training_sessions_category_check;

alter table public.safety_training_sessions
  add constraint safety_training_sessions_category_check
  check (category in ('general', 'fire', 'work_at_height', 'ramp_loading'));

alter table public.safety_training_counters
  drop constraint if exists safety_training_counters_category_check;

alter table public.safety_training_counters
  add constraint safety_training_counters_category_check
  check (category in ('general', 'fire', 'work_at_height', 'ramp_loading'));

create or replace function public.allocate_safety_training_number(p_category text)
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
  if p_category not in ('general', 'fire', 'work_at_height', 'ramp_loading') then
    raise exception 'Invalid training category';
  end if;

  insert into public.safety_training_counters (training_year, category, last_number)
  values (current_year, p_category, 1)
  on conflict (training_year, category)
  do update set last_number = public.safety_training_counters.last_number + 1
  returning last_number into allocated;

  prefix := case p_category
    when 'general' then 'TR-G-'
    when 'fire' then 'TR-F-'
    when 'ramp_loading' then 'TR-R-'
    else 'TR-H-'
  end;
  return prefix || current_year || '-' || lpad(allocated::text, 3, '0');
end;
$$;

revoke all on function public.allocate_safety_training_number(text) from public, anon;
grant execute on function public.allocate_safety_training_number(text) to authenticated;

comment on column public.safety_training_sessions.form_details is
  'Category-specific form fields, including height/general training details and SOL-FORM-001 ramp loading fields.';
comment on column public.safety_training_participants.personal_details is
  'Personal fields for work-at-height confirmations and SOL-FORM-001 ramp employee forms.';
