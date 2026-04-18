-- ============================================================
-- Migration: friendships table
-- Date: 2026-04-18
--
-- Implements a symmetric friendship model (request → accept/decline/block).
-- Replaces the never-migrated follows table referenced in early code.
--
-- The follows table was referenced with graceful-degradation fallbacks
-- in list/page.tsx and overlaps.ts — those paths now use friendships.
--
-- Social graph: requester sends a request to addressee.
-- Once accepted, the friendship is bidirectional — all queries must check
-- both (requester_id = me OR addressee_id = me).
--
-- Status transitions:
--   pending → accepted   (addressee accepts)
--   pending → declined   (addressee declines — treated as 'none' in UI)
--   pending → blocked    (either party blocks)
--   accepted → blocked   (either party blocks)
-- No rows are deleted — use status = 'blocked' to prevent future requests.
-- ============================================================


-- ─── 1. friendships ──────────────────────────────────────────────────────────

create table public.friendships (
  id           uuid        primary key default gen_random_uuid(),
  requester_id uuid        not null references public.profiles (id) on delete cascade,
  addressee_id uuid        not null references public.profiles (id) on delete cascade,
  status       text        not null default 'pending'
                           check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (requester_id, addressee_id),
  -- Prevent self-friending at the DB level
  check (requester_id <> addressee_id)
);

comment on table  public.friendships              is 'Symmetric friendship graph. All queries must check both requester_id and addressee_id sides.';
comment on column public.friendships.status       is 'pending → accepted / declined / blocked. No rows are deleted; use blocked to prevent future requests.';
comment on column public.friendships.requester_id is 'The user who initiated the friend request.';
comment on column public.friendships.addressee_id is 'The user who received the friend request.';

-- Index both FK columns for efficient bidirectional lookups
create index idx_friendships_requester on public.friendships (requester_id);
create index idx_friendships_addressee on public.friendships (addressee_id);
-- Index for fast status-filtered lookups (e.g. pending requests)
create index idx_friendships_status    on public.friendships (status);


-- ─── 2. updated_at trigger ───────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger friendships_updated_at
  before update on public.friendships
  for each row execute function public.set_updated_at();


-- ─── 3. Row Level Security ───────────────────────────────────────────────────

alter table public.friendships enable row level security;

-- SELECT: either party can read their own friendships
create policy "friendships_participant_select"
  on public.friendships for select
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- INSERT: only the requester can create a request (enforced by check too)
create policy "friendships_requester_insert"
  on public.friendships for insert
  to authenticated
  with check (requester_id = auth.uid());

-- UPDATE: addressee can accept/decline; requester can cancel (set to declined)
-- Both parties can set status = 'blocked'
create policy "friendships_participant_update"
  on public.friendships for update
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- No DELETE policy — use status = 'blocked' instead
