-- ============================================================
-- Migration: pivot schema
-- Date: 2026-04-14
--
-- What this migration does:
--   1. Creates `places`          — curated destination catalogue
--   2. Replaces `bucket_list_items` — pivoted from freeform/experience_id
--                                    to places-referenced schema
--   3. Creates `submissions`     — user-submitted place nominations
--   4. Creates `user_context`    — onboarding + AI personalisation data
--   5. Creates `past_trips`      — self-reported travel history
--   6. Enables RLS on all new tables
--   7. Seeds `places` (paste rows below)
--
-- WARNING: step 2 DROPs the existing bucket_list_items table.
--   All existing rows will be lost. Run only when safe to do so.
-- ============================================================


-- ─── 1. places ──────────────────────────────────────────────────────────────

create table public.places (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  country       text,
  region        text        check (region in ('Asia', 'Europe', 'Americas', 'Africa', 'Oceania', 'Global')),
  type          text        check (type   in ('city', 'nature', 'experience', 'food')),
  description   text,
  tags          text[],
  vibes         text[]      check (vibes  <@ array['Adventure','Culture','Foodie','Romantic','Chill','Epic','Peaceful','Wellness']::text[]),
  intensity     text        check (intensity in ('low', 'medium', 'high')),
  popularity    integer     check (popularity between 0 and 100),
  trending      boolean     not null default false,
  image_url     text,
  image_keyword text,
  created_at    timestamptz not null default now()
);

comment on table  public.places                is 'Curated catalogue of travel destinations and experiences. Admin-seeded only.';
comment on column public.places.vibes         is 'Mood/vibe tags: Adventure, Culture, Foodie, Romantic, Chill, Epic, Peaceful, Wellness';
comment on column public.places.intensity     is 'Physical/logistical effort required: low, medium, high';
comment on column public.places.image_keyword is 'Keyword passed to image provider (e.g. Unsplash) if image_url is not set';


-- ─── 2. bucket_list_items (pivot: replaces old freeform schema) ─────────────
--
-- The old table used: experience_id, destination_name, country, region,
-- category, priority, photo_url, public, status ('want'|'visited').
-- The new table is keyed to places.id and uses status ('wishlist'|'planning'|'completed').
--
-- CASCADE drops dependent policies and indexes automatically.

drop table if exists public.bucket_list_items cascade;

create table public.bucket_list_items (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  place_id    uuid        not null references public.places   (id) on delete cascade,
  added_at    timestamptz not null default now(),
  target_date date,
  notes       text,
  status      text        not null default 'wishlist'
                          check (status in ('wishlist', 'planning', 'completed'))
);

comment on table  public.bucket_list_items        is 'A user''s personal bucket list — each row links a user to a place.';
comment on column public.bucket_list_items.status is 'wishlist = saved, planning = actively organising, completed = been there';


-- ─── 3. submissions ─────────────────────────────────────────────────────────

create table public.submissions (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles (id) on delete cascade,
  name           text        not null,
  country        text,
  region         text,
  type           text,
  description    text,
  tags           text[],
  image_url      text,
  status         text        not null default 'pending'
                             check (status in ('pending', 'approved', 'rejected')),
  submitted_at   timestamptz not null default now(),
  reviewed_at    timestamptz,
  reviewer_notes text
);

comment on table  public.submissions        is 'User-submitted place nominations awaiting admin review.';
comment on column public.submissions.status is 'pending → approved (promoted to places) or rejected';


-- ─── 4. user_context ────────────────────────────────────────────────────────

create table public.user_context (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        not null unique references public.profiles (id) on delete cascade,
  travel_style            text[],
  comfort_zone            text        check (comfort_zone      in ('low', 'medium', 'high')),
  budget_range            text        check (budget_range      in ('budget', 'mid', 'luxury')),
  travel_frequency        text        check (travel_frequency  in ('rarely', 'sometimes', 'often')),
  group_preference        text        check (group_preference  in ('solo', 'partner', 'friends', 'family', 'mixed')),
  completed_onboarding    boolean     not null default false,
  onboarding_completed_at timestamptz,
  updated_at              timestamptz not null default now()
);

comment on table  public.user_context               is 'Onboarding answers — drives AI personalisation and B2B segmentation.';
comment on column public.user_context.travel_style  is 'Free-form style tags collected during onboarding e.g. adventure, budget, solo';


-- ─── 5. past_trips ──────────────────────────────────────────────────────────

create table public.past_trips (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  place_id   uuid        references public.places (id) on delete set null,
  place_name text,
  country    text,
  year       integer,
  notes      text,
  created_at timestamptz not null default now()
);

comment on table  public.past_trips            is 'Self-reported travel history. place_id is nullable for freeform destinations not yet in the places catalogue.';
comment on column public.past_trips.place_name is 'Freeform destination name — used when place_id is null';


-- ─── 6. Row Level Security ──────────────────────────────────────────────────

-- places: public read; no user writes (admin uses service-role client)
alter table public.places enable row level security;

create policy "places_public_read"
  on public.places for select
  using (true);


-- bucket_list_items: private — owner only
alter table public.bucket_list_items enable row level security;

create policy "bucket_list_items_owner_select"
  on public.bucket_list_items for select
  to authenticated
  using (user_id = auth.uid());

create policy "bucket_list_items_owner_insert"
  on public.bucket_list_items for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "bucket_list_items_owner_update"
  on public.bucket_list_items for update
  to authenticated
  using (user_id = auth.uid());

create policy "bucket_list_items_owner_delete"
  on public.bucket_list_items for delete
  to authenticated
  using (user_id = auth.uid());


-- submissions: users can insert and read their own; admin reviews via service role
alter table public.submissions enable row level security;

create policy "submissions_owner_select"
  on public.submissions for select
  to authenticated
  using (user_id = auth.uid());

create policy "submissions_owner_insert"
  on public.submissions for insert
  to authenticated
  with check (user_id = auth.uid());

-- Intentionally no UPDATE/DELETE policies for users:
-- status transitions (pending → approved/rejected) are performed by the
-- admin via the service-role client in lib/supabase/admin.ts


-- user_context: private — owner only
alter table public.user_context enable row level security;

create policy "user_context_owner_select"
  on public.user_context for select
  to authenticated
  using (user_id = auth.uid());

create policy "user_context_owner_insert"
  on public.user_context for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "user_context_owner_update"
  on public.user_context for update
  to authenticated
  using (user_id = auth.uid());


-- past_trips: private — owner only
alter table public.past_trips enable row level security;

create policy "past_trips_owner_select"
  on public.past_trips for select
  to authenticated
  using (user_id = auth.uid());

create policy "past_trips_owner_insert"
  on public.past_trips for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "past_trips_owner_update"
  on public.past_trips for update
  to authenticated
  using (user_id = auth.uid());

create policy "past_trips_owner_delete"
  on public.past_trips for delete
  to authenticated
  using (user_id = auth.uid());


-- ─── 7. Seed: places ────────────────────────────────────────────────────────
-- Paste your 37 seed rows here. Column order:
--   name, country, region, type, description, tags, vibes,
--   intensity, popularity, trending, image_keyword
--
-- vibes must only contain values from:
--   Adventure, Culture, Foodie, Romantic, Chill, Epic, Peaceful, Wellness
--
-- region must be one of:
--   Asia, Europe, Americas, Africa, Oceania, Global
--
-- type must be one of:
--   city, nature, experience, food

insert into public.places
  (name, country, region, type, description, tags, vibes, intensity, popularity, trending, image_keyword)
values
  -- PASTE YOUR 37 ROWS HERE, e.g.:
     ('Kyoto', 'Japan', 'Asia', 'city', 'Ancient temples and bamboo groves.', '{"temples","culture","zen"}', '{"Culture","Peaceful"}', 'low', 85, false, 'kyoto japan'),
     ('Patagonia', 'Argentina', 'Americas', 'nature', 'End-of-the-world landscapes.', '{"hiking","remote","glaciers"}', '{"Adventure","Epic"}', 'high', 78, true, 'patagonia mountains'),
     ('Marrakech', 'Morocco', 'Africa', 'city', 'Vibrant souks and palaces.', '{"markets","culture","desert"}', '{"Culture","Adventure"}', 'medium', 80, false, 'marrakech morocco'),
     ('Santorini', 'Greece', 'Europe', 'nature', 'Iconic white buildings and sunsets.', '{"island","beaches","romantic"}', '{"Romantic","Chill"}', 'low', 90, true, 'santorini greece')
;
