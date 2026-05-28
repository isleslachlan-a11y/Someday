-- Migration: seed_onboarding_affinity
-- Creates categories lookup, user affinity tables, and SQL functions for
-- seeding recommendation signal from onboarding answers.
-- Idempotent: CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE FUNCTION.

-- ─── 1. Categories lookup table ──────────────────────────────────────────────
-- Predefined category taxonomy used by the recommendation engine.

CREATE TABLE IF NOT EXISTS public.categories (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE
);

INSERT INTO public.categories (name, slug) VALUES
  ('Adventure Sport',    'adventure-sport'),
  ('Nature & Wilderness','nature-wilderness'),
  ('Culture & History',  'culture-history'),
  ('City Escapes',       'city-escapes'),
  ('Food & Drink',       'food-drink'),
  ('Wellness Retreat',   'wellness-retreat'),
  ('Hidden Gems',        'hidden-gems'),
  ('Events & Festivals', 'events-festivals')
ON CONFLICT (slug) DO NOTHING;

-- ─── 2. User affinity tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_tag_affinity (
  user_id    uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  tag_id     uuid        NOT NULL REFERENCES public.tags(id)       ON DELETE CASCADE,
  score      float       NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_uta_user_id ON public.user_tag_affinity(user_id);

CREATE TABLE IF NOT EXISTS public.user_category_affinity (
  user_id     uuid        NOT NULL REFERENCES public.profiles(id)    ON DELETE CASCADE,
  category_id uuid        NOT NULL REFERENCES public.categories(id)  ON DELETE CASCADE,
  score       float       NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 1),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_uca_user_id ON public.user_category_affinity(user_id);

-- RLS: users read their own rows; writes via SECURITY DEFINER functions only.
ALTER TABLE public.user_tag_affinity      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_category_affinity ENABLE ROW LEVEL SECURITY;

DO $policy$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_tag_affinity' AND policyname = 'uta_own_read'
  ) THEN
    CREATE POLICY uta_own_read ON public.user_tag_affinity
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_category_affinity' AND policyname = 'uca_own_read'
  ) THEN
    CREATE POLICY uca_own_read ON public.user_category_affinity
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $policy$;

-- ─── 3. seed_onboarding_affinity ─────────────────────────────────────────────
-- Seeds user_tag_affinity and user_category_affinity from onboarding answers.
-- Called after completeOnboarding writes user_context and bucket_list_items.
-- Safe to call multiple times — always starts with a clean slate for this user.

CREATE OR REPLACE FUNCTION public.seed_onboarding_affinity(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_travel_style text[];
  v_budget       text;
  v_comfort      text;
BEGIN

  -- Read onboarding answers from user_context
  SELECT travel_style, budget_range, comfort_zone
  INTO v_travel_style, v_budget, v_comfort
  FROM user_context
  WHERE user_id = p_user_id;

  -- ── 1. Clean slate ─────────────────────────────────────────────────────────
  DELETE FROM user_tag_affinity      WHERE user_id = p_user_id;
  DELETE FROM user_category_affinity WHERE user_id = p_user_id;

  -- ── 2. Seed user_category_affinity from selected places ────────────────────
  -- Maps places.type → category slug since there is no place_categories join table.
  WITH type_counts AS (
    SELECT
      CASE p.type
        WHEN 'city'       THEN 'city-escapes'
        WHEN 'nature'     THEN 'nature-wilderness'
        WHEN 'experience' THEN 'adventure-sport'
        WHEN 'food'       THEN 'food-drink'
      END AS cat_slug,
      COUNT(*) AS cnt
    FROM bucket_list_items bli
    JOIN places p ON p.id = bli.place_id
    WHERE bli.user_id = p_user_id
      AND p.type IS NOT NULL
    GROUP BY p.type
  ),
  max_count AS (
    SELECT COALESCE(MAX(cnt), 1) AS max_cnt FROM type_counts
  )
  INSERT INTO user_category_affinity (user_id, category_id, score)
  SELECT p_user_id, c.id, LEAST(1.0, tc.cnt::float / mc.max_cnt)
  FROM type_counts tc, max_count mc
  JOIN categories c ON c.slug = tc.cat_slug
  WHERE tc.cat_slug IS NOT NULL
  ON CONFLICT (user_id, category_id) DO UPDATE
    SET score = EXCLUDED.score, updated_at = now();

  -- ── 3. Seed user_tag_affinity from selected places via place_tags ──────────
  WITH tag_counts AS (
    SELECT pt.tag_id, COUNT(*) AS cnt
    FROM bucket_list_items bli
    JOIN place_tags pt ON pt.place_id = bli.place_id
    WHERE bli.user_id = p_user_id
    GROUP BY pt.tag_id
  ),
  max_count AS (
    SELECT COALESCE(MAX(cnt), 1) AS max_cnt FROM tag_counts
  )
  INSERT INTO user_tag_affinity (user_id, tag_id, score)
  SELECT p_user_id, tc.tag_id, LEAST(1.0, tc.cnt::float / mc.max_cnt)
  FROM tag_counts tc, max_count mc
  ON CONFLICT (user_id, tag_id) DO UPDATE
    SET score = EXCLUDED.score, updated_at = now();

  -- ── 4. Boost tag affinity from travel style ────────────────────────────────
  WITH style_tag_boosts (style, slug, boost) AS (
    VALUES
      ('Adventure Seeker',     'adrenaline',   0.6::float),
      ('Adventure Seeker',     'hiking',        0.5::float),
      ('Adventure Seeker',     'climbing',      0.5::float),
      ('Adventure Seeker',     'camping',       0.4::float),
      ('Culture Lover',        'history',       0.6::float),
      ('Culture Lover',        'art',           0.5::float),
      ('Culture Lover',        'museums',       0.5::float),
      ('Culture Lover',        'medieval',      0.4::float),
      ('Culture Lover',        'ancient-town',  0.4::float),
      ('Food Obsessed',        'food',          0.7::float),
      ('Food Obsessed',        'markets',       0.5::float),
      ('Food Obsessed',        'nightlife',     0.3::float),
      ('Beach Bum',            'beaches',       0.7::float),
      ('Beach Bum',            'ocean',         0.6::float),
      ('Beach Bum',            'coastal',       0.5::float),
      ('Beach Bum',            'diving',        0.4::float),
      ('City Explorer',        'nightlife',     0.5::float),
      ('City Explorer',        'art',           0.4::float),
      ('City Explorer',        'markets',       0.4::float),
      ('Off the Beaten Track', 'remote',        0.7::float),
      ('Off the Beaten Track', 'hiking',        0.4::float),
      ('Off the Beaten Track', 'camping',       0.4::float),
      ('Wellness Focused',     'hot-springs',   0.6::float),
      ('Wellness Focused',     'rainforest',    0.4::float),
      ('Wellness Focused',     'mountains',     0.3::float),
      ('Party Starter',        'nightlife',     0.7::float),
      ('Party Starter',        'bar-crawl',     0.6::float),
      ('Party Starter',        'carnival',      0.4::float)
  ),
  applicable AS (
    SELECT slug, SUM(boost) AS total_boost
    FROM style_tag_boosts
    WHERE style = ANY(v_travel_style)
    GROUP BY slug
  )
  INSERT INTO user_tag_affinity (user_id, tag_id, score)
  SELECT p_user_id, t.id, LEAST(1.0, a.total_boost)
  FROM applicable a
  JOIN tags t ON t.slug = a.slug
  ON CONFLICT (user_id, tag_id) DO UPDATE
    SET score      = LEAST(1.0, user_tag_affinity.score + EXCLUDED.score),
        updated_at = now();

  -- ── 5. Boost category affinity from travel style ───────────────────────────
  WITH style_cat_boosts (style, slug, boost) AS (
    VALUES
      ('Adventure Seeker',     'adventure-sport',   0.6::float),
      ('Adventure Seeker',     'nature-wilderness',  0.4::float),
      ('Culture Lover',        'culture-history',    0.7::float),
      ('Culture Lover',        'city-escapes',       0.3::float),
      ('Food Obsessed',        'food-drink',         0.8::float),
      ('Beach Bum',            'nature-wilderness',  0.6::float),
      ('City Explorer',        'city-escapes',       0.6::float),
      ('Off the Beaten Track', 'nature-wilderness',  0.6::float),
      ('Off the Beaten Track', 'hidden-gems',        0.5::float),
      ('Wellness Focused',     'wellness-retreat',   0.7::float),
      ('Wellness Focused',     'nature-wilderness',  0.4::float),
      ('Party Starter',        'city-escapes',       0.4::float),
      ('Party Starter',        'events-festivals',   0.6::float)
  ),
  applicable AS (
    SELECT slug, SUM(boost) AS total_boost
    FROM style_cat_boosts
    WHERE style = ANY(v_travel_style)
    GROUP BY slug
  )
  INSERT INTO user_category_affinity (user_id, category_id, score)
  SELECT p_user_id, c.id, LEAST(1.0, a.total_boost)
  FROM applicable a
  JOIN categories c ON c.slug = a.slug
  ON CONFLICT (user_id, category_id) DO UPDATE
    SET score      = LEAST(1.0, user_category_affinity.score + EXCLUDED.score),
        updated_at = now();

  -- ── 6. Boost category affinity from budget ─────────────────────────────────
  IF v_budget = 'luxury' THEN
    INSERT INTO user_category_affinity (user_id, category_id, score)
    SELECT p_user_id, c.id, 0.2::float
    FROM categories c
    WHERE c.slug IN ('wellness-retreat', 'food-drink')
    ON CONFLICT (user_id, category_id) DO UPDATE
      SET score      = LEAST(1.0, user_category_affinity.score + 0.2),
          updated_at = now();
  ELSIF v_budget = 'budget' THEN
    INSERT INTO user_category_affinity (user_id, category_id, score)
    SELECT p_user_id, c.id,
      CASE c.slug WHEN 'hidden-gems' THEN 0.2::float ELSE 0.1::float END
    FROM categories c
    WHERE c.slug IN ('hidden-gems', 'adventure-sport')
    ON CONFLICT (user_id, category_id) DO UPDATE
      SET score      = LEAST(1.0, user_category_affinity.score + EXCLUDED.score),
          updated_at = now();
  END IF;

  -- ── 7. Boost/reduce tag affinity from comfort zone ─────────────────────────
  IF v_comfort = 'high' THEN
    INSERT INTO user_tag_affinity (user_id, tag_id, score)
    SELECT p_user_id, t.id,
      CASE t.slug WHEN 'adrenaline' THEN 0.3::float ELSE 0.2::float END
    FROM tags t
    WHERE t.slug IN ('adrenaline', 'climbing', 'remote')
    ON CONFLICT (user_id, tag_id) DO UPDATE
      SET score      = LEAST(1.0, user_tag_affinity.score + EXCLUDED.score),
          updated_at = now();
  ELSIF v_comfort = 'low' THEN
    UPDATE user_tag_affinity uta
    SET score = GREATEST(0.0, uta.score - 0.1), updated_at = now()
    FROM tags t
    WHERE t.slug = 'beaches'
      AND uta.tag_id = t.id
      AND uta.user_id = p_user_id;
  END IF;

  -- ── Final clamp: scores must remain in [0.0, 1.0] ─────────────────────────
  UPDATE user_tag_affinity
  SET score = LEAST(1.0, GREATEST(0.0, score)), updated_at = now()
  WHERE user_id = p_user_id;

  UPDATE user_category_affinity
  SET score = LEAST(1.0, GREATEST(0.0, score)), updated_at = now()
  WHERE user_id = p_user_id;

END;
$$;

-- ─── 4. get_onboarding_places ─────────────────────────────────────────────────
-- Returns up to 12 places spread across all four types (≤3 per type) so the
-- user sees variety in step 8 and their selections produce meaningful signal.
-- Called from app/onboarding/page.tsx via supabase.rpc().

CREATE OR REPLACE FUNCTION public.get_onboarding_places()
RETURNS TABLE (
  id            uuid,
  name          text,
  country       text,
  type          text,
  image_keyword text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    (SELECT id, name, country, type, image_keyword FROM places WHERE type = 'city'       ORDER BY popularity DESC LIMIT 3)
    UNION ALL
    (SELECT id, name, country, type, image_keyword FROM places WHERE type = 'nature'     ORDER BY popularity DESC LIMIT 3)
    UNION ALL
    (SELECT id, name, country, type, image_keyword FROM places WHERE type = 'experience' ORDER BY popularity DESC LIMIT 3)
    UNION ALL
    (SELECT id, name, country, type, image_keyword FROM places WHERE type = 'food'       ORDER BY popularity DESC LIMIT 3)
  ) combined
  ORDER BY random()
  LIMIT 12;
$$;

COMMENT ON FUNCTION public.seed_onboarding_affinity(uuid) IS
  'Seeds user_tag_affinity and user_category_affinity from onboarding answers. Safe to call multiple times (deletes and re-seeds).';

COMMENT ON FUNCTION public.get_onboarding_places() IS
  'Returns up to 12 places spread across types (city/nature/experience/food) for the onboarding place-picker step.';
