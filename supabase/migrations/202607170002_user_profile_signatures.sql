-- Personal issuer details used to prefill every new safety report.
alter table public.profiles
  add column if not exists job_title text,
  add column if not exists phone text,
  add column if not exists signature_data_url text,
  add column if not exists stamp_data_url text;

alter table public.safety_audit_reports
  add column if not exists auditor_stamp_url text,
  add column if not exists auditor_phone text;

-- Users may edit only their own professional fields. Role and activation
-- remain controlled by the admin-only profiles policy.
create or replace function public.update_own_safety_profile(
  profile_full_name text,
  profile_job_title text,
  profile_phone text,
  profile_signature_data_url text,
  profile_stamp_data_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    full_name = nullif(trim(profile_full_name), ''),
    job_title = nullif(trim(profile_job_title), ''),
    phone = nullif(trim(profile_phone), ''),
    signature_data_url = profile_signature_data_url,
    stamp_data_url = profile_stamp_data_url,
    updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke all on function public.update_own_safety_profile(text, text, text, text, text) from public;
grant execute on function public.update_own_safety_profile(text, text, text, text, text) to authenticated;
