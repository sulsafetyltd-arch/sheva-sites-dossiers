-- Private identity-document photos for work-at-height training participants.
-- Files are stored in the existing private audit-files bucket; only paths and
-- document types are retained in the database.

alter table public.safety_training_participants
  add column if not exists id_document_type text,
  add column if not exists id_document_storage_path text;

alter table public.safety_training_participants
  drop constraint if exists safety_training_participants_id_document_type_check;
alter table public.safety_training_participants
  add constraint safety_training_participants_id_document_type_check
  check (id_document_type is null or id_document_type in ('id_card', 'drivers_license'));

comment on column public.safety_training_participants.id_document_storage_path is
  'Private audit-files path to an ID card or driving licence image; never a public URL.';
