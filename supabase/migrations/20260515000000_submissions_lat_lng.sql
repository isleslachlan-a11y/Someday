ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

COMMENT ON COLUMN public.submissions.lat IS 'Latitude from Mapbox geocoding';
COMMENT ON COLUMN public.submissions.lng IS 'Longitude from Mapbox geocoding';
