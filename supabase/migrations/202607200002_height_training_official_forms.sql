-- Additional fields required by the supplied work-at-height attendance sheet
-- and individual employee training confirmation.

alter table public.safety_training_sessions
  add column if not exists form_details jsonb not null default '{}'::jsonb;

alter table public.safety_training_participants
  add column if not exists personal_details jsonb not null default '{}'::jsonb;

alter table public.safety_training_sessions
  drop constraint if exists safety_training_sessions_form_details_size;
alter table public.safety_training_sessions
  add constraint safety_training_sessions_form_details_size
  check (octet_length(form_details::text) <= 1500000);

comment on column public.safety_training_sessions.form_details is
  'Category-specific form fields, including height-training company, instructor, validity, translator and selected-topic details.';
comment on column public.safety_training_participants.personal_details is
  'Personal fields required for individual work-at-height confirmations.';
