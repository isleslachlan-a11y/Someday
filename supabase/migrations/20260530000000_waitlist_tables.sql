-- Waitlist email sign-ups
CREATE TABLE IF NOT EXISTS public.waitlist_emails (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.waitlist_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist_emails FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service role reads emails"
  ON public.waitlist_emails FOR SELECT
  TO service_role USING (true);

-- Waitlist place suggestions (anonymous — separate from recommendation_events)
CREATE TABLE IF NOT EXISTS public.waitlist_suggestions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text,
  place_id   uuid REFERENCES public.places(id) ON DELETE SET NULL,
  place_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.waitlist_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can suggest"
  ON public.waitlist_suggestions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service role reads suggestions"
  ON public.waitlist_suggestions FOR SELECT
  TO service_role USING (true);
