-- ============================================================
-- Migration: link trips to their group chat conversation
-- Date: 2026-04-21
--
-- Adds conversation_id to trips so each trip can carry a
-- reference to its linked 'trip' type conversation.
--
-- The column is nullable: existing trips have no chat until
-- one is created (auto on new trips, or on-demand for old ones).
--
-- Depends on: conversations (from messaging_schema migration)
-- ============================================================

alter table public.trips
  add column conversation_id uuid references public.conversations(id) on delete set null;

comment on column public.trips.conversation_id
  is 'FK to the linked trip group chat. Set automatically on trip creation, or on-demand for older trips.';
