-- Activities are things to do at a specific place (city, nature area etc.)
-- They appear on destination detail pages under "What to do here"
-- They are SEPARATE from place tags (which describe the place itself)

CREATE TABLE IF NOT EXISTS public.activities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id     uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  duration     text,      -- e.g. '2-3 hours', 'half day', 'full day'
  category     text,      -- e.g. 'sightseeing', 'food', 'adventure', 'culture'
  rating       numeric(2,1) CHECK (rating >= 0 AND rating <= 5),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_place_id ON public.activities(place_id);

-- RLS: readable by all authenticated users, writable only via service role
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_select" ON public.activities
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.activities IS
  'Activities/things-to-do linked to a specific place. Shown on destination detail pages.';
