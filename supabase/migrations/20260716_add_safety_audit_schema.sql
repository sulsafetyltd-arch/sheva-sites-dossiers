-- Safety Audit schema: reports, checklist items (jsonb), defects, defect photos
-- Idempotent guards
create table if not exists public.safety_audit_reports (
  id uuid primary key default gen_random_uuid(),
  report_number text unique,
  date date not null default now(),
  recipient text, -- 'לכבוד'
  risk_level text check (risk_level in ('low','medium','high')),
  immediate_action boolean default false,
  executive_summary text,
  site_name text,
  contractor text,
  audit_date date,
  auditor text,
  attendees text,
  site_manager text,
  work_hours text,
  workers_count int,
  work_stage text,
  status text not null default 'draft' check (status in ('draft','final')),
  site_manager_signature_url text,
  auditor_signature_url text,
  checklist jsonb, -- optional: store statuses per topic
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_safety_audit_reports_updated_at on public.safety_audit_reports;
create trigger trg_safety_audit_reports_updated_at
before update on public.safety_audit_reports
for each row execute function public.set_updated_at();

create table if not exists public.safety_audit_defects (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.safety_audit_reports(id) on delete cascade,
  checklist_topic_key text, -- optional link back to checklist topic
  description text not null,
  severity text not null check (severity in ('high','medium','low')),
  corrective_action text,
  responsible text,
  due_date date,
  sort_order int default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_safety_audit_defects_report_id on public.safety_audit_defects(report_id);

create table if not exists public.safety_audit_defect_photos (
  id uuid primary key default gen_random_uuid(),
  defect_id uuid not null references public.safety_audit_defects(id) on delete cascade,
  storage_path text not null,
  caption text,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_safety_audit_defect_photos_defect_id on public.safety_audit_defect_photos(defect_id);

-- RLS
alter table public.safety_audit_reports enable row level security;
alter table public.safety_audit_defects enable row level security;
alter table public.safety_audit_defect_photos enable row level security;

-- Permissive policies similar to existing project (tighten in prod)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'safety_audit_reports' and policyname = 'safety_audit_reports_open') then
    create policy safety_audit_reports_open on public.safety_audit_reports
      for all using (true) with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'safety_audit_defects' and policyname = 'safety_audit_defects_open') then
    create policy safety_audit_defects_open on public.safety_audit_defects
      for all using (true) with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'safety_audit_defect_photos' and policyname = 'safety_audit_defect_photos_open') then
    create policy safety_audit_defect_photos_open on public.safety_audit_defect_photos
      for all using (true) with check (true);
  end if;
end $$;

-- Storage bucket for audit files (photos, signatures if desired)
-- Reuse existing pattern: create a public bucket with permissive policies
insert into storage.buckets (id, name, public)
select 'audit-files', 'audit-files', true
where not exists (select 1 from storage.buckets where id = 'audit-files');

-- Storage RLS
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public Access Audit Files') then
    create policy "Public Access Audit Files" on storage.objects
      for select using (bucket_id = 'audit-files');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Upload Audit Files') then
    create policy "Upload Audit Files" on storage.objects
      for insert with check (bucket_id = 'audit-files');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Delete Audit Files') then
    create policy "Delete Audit Files" on storage.objects
      for delete using (bucket_id = 'audit-files');
  end if;
end $$;

