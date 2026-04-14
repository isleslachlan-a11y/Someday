-- ============================================================
-- Migration: trips schema
-- Date: 2026-04-14
--
-- What this migration does:
--   1. Creates `trips`            — group trip planning objects
--   2. Creates `trip_items`       — places added to a trip
--   3. Creates `trip_item_votes`  — 👍/👎 votes on trip items
--   4. Enables RLS on all tables
--
-- Depends on: places, profiles (from pivot_schema migration)
-- ============================================================


-- ─── 1. trips ───────────────────────────────────────────────────────────────

create table public.trips (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  description text,
  destination text,
  start_date  date,
  end_date    date,
  created_by  uuid        not null references public.profiles (id) on delete cascade,
  members     uuid[]      not null default '{}',
  icon        text        not null default '✈️',
  created_at  timestamptz not null default now()
);

comment on table  public.trips         is 'Group trip planning objects. Creator is always also in members.';
comment on column public.trips.members is 'Array of profile UUIDs who are members of this trip (includes created_by).';
comment on column public.trips.icon    is 'Emoji icon shown on trip cards, e.g. ✈️ 🏖️ 🏔️';


-- ─── 2. trip_items ──────────────────────────────────────────────────────────

create table public.trip_items (
  id            uuid        primary key default gen_random_uuid(),
  trip_id       uuid        not null references public.trips (id) on delete cascade,
  place_id      uuid        not null references public.places (id) on delete cascade,
  proposed_date date,
  added_by      uuid        not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (trip_id, place_id)
);

comment on table  public.trip_items               is 'Places proposed for a trip.';
comment on column public.trip_items.proposed_date is 'Optional suggested date for visiting this place within the trip window.';


-- ─── 3. trip_item_votes ─────────────────────────────────────────────────────

create table public.trip_item_votes (
  id           uuid        primary key default gen_random_uuid(),
  trip_item_id uuid        not null references public.trip_items (id) on delete cascade,
  user_id      uuid        not null references public.profiles  (id) on delete cascade,
  vote         boolean     not null,
  created_at   timestamptz not null default now(),
  unique (trip_item_id, user_id)
);

comment on table  public.trip_item_votes      is 'Per-member vote on a trip item. true = 👍, false = 👎.';
comment on column public.trip_item_votes.vote is 'true = thumbs up, false = thumbs down';


-- ─── 4. Row Level Security ──────────────────────────────────────────────────

-- Helper: is the current user a member of a given trip?
-- We define this inline in each policy rather than a function to avoid
-- function ownership issues in migrations.

-- trips: read/write for trip members; insert for authenticated users
alter table public.trips enable row level security;

create policy "trips_member_select"
  on public.trips for select
  to authenticated
  using (created_by = auth.uid() or auth.uid() = any(members));

create policy "trips_owner_insert"
  on public.trips for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "trips_owner_update"
  on public.trips for update
  to authenticated
  using (created_by = auth.uid());

create policy "trips_owner_delete"
  on public.trips for delete
  to authenticated
  using (created_by = auth.uid());


-- trip_items: readable/writable by trip members
alter table public.trip_items enable row level security;

create policy "trip_items_member_select"
  on public.trip_items for select
  to authenticated
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id
        and (t.created_by = auth.uid() or auth.uid() = any(t.members))
    )
  );

create policy "trip_items_member_insert"
  on public.trip_items for insert
  to authenticated
  with check (
    added_by = auth.uid() and
    exists (
      select 1 from public.trips t
      where t.id = trip_id
        and (t.created_by = auth.uid() or auth.uid() = any(t.members))
    )
  );

create policy "trip_items_member_delete"
  on public.trip_items for delete
  to authenticated
  using (added_by = auth.uid());


-- trip_item_votes: readable/writable by trip members; one vote per user per item
alter table public.trip_item_votes enable row level security;

create policy "trip_item_votes_member_select"
  on public.trip_item_votes for select
  to authenticated
  using (
    exists (
      select 1 from public.trip_items ti
      join public.trips t on t.id = ti.trip_id
      where ti.id = trip_item_id
        and (t.created_by = auth.uid() or auth.uid() = any(t.members))
    )
  );

create policy "trip_item_votes_member_insert"
  on public.trip_item_votes for insert
  to authenticated
  with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.trip_items ti
      join public.trips t on t.id = ti.trip_id
      where ti.id = trip_item_id
        and (t.created_by = auth.uid() or auth.uid() = any(t.members))
    )
  );

create policy "trip_item_votes_member_update"
  on public.trip_item_votes for update
  to authenticated
  using (user_id = auth.uid());

create policy "trip_item_votes_member_delete"
  on public.trip_item_votes for delete
  to authenticated
  using (user_id = auth.uid());
