-- Seed the "Start Here" editorial collection
INSERT INTO public.collections
  (slug, name, type, description, is_featured, is_active, sort_order)
VALUES
  ('start-here', 'Start Here', 'editorial',
   'The best places to begin your Someday list.',
   true, true, 0)
ON CONFLICT (slug) DO NOTHING;

-- Populate with the 8 highest-popularity places
INSERT INTO public.collections_places (collection_id, place_id, sort_order)
SELECT c.id, p.id, ROW_NUMBER() OVER (ORDER BY p.popularity DESC) - 1
FROM public.collections c
CROSS JOIN (
  SELECT id FROM public.places
  ORDER BY popularity DESC
  LIMIT 8
) p
WHERE c.slug = 'start-here'
ON CONFLICT DO NOTHING;
