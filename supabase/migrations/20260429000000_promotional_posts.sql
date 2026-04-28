-- ── promotional_posts ─────────────────────────────────────────────────────────
-- Admin-created editorial content surfaced in the home feed.
-- No user writes — inserts happen via service role only.

create table public.promotional_posts (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  body        text,
  image_url   text,
  cta_label   text,
  cta_url     text,
  place_id    uuid        references public.places(id),
  active      boolean     not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- RLS: public read for active, in-window posts; no user writes
alter table public.promotional_posts enable row level security;

create policy "promotional_posts_public_read"
  on public.promotional_posts
  for select
  using (
    active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >= now())
  );

-- ── Seed data ─────────────────────────────────────────────────────────────────
insert into public.promotional_posts (title, body, cta_label, cta_url) values
(
  'Bali before everyone else gets there.',
  'Travel in 2026 is going to look different. Book your Bali trip now while the hidden corners are still hidden — and while flights are still human.',
  'Explore Bali',
  '/list/new'
),
(
  'Japan in spring is a different planet.',
  'Cherry blossom season sells out faster every year. If Japan is on your Someday list, this is the year to stop procrastinating.',
  'Plan your Japan trip',
  '/plan'
);
