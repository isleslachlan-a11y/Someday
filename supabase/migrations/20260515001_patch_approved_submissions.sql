-- Patch Sydney
UPDATE places
SET description = (
  SELECT
    CONCAT_WS(E'\n\n',
      NULLIF(TRIM(s.description), ''),
      CASE WHEN s.must_do IS NOT NULL
        THEN 'Must do: ' || TRIM(s.must_do) END,
      CASE WHEN s.hidden_gem IS NOT NULL
        THEN 'Hidden gem: ' || TRIM(s.hidden_gem) END,
      CASE WHEN s.not_for_you IS NOT NULL
        THEN 'Not for you if: ' || TRIM(s.not_for_you) END,
      CASE WHEN s.best_time IS NOT NULL
        THEN 'Best time: ' || TRIM(s.best_time) END
    )
  FROM submissions s
  WHERE s.name = 'Sydney'
    AND s.status = 'approved'
  ORDER BY s.reviewed_at DESC
  LIMIT 1
),
lat = (SELECT lat FROM submissions WHERE name = 'Sydney' AND status = 'approved' ORDER BY reviewed_at DESC LIMIT 1),
lng = (SELECT lng FROM submissions WHERE name = 'Sydney' AND status = 'approved' ORDER BY reviewed_at DESC LIMIT 1)
WHERE name = 'Sydney'
  AND description LIKE '%Opera House%';

-- Patch Emerald QLD
UPDATE places
SET description = (
  SELECT
    CONCAT_WS(E'\n\n',
      NULLIF(TRIM(s.description), ''),
      CASE WHEN s.must_do IS NOT NULL
        THEN 'Must do: ' || TRIM(s.must_do) END,
      CASE WHEN s.hidden_gem IS NOT NULL
        THEN 'Hidden gem: ' || TRIM(s.hidden_gem) END,
      CASE WHEN s.not_for_you IS NOT NULL
        THEN 'Not for you if: ' || TRIM(s.not_for_you) END,
      CASE WHEN s.best_time IS NOT NULL
        THEN 'Best time: ' || TRIM(s.best_time) END
    )
  FROM submissions s
  WHERE s.name = 'Emerald, QLD'
    AND s.status = 'approved'
  ORDER BY s.reviewed_at DESC
  LIMIT 1
),
lat = (SELECT lat FROM submissions WHERE name = 'Emerald, QLD' AND status = 'approved' ORDER BY reviewed_at DESC LIMIT 1),
lng = (SELECT lng FROM submissions WHERE name = 'Emerald, QLD' AND status = 'approved' ORDER BY reviewed_at DESC LIMIT 1)
WHERE name = 'Emerald, QLD';
