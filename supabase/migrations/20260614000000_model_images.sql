-- Add image_url to truck_models
ALTER TABLE public.truck_models
  ADD COLUMN IF NOT EXISTS image_url text;

-- RLS policies for the model-images storage bucket.
-- Bucket is created in 20260614000001_storage_buckets.sql (public: true, 5MB limit).

CREATE POLICY "model-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'model-images');

CREATE POLICY "model-images: internal insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'model-images'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'internal'
  );

CREATE POLICY "model-images: internal update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'model-images'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'internal'
  );

CREATE POLICY "model-images: internal delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'model-images'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'internal'
  );
