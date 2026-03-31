-- ============================================================
-- Migration 004: add platform context columns to events
-- ============================================================
alter table public.events
  add column if not exists platform     text not null default 'web',
  add column if not exists app_version  text not null default '0.1.0',
  add column if not exists country_code text;
