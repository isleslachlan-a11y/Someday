-- Add Unsplash image columns to the places table.
-- image_url already exists from the pivot schema migration.
-- This adds the thumb, attribution, and photo ID columns.

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS image_thumb_url       text,
  ADD COLUMN IF NOT EXISTS unsplash_photo_id     text,
  ADD COLUMN IF NOT EXISTS unsplash_attribution  jsonb;

comment on column public.places.image_thumb_url      is 'Unsplash small thumbnail URL (~400px wide), served from Unsplash CDN';
comment on column public.places.unsplash_photo_id    is 'Unsplash photo ID used for deduplication and attribution';
comment on column public.places.unsplash_attribution is 'Photographer credit as required by Unsplash API ToS: {photographer_name, photographer_url, photo_url}';
