-- ============================================================
-- Someday — full database schema
-- Run via: supabase db push  OR  paste into Supabase SQL editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- users
-- Public-facing profile data extending auth.users
-- ============================================================
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  username    text unique not null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Auto-create a users row when someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.users enable row level security;

create policy "Users are publicly readable"
  on public.users for select
  using (true);

create policy "Users can update their own row"
  on public.users for update
  using (auth.uid() = id);

-- ============================================================
-- bucket_list_items
-- A user's personal bucket list destinations
-- ============================================================
create table if not exists public.bucket_list_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  destination_name text not null,
  country          text not null,
  region           text,
  category         text not null,          -- e.g. 'Adventure', 'Food & Drink', 'Culture'
  notes            text,
  status           text not null default 'want'
                     check (status in ('want', 'visited')),
  priority         integer not null default 3
                     check (priority between 1 and 5),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Keep updated_at current automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bucket_list_items_updated_at on public.bucket_list_items;
create trigger bucket_list_items_updated_at
  before update on public.bucket_list_items
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.bucket_list_items enable row level security;

create policy "Users can manage their own bucket list"
  on public.bucket_list_items for all
  using (auth.uid() = user_id);

-- ============================================================
-- events
-- Every meaningful user action — the B2B data product
-- ============================================================
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users (id) on delete set null,
  event_type   text not null,
  metadata     jsonb not null default '{}',
  session_id   text,
  platform     text not null default 'web',   -- web | ios | android
  app_version  text not null default '0.1.0',
  country_code text,                           -- 2-letter ISO from browser locale
  created_at   timestamptz not null default now()
);

-- RLS — authenticated users can insert only; reads go through service role
alter table public.events enable row level security;

create policy "Authenticated users can insert events"
  on public.events for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ============================================================
-- Migration: add platform context columns to events
-- Run this against existing databases that were created before
-- the platform/app_version/country_code columns were added.
-- ============================================================
alter table public.events
  add column if not exists platform     text not null default 'web',
  add column if not exists app_version  text not null default '0.1.0',
  add column if not exists country_code text;
