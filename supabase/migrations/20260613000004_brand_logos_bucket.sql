-- RLS policies for the brand-logos storage bucket.
-- Bucket is created in 20260614000001_storage_buckets.sql (public: true, 2MB limit).

-- Anyone can read logos (public catalog).
CREATE POLICY "brand-logos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-logos');

-- Only internal role can upload, update, or delete logos.
CREATE POLICY "brand-logos: internal insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-logos'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'internal'
  );

CREATE POLICY "brand-logos: internal update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'brand-logos'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'internal'
  );

CREATE POLICY "brand-logos: internal delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'brand-logos'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'internal'
  );
