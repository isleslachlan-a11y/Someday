-- ─────────────────────────────────────────────────────────────────────────────
-- Formalise destination / experience type distinction
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1a. parent_place_id on places ────────────────────────────────────────────

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS parent_place_id uuid
    REFERENCES public.places(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.places.parent_place_id IS
  'For experience type places: the destination they belong to. NULL for destination type places.';

CREATE INDEX IF NOT EXISTS idx_places_parent
  ON public.places(parent_place_id)
  WHERE parent_place_id IS NOT NULL;

-- ── Extra per-experience fields on places ────────────────────────────────────

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS duration text,
  ADD COLUMN IF NOT EXISTS needs_booking boolean DEFAULT false;

-- ── 1b. Submissions additions ────────────────────────────────────────────────

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS parent_place_id uuid
    REFERENCES public.places(id) ON DELETE SET NULL;

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS submission_kind text
    CHECK (submission_kind IN ('destination', 'experience'))
    DEFAULT 'destination';

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS extra_metadata jsonb DEFAULT '{}';

-- ── 1c. Migrate type values in places ────────────────────────────────────────

UPDATE public.places
  SET type = 'destination'
  WHERE type IN ('city', 'nature');

UPDATE public.places
  SET type = 'experience'
  WHERE type IN ('experience', 'food');

-- ── 1c. Migrate type values in submissions ───────────────────────────────────

UPDATE public.submissions
  SET type = 'destination'
  WHERE type IN ('city', 'nature');

UPDATE public.submissions
  SET type = 'experience',
      submission_kind = 'experience'
  WHERE type IN ('experience', 'food');

UPDATE public.submissions
  SET submission_kind = 'destination'
  WHERE submission_kind IS NULL;

-- ── 1d. Auto-assign parent_place_id for existing experience places ────────────

UPDATE public.places exp
SET parent_place_id = dest.id
FROM public.places dest
WHERE exp.type = 'experience'
  AND exp.parent_place_id IS NULL
  AND dest.type = 'destination'
  AND dest.country = exp.country
  AND dest.id != exp.id
  AND dest.id = (
    SELECT id FROM public.places
    WHERE type = 'destination'
      AND country = exp.country
    ORDER BY popularity DESC
    LIMIT 1
  );

-- ── 1e. Type constraint ───────────────────────────────────────────────────────

ALTER TABLE public.places
  DROP CONSTRAINT IF EXISTS places_type_check;

ALTER TABLE public.places
  ADD CONSTRAINT places_type_check
    CHECK (type IN ('destination', 'experience'));

-- ── 1f. Update experiences_categories comment ─────────────────────────────────

COMMENT ON TABLE public.experiences_categories IS
  'Maps places (both destination and experience types) to categories.
   experience_id references places.id despite the name.';
