ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS state_province text;

COMMENT ON COLUMN public.places.state_province IS
  'State, province or administrative region e.g. Queensland, Tuscany';
