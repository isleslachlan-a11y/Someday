-- Migration: collections schema + admin RLS policies
-- Idempotent: CREATE TABLE IF NOT EXISTS, policies guarded by existence check.

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.collections (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text        NOT NULL UNIQUE,
  name         text        NOT NULL,
  type         text        NOT NULL CHECK (type IN ('region', 'theme', 'editorial', 'country')),
  description  text,
  cover_image  text,
  sort_order   integer     NOT NULL DEFAULT 0,
  is_featured  boolean     NOT NULL DEFAULT false,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collections_sort ON public.collections(sort_order);
CREATE INDEX IF NOT EXISTS idx_collections_active ON public.collections(is_active);

CREATE TABLE IF NOT EXISTS public.collections_places (
  collection_id uuid    NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  place_id      uuid    NOT NULL REFERENCES public.places(id)      ON DELETE CASCADE,
  sort_order    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_cp_collection ON public.collections_places(collection_id, sort_order);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.collections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections_places ENABLE ROW LEVEL SECURITY;

DO $policy$ BEGIN

  -- Public read: only active collections visible to regular users
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='collections' AND policyname='collections_public_read'
  ) THEN
    CREATE POLICY collections_public_read ON public.collections
      FOR SELECT USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='collections_places' AND policyname='collections_places_public_read'
  ) THEN
    CREATE POLICY collections_places_public_read ON public.collections_places
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.is_active = true)
      );
  END IF;

  -- Admin write: admins can manage all collections (bypasses public read restriction via OR logic)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='collections' AND policyname='Admins can manage collections'
  ) THEN
    CREATE POLICY "Admins can manage collections" ON public.collections
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='collections_places' AND policyname='Admins can manage collection places'
  ) THEN
    CREATE POLICY "Admins can manage collection places" ON public.collections_places
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;

END $policy$;

COMMENT ON TABLE public.collections IS
  'Curated groupings of places shown on the Discover tab (region, theme, editorial, country).';
COMMENT ON TABLE public.collections_places IS
  'Ordered membership of places within a collection.';
