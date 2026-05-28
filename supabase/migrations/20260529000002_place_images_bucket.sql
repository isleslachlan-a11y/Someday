-- Create place-images storage bucket for admin-uploaded place photos
-- Note: if this migration fails for storage.buckets, create it manually via
-- Dashboard → Storage → New bucket → name: place-images, Public: true,
-- File size limit: 10 MB, Allowed MIME types: image/jpeg, image/png, image/webp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'place-images',
  'place-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated admins to upload
CREATE POLICY IF NOT EXISTS "Admins can upload place images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'place-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow public read
CREATE POLICY IF NOT EXISTS "Place images are publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'place-images');
