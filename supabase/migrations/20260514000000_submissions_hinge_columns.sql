-- Add structured answer columns to submissions table
-- These map to the Hinge-style card questions in the new SubmitForm

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS must_do        text,
  ADD COLUMN IF NOT EXISTS hidden_gem     text,
  ADD COLUMN IF NOT EXISTS not_for_you    text,
  ADD COLUMN IF NOT EXISTS best_time      text,
  ADD COLUMN IF NOT EXISTS vibe_tags      text[],
  ADD COLUMN IF NOT EXISTS photo_url      text;

-- Rename image_url → submitted_image_url for clarity
-- (image_url stays for backwards compat, photo_url is the new user upload)
COMMENT ON COLUMN public.submissions.must_do     IS 'The one thing everyone must do here';
COMMENT ON COLUMN public.submissions.hidden_gem  IS 'Best kept secret about this place';
COMMENT ON COLUMN public.submissions.not_for_you IS 'Who this place is NOT for';
COMMENT ON COLUMN public.submissions.best_time   IS 'Best time to visit and why';
COMMENT ON COLUMN public.submissions.vibe_tags   IS 'User-selected vibe tags';
COMMENT ON COLUMN public.submissions.photo_url   IS 'User-uploaded photo URL';
