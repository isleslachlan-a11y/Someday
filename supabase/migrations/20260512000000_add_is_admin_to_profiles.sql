ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- After running this migration, set your admin account in the Supabase SQL editor:
-- UPDATE profiles SET is_admin = true WHERE id = 'YOUR_USER_ID_HERE';

COMMENT ON COLUMN public.profiles.is_admin IS
  'True for Lachlan/Sophia admin accounts. Grants direct place creation.';
