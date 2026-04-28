-- ── Completion metadata on bucket_list_items ──────────────────────────────────
-- Adds three optional columns that are set when a user marks an item completed.
-- These power the friend-activity cards in the home feed.

alter table public.bucket_list_items
  add column if not exists completed_at          timestamptz,
  add column if not exists completion_note       text,
  add column if not exists completion_photo_url  text;

comment on column public.bucket_list_items.completed_at
  is 'Set to now() when status first transitions to ''completed''.';
comment on column public.bucket_list_items.completion_note
  is 'Optional note written by the user at completion time.';
comment on column public.bucket_list_items.completion_photo_url
  is 'Optional photo attached at completion time (Supabase Storage URL).';
