-- ============================================================
-- Migration: map coordinates + city preference
-- Date: 2026-04-18
--
-- 1. Add lat / lng to places for map pin rendering
-- 2. Add map_city_preference to profiles for persistent city
-- 3. Seed coordinates for the known seeded places
-- ============================================================

-- 1. places: coordinates (nullable — pins only render when set)
alter table public.places
  add column if not exists lat float8,
  add column if not exists lng float8;

comment on column public.places.lat is 'WGS-84 latitude for map pin. Null = no pin rendered.';
comment on column public.places.lng is 'WGS-84 longitude for map pin. Null = no pin rendered.';


-- 2. profiles: saved city preference from the map city picker
alter table public.profiles
  add column if not exists map_city_preference text;

comment on column public.profiles.map_city_preference is 'Last city selected in the Map tab city picker (city name string).';


-- 3. Seed coordinates for known seeded places
update public.places set lat = 35.0116,  lng = 135.7681  where name = 'Kyoto';
update public.places set lat = -51.6230, lng = -69.2168  where name = 'Patagonia';
update public.places set lat = 31.6295,  lng = -7.9811   where name = 'Marrakech';
update public.places set lat = 36.3932,  lng = 25.4615   where name = 'Santorini';
