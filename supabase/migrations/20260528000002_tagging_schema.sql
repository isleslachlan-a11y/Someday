-- Migration: place tagging schema
-- Creates experiences_categories, experiences_tags, experiences_labels, place_labels.
-- Adds icon and sort_order to the existing categories table.
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS.

-- ─── Extend categories table ──────────────────────────────────────────────────

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon       text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE public.categories SET
  icon       = CASE slug
    WHEN 'adventure-sport'   THEN '🏃'
    WHEN 'nature-wilderness' THEN '🌿'
    WHEN 'culture-history'   THEN '🏛'
    WHEN 'city-escapes'      THEN '🏙'
    WHEN 'food-drink'        THEN '🍜'
    WHEN 'wellness-retreat'  THEN '🧘'
    WHEN 'hidden-gems'       THEN '💎'
    WHEN 'events-festivals'  THEN '🎉'
    ELSE icon
  END,
  sort_order = CASE slug
    WHEN 'adventure-sport'   THEN 1
    WHEN 'nature-wilderness' THEN 2
    WHEN 'culture-history'   THEN 3
    WHEN 'city-escapes'      THEN 4
    WHEN 'food-drink'        THEN 5
    WHEN 'wellness-retreat'  THEN 6
    WHEN 'hidden-gems'       THEN 7
    WHEN 'events-festivals'  THEN 8
    ELSE sort_order
  END
WHERE slug IN ('adventure-sport','nature-wilderness','culture-history','city-escapes',
               'food-drink','wellness-retreat','hidden-gems','events-festivals');

-- ─── place_labels lookup table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.place_labels (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL
);

INSERT INTO public.place_labels (name, slug) VALUES
  ('UNESCO World Heritage', 'unesco-world-heritage'),
  ('Michelin Starred',      'michelin-starred'),
  ('Bucket List Classic',   'bucket-list-classic'),
  ('Instagram Famous',      'instagram-famous'),
  ('Hidden Gem',            'hidden-gem'),
  ('Family Friendly',       'family-friendly'),
  ('Eco-Friendly',          'eco-friendly'),
  ('Luxury',                'luxury'),
  ('Budget Friendly',       'budget-friendly'),
  ('Party Destination',     'party-destination'),
  ('Spiritual Site',        'spiritual-site'),
  ('Off the Beaten Track',  'off-the-beaten-track')
ON CONFLICT (slug) DO NOTHING;

-- ─── experiences_categories join table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.experiences_categories (
  experience_id uuid    NOT NULL REFERENCES public.places(id)     ON DELETE CASCADE,
  category_id   uuid    NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_primary    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (experience_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_ec_experience ON public.experiences_categories(experience_id);
CREATE INDEX IF NOT EXISTS idx_ec_category   ON public.experiences_categories(category_id);

-- ─── experiences_tags join table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.experiences_tags (
  experience_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  tag_id        uuid NOT NULL REFERENCES public.tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (experience_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_et_experience ON public.experiences_tags(experience_id);
CREATE INDEX IF NOT EXISTS idx_et_tag        ON public.experiences_tags(tag_id);

-- ─── experiences_labels join table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.experiences_labels (
  experience_id uuid NOT NULL REFERENCES public.places(id)       ON DELETE CASCADE,
  label_id      uuid NOT NULL REFERENCES public.place_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (experience_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_el_experience ON public.experiences_labels(experience_id);

-- ─── RLS: admin write, public read ───────────────────────────────────────────

ALTER TABLE public.place_labels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences_labels     ENABLE ROW LEVEL SECURITY;

DO $policy$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='place_labels' AND policyname='place_labels_public_read') THEN
    CREATE POLICY place_labels_public_read ON public.place_labels FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='experiences_categories' AND policyname='ec_public_read') THEN
    CREATE POLICY ec_public_read ON public.experiences_categories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='experiences_tags' AND policyname='et_public_read') THEN
    CREATE POLICY et_public_read ON public.experiences_tags FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='experiences_labels' AND policyname='el_public_read') THEN
    CREATE POLICY el_public_read ON public.experiences_labels FOR SELECT USING (true);
  END IF;

  -- Admin write policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='experiences_categories' AND policyname='ec_admin_write') THEN
    CREATE POLICY ec_admin_write ON public.experiences_categories FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='experiences_tags' AND policyname='et_admin_write') THEN
    CREATE POLICY et_admin_write ON public.experiences_tags FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='experiences_labels' AND policyname='el_admin_write') THEN
    CREATE POLICY el_admin_write ON public.experiences_labels FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $policy$;
