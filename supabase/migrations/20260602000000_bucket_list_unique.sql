-- Remove duplicate rows, keeping the oldest entry per (user_id, place_id)
DELETE FROM public.bucket_list_items
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, place_id) id
  FROM public.bucket_list_items
  ORDER BY user_id, place_id, added_at ASC
);

-- Enforce uniqueness at the DB level so no code path can create duplicates
ALTER TABLE public.bucket_list_items
  DROP CONSTRAINT IF EXISTS bucket_list_items_user_place_unique;

ALTER TABLE public.bucket_list_items
  ADD CONSTRAINT bucket_list_items_user_place_unique
    UNIQUE (user_id, place_id);
