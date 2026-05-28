-- Adds momentum signal to get_recommendations_for_user.
-- New places (< 30 days old) get a decaying boost so they surface
-- in recommendations before accumulating saves.
--
-- Weight breakdown (must sum to 1.0):
--   category match  0.35
--   tag match       0.20
--   social graph    0.20
--   trending        0.10
--   momentum        0.15

CREATE OR REPLACE FUNCTION get_recommendations_for_user(
  p_user_id uuid,
  p_limit   integer DEFAULT 12
)
RETURNS TABLE (experience_id uuid, score float, recommendation_source text)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_saved_count        integer;
  v_total_cat_weight   float;
  v_total_tag_weight   float;
BEGIN
  SELECT COUNT(*) INTO v_saved_count
  FROM public.bucket_list_items
  WHERE user_id = p_user_id;

  SELECT GREATEST(1, COUNT(*)) INTO v_total_cat_weight
  FROM public.experiences_categories ec
  JOIN public.bucket_list_items bli ON bli.place_id = ec.experience_id
  WHERE bli.user_id = p_user_id AND ec.is_primary = true;

  SELECT GREATEST(1, COUNT(*)) INTO v_total_tag_weight
  FROM public.experiences_tags et
  JOIN public.bucket_list_items bli ON bli.place_id = et.experience_id
  WHERE bli.user_id = p_user_id;

  RETURN QUERY
  WITH
    saved AS (
      SELECT place_id AS experience_id
      FROM public.bucket_list_items
      WHERE user_id = p_user_id
    ),
    user_cat_weights AS (
      SELECT ec.category_id, COUNT(*)::float / v_total_cat_weight AS weight
      FROM public.experiences_categories ec
      JOIN public.bucket_list_items bli ON bli.place_id = ec.experience_id
      WHERE bli.user_id = p_user_id AND ec.is_primary = true
      GROUP BY ec.category_id
    ),
    user_tag_weights AS (
      SELECT et.tag_id, COUNT(*)::float / v_total_tag_weight AS weight
      FROM public.experiences_tags et
      JOIN public.bucket_list_items bli ON bli.place_id = et.experience_id
      WHERE bli.user_id = p_user_id
      GROUP BY et.tag_id
    ),
    friends AS (
      SELECT
        CASE WHEN requester_id = p_user_id
          THEN addressee_id ELSE requester_id END AS friend_id
      FROM public.friendships
      WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
        AND status = 'accepted'
    ),
    friend_saved AS (
      SELECT
        bli.place_id AS experience_id,
        LEAST(COUNT(DISTINCT bli.user_id)::float / 5.0, 1.0) AS social_score
      FROM public.bucket_list_items bli
      JOIN friends f ON bli.user_id = f.friend_id
      WHERE bli.place_id NOT IN (SELECT experience_id FROM saved)
      GROUP BY bli.place_id
    ),
    momentum AS (
      SELECT
        id AS experience_id,
        GREATEST(0.0,
          1.0 - EXTRACT(EPOCH FROM (now() - created_at)) / (30.0 * 86400)
        ) AS momentum_score
      FROM public.places
      WHERE created_at > now() - interval '30 days'
        AND id NOT IN (SELECT experience_id FROM saved)
    ),
    cat_scores AS (
      SELECT ec.experience_id, SUM(ucw.weight) AS cat_score
      FROM public.experiences_categories ec
      JOIN user_cat_weights ucw ON ucw.category_id = ec.category_id
      WHERE ec.is_primary = true
      GROUP BY ec.experience_id
    ),
    tag_scores AS (
      SELECT et.experience_id, LEAST(SUM(utw.weight), 1.0) AS tag_score
      FROM public.experiences_tags et
      JOIN user_tag_weights utw ON utw.tag_id = et.tag_id
      GROUP BY et.experience_id
    ),
    scored AS (
      SELECT
        p.id AS experience_id,
        COALESCE(cs.cat_score,    0) * 0.35
          + COALESCE(ts.tag_score,  0) * 0.20
          + COALESCE(fs.social_score, 0) * 0.20
          + CASE WHEN p.trending THEN 0.10 ELSE 0 END
          + COALESCE(m.momentum_score, 0) * 0.15
          AS score,
        CASE
          WHEN fs.social_score    IS NOT NULL THEN 'social'
          WHEN p.trending                     THEN 'trending'
          WHEN m.momentum_score   IS NOT NULL THEN 'new'
          ELSE 'personalised'
        END AS recommendation_source
      FROM public.places p
      LEFT JOIN cat_scores   cs ON cs.experience_id = p.id
      LEFT JOIN tag_scores   ts ON ts.experience_id = p.id
      LEFT JOIN friend_saved fs ON fs.experience_id = p.id
      LEFT JOIN momentum     m  ON m.experience_id  = p.id
      WHERE p.id NOT IN (SELECT experience_id FROM saved)
    )
  SELECT
    s.experience_id,
    CASE WHEN v_saved_count = 0
      THEN
        COALESCE((
          SELECT m2.momentum_score FROM momentum m2
          WHERE m2.experience_id = s.experience_id
        ), 0) * 0.3
        + (
          SELECT COUNT(*)::float FROM public.bucket_list_items bli2
          WHERE bli2.place_id = s.experience_id
        ) / 100.0
      ELSE s.score
    END AS score,
    s.recommendation_source
  FROM scored s
  ORDER BY
    CASE WHEN v_saved_count = 0
      THEN
        COALESCE((
          SELECT m2.momentum_score FROM momentum m2
          WHERE m2.experience_id = s.experience_id
        ), 0) * 0.3
        + (
          SELECT COUNT(*)::float FROM public.bucket_list_items bli2
          WHERE bli2.place_id = s.experience_id
        ) / 100.0
      ELSE s.score
    END DESC
  LIMIT p_limit;
END;
$$;
