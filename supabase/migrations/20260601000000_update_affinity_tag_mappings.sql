-- Migration: update_affinity_tag_mappings
-- Recreates seed_onboarding_affinity with slug mappings for the new
-- 87-tag B2B-focused taxonomy (6 dimensions: activity, landscape, vibe,
-- setting, season, food-drink). Also updates place_tags → experiences_tags.

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

  SELECT travel_style, budget_range, comfort_zone
  INTO v_travel_style, v_budget, v_comfort
  FROM user_context
  WHERE user_id = p_user_id;

  -- ── 1. Clean slate ─────────────────────────────────────────────────────────
  DELETE FROM user_tag_affinity      WHERE user_id = p_user_id;
  DELETE FROM user_category_affinity WHERE user_id = p_user_id;

  -- ── 2. Seed user_category_affinity from saved places ──────────────────────
  WITH type_counts AS (
    SELECT
      CASE p.type
        WHEN 'destination' THEN 'city-escapes'
        WHEN 'experience'  THEN 'adventure-sport'
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

  -- ── 3. Seed user_tag_affinity from saved places via experiences_tags ───────
  WITH tag_counts AS (
    SELECT et.tag_id, COUNT(*) AS cnt
    FROM bucket_list_items bli
    JOIN experiences_tags et ON et.experience_id = bli.place_id
    WHERE bli.user_id = p_user_id
    GROUP BY et.tag_id
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
      ('Adventure Seeker',     'hiking',        0.6::float),
      ('Adventure Seeker',     'climbing',      0.5::float),
      ('Adventure Seeker',     'surfing',       0.4::float),
      ('Adventure Seeker',     'adventurous',   0.6::float),
      ('Adventure Seeker',     'off-grid',      0.4::float),
      ('Culture Lover',        'cultural-tour', 0.6::float),
      ('Culture Lover',        'temple-visit',  0.5::float),
      ('Culture Lover',        'historical',    0.6::float),
      ('Culture Lover',        'ruins',         0.4::float),
      ('Culture Lover',        'old-town',      0.4::float),
      ('Food Obsessed',        'food-tour',     0.7::float),
      ('Food Obsessed',        'street-food',   0.6::float),
      ('Food Obsessed',        'fine-dining',   0.5::float),
      ('Food Obsessed',        'local-cuisine', 0.5::float),
      ('Food Obsessed',        'markets',       0.4::float),
      ('Beach Bum',            'coastal',       0.7::float),
      ('Beach Bum',            'snorkelling',   0.5::float),
      ('Beach Bum',            'diving',        0.4::float),
      ('Beach Bum',            'surfing',       0.4::float),
      ('Beach Bum',            'peaceful',      0.3::float),
      ('City Explorer',        'modern-city',   0.5::float),
      ('City Explorer',        'nightlife',     0.4::float),
      ('City Explorer',        'markets',       0.4::float),
      ('City Explorer',        'social',        0.4::float),
      ('City Explorer',        'old-town',      0.3::float),
      ('Off the Beaten Track', 'remote',        0.7::float),
      ('Off the Beaten Track', 'hidden-gem',    0.6::float),
      ('Off the Beaten Track', 'off-grid',      0.5::float),
      ('Off the Beaten Track', 'hiking',        0.4::float),
      ('Off the Beaten Track', 'adventurous',   0.4::float),
      ('Wellness Focused',     'spa-wellness',  0.7::float),
      ('Wellness Focused',     'yoga-retreat',  0.6::float),
      ('Wellness Focused',     'peaceful',      0.5::float),
      ('Wellness Focused',     'hot-springs',   0.4::float),
      ('Party Starter',        'nightlife',     0.7::float),
      ('Party Starter',        'festival',      0.6::float),
      ('Party Starter',        'social',        0.5::float),
      ('Party Starter',        'party',         0.5::float)
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
      ('Adventure Seeker',     'adventure-sport',  0.6::float),
      ('Adventure Seeker',     'nature-wilderness', 0.4::float),
      ('Culture Lover',        'culture-history',   0.7::float),
      ('Culture Lover',        'city-escapes',      0.3::float),
      ('Food Obsessed',        'food-drink',        0.8::float),
      ('Beach Bum',            'nature-wilderness', 0.6::float),
      ('City Explorer',        'city-escapes',      0.6::float),
      ('Off the Beaten Track', 'nature-wilderness', 0.6::float),
      ('Off the Beaten Track', 'hidden-gems',       0.5::float),
      ('Wellness Focused',     'wellness-retreat',  0.7::float),
      ('Wellness Focused',     'nature-wilderness', 0.4::float),
      ('Party Starter',        'city-escapes',      0.4::float),
      ('Party Starter',        'events-festivals',  0.6::float)
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

  -- ── Final clamp ────────────────────────────────────────────────────────────
  UPDATE user_tag_affinity
  SET score = LEAST(1.0, GREATEST(0.0, score)), updated_at = now()
  WHERE user_id = p_user_id;

  UPDATE user_category_affinity
  SET score = LEAST(1.0, GREATEST(0.0, score)), updated_at = now()
  WHERE user_id = p_user_id;

END;
$$;

COMMENT ON FUNCTION public.seed_onboarding_affinity(uuid) IS
  'Seeds user_tag_affinity and user_category_affinity from onboarding answers. Updated for the 87-tag taxonomy (6 dimensions). Safe to call multiple times.';
