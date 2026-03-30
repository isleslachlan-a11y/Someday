-- ============================================================
-- Migration 003: profile bio + bucket list privacy
-- ============================================================

-- Add bio field to users
alter table public.users
  add column if not exists bio text;

-- Add is_public flag to bucket_list_items (default: public)
alter table public.bucket_list_items
  add column if not exists is_public boolean not null default true;

-- Allow any authenticated user to read public bucket list items
-- (powers public profiles — combined with existing owner policy via OR)
create policy "Public bucket list items are readable by authenticated users"
  on public.bucket_list_items for select
  to authenticated
  using (is_public = true);
