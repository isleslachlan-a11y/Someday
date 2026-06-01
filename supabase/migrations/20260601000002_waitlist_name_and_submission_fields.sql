-- Migration 006: simplified 3-question fields on public submissions + name on waitlist signups
ALTER TABLE public.waitlist_emails
  ADD COLUMN IF NOT EXISTS name text;

ALTER TABLE public.waitlist_suggestions
  ADD COLUMN IF NOT EXISTS submission_type text
    CHECK (submission_type IN ('destination', 'experience'));

ALTER TABLE public.waitlist_suggestions
  ADD COLUMN IF NOT EXISTS must_do text;

-- Note: submitter_email is stored in the existing waitlist_suggestions.email column
