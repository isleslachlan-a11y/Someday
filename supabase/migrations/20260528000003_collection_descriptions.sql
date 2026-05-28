-- Migration: seed collection rows with descriptions
-- These slugs match the CATEGORIES array in DiscoverContent.tsx.
-- Uses ON CONFLICT (slug) DO UPDATE so running twice is safe.

INSERT INTO public.collections (slug, name, type, description, sort_order, is_active, is_featured) VALUES
  ('asia',        'Asia',        'region',    'Ancient temples, neon cities, jungle valleys.',            1,  true, true),
  ('europe',      'Europe',      'region',    'Cobblestone lanes, hilltop castles, golden coasts.',       2,  true, true),
  ('americas',    'Americas',    'region',    'Canyon roads, carnival nights, glacial peaks.',            3,  true, false),
  ('africa',      'Africa',      'region',    'Safari horizons, ancient kingdoms, red dunes.',            4,  true, false),
  ('oceania',     'Oceania',     'region',    'Coral reefs, red earth, silver ferns.',                   5,  true, false),
  ('adventure',   'Adventure',   'theme',     'Places that push your limits and reward the effort.',     6,  true, true),
  ('romantic',    'Romantic',    'theme',     'Sunsets worth sharing with someone special.',              7,  true, false),
  ('foodie',      'Foodie',      'theme',     'Tables worth flying halfway around the world for.',        8,  true, false),
  ('epic',        'Epic',        'theme',     'Destinations that stop your scroll mid-breath.',           9,  true, true),
  ('nature',      'Nature',      'theme',     'Wild landscapes, shaped by time and nothing else.',        10, true, false),
  ('cities',      'Cities',      'theme',     'Where life hums loudly at every hour.',                    11, true, false),
  ('experiences', 'Experiences', 'editorial', 'Things to do, not just places to stand in.',              12, true, false)
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  type        = EXCLUDED.type,
  sort_order  = EXCLUDED.sort_order,
  name        = EXCLUDED.name;
