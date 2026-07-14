-- Storage buckets for PartBank.
-- Consolidated here (previously created imperatively via scripts/create-buckets.mjs)
-- so all Supabase setup lives in migrations and is tracked in history.
-- Idempotent — safe to re-run. file_size_limit is in BYTES.
--
-- The RLS policies for the public buckets are defined in:
--   20260613000004_brand_logos_bucket.sql  (brand-logos)
--   20260614000000_model_images.sql        (model-images)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  -- Private buckets (10 MB, images + PDF)
  ('receipts',     'receipts',     false, 10485760, ARRAY['image/png','image/jpeg','image/jpg','image/webp','application/pdf']),
  ('drawings',     'drawings',     false, 10485760, ARRAY['image/png','image/jpeg','image/jpg','image/webp','application/pdf']),
  ('references',   'references',   false, 10485760, ARRAY['image/png','image/jpeg','image/jpg','image/webp','application/pdf']),
  -- Public catalog buckets (images only)
  ('brand-logos',  'brand-logos',  true,   2097152, ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml']),
  ('model-images', 'model-images', true,   5242880, ARRAY['image/png','image/jpeg','image/jpg','image/webp'])
ON CONFLICT (id) DO NOTHING;
