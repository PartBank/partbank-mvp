-- ============================================================
-- 1. Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. ENUM Types
-- ============================================================
CREATE TYPE user_role AS ENUM ('customer', 'workshop', 'internal');

CREATE TYPE order_status AS ENUM (
  'pending_re_confirmation',
  'pending_re_payment',
  'pending_re_receipt',
  're_in_progress',
  'pending_price_estimation',
  'pending_part_payment',
  'pending_payment_confirmation',
  'finding_workshop',
  'in_production',
  'pending_qc',
  'qc_failed_cancelled',
  'cancelled_refunded',
  'in_delivery',
  'completed'
);

CREATE TYPE manufacturability_grade AS ENUM ('A', 'B', 'C', 'D');

CREATE TYPE part_status AS ENUM ('request_only', 'ready_to_make');

CREATE TYPE workshop_tier AS ENUM ('Bronze', 'Silver', 'Platinum');

-- ============================================================
-- 3. Tables
-- ============================================================

-- profiles (extends auth.users)
CREATE TABLE profiles (
  id          UUID        REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role        user_role   NOT NULL,
  full_name   TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- truck_brands
CREATE TABLE truck_brands (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT        NOT NULL,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- truck_models
CREATE TABLE truck_models (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand_id    UUID        REFERENCES truck_brands ON DELETE CASCADE NOT NULL,
  name        TEXT        NOT NULL,
  year_range  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- part_categories
CREATE TABLE part_categories (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  model_id    UUID        REFERENCES truck_models ON DELETE CASCADE NOT NULL,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- parts
CREATE TABLE parts (
  id                      UUID                    DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id             UUID                    REFERENCES part_categories ON DELETE CASCADE NOT NULL,
  name                    TEXT                    NOT NULL,
  description             TEXT,
  manufacturability_grade manufacturability_grade,
  status                  part_status             DEFAULT 'request_only',
  material_spec           TEXT,
  notes                   TEXT,
  drawing_file_path       TEXT,
  created_by              UUID                    REFERENCES profiles,
  created_at              TIMESTAMPTZ             DEFAULT now()
);

-- workshops
CREATE TABLE workshops (
  id              UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id      UUID          REFERENCES profiles ON DELETE CASCADE NOT NULL,
  name            TEXT          NOT NULL,
  address         TEXT,
  capability_tags TEXT[]        DEFAULT '{}',
  tier            workshop_tier DEFAULT 'Bronze',
  is_verified     BOOLEAN       DEFAULT false,
  created_at      TIMESTAMPTZ   DEFAULT now()
);

-- orders
CREATE TABLE orders (
  id               UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id      UUID         REFERENCES profiles NOT NULL,
  part_id          UUID         REFERENCES parts NOT NULL,
  workshop_id      UUID         REFERENCES workshops,
  status           order_status DEFAULT 'pending_re_confirmation',
  quantity         INTEGER      DEFAULT 1,
  notes            TEXT,
  re_fee           INTEGER,
  part_price       INTEGER,
  tracking_number  TEXT,
  qc_failure_notes TEXT,
  created_at       TIMESTAMPTZ  DEFAULT now(),
  updated_at       TIMESTAMPTZ  DEFAULT now()
);

-- order_events
CREATE TABLE order_events (
  id          UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id    UUID         REFERENCES orders ON DELETE CASCADE NOT NULL,
  actor_id    UUID         REFERENCES profiles NOT NULL,
  from_status order_status,
  to_status   order_status NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

-- notifications
CREATE TABLE notifications (
  id         UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID        REFERENCES profiles ON DELETE CASCADE NOT NULL,
  order_id   UUID        REFERENCES orders ON DELETE SET NULL,
  message    TEXT        NOT NULL,
  is_read    BOOLEAN     DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- files
CREATE TABLE files (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id     UUID        REFERENCES orders ON DELETE CASCADE NOT NULL,
  uploader_id  UUID        REFERENCES profiles NOT NULL,
  file_type    TEXT        NOT NULL CHECK (file_type IN ('re_receipt', 'part_receipt', 'drawing', 'reference_photo')),
  storage_path TEXT        NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. updated_at trigger for orders
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 5. Row Level Security
-- ============================================================

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_brands   ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_models   ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE files          ENABLE ROW LEVEL SECURITY;

-- Helper: get the role of the currently authenticated user
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- profiles ----
CREATE POLICY "profiles: own row or internal can select"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR get_my_role() = 'internal');

CREATE POLICY "profiles: insert own row"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: update own row"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ---- truck_brands ----
CREATE POLICY "truck_brands: authenticated can select"
  ON truck_brands FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "truck_brands: internal can insert"
  ON truck_brands FOR INSERT
  WITH CHECK (get_my_role() = 'internal');

CREATE POLICY "truck_brands: internal can update"
  ON truck_brands FOR UPDATE
  USING (get_my_role() = 'internal');

CREATE POLICY "truck_brands: internal can delete"
  ON truck_brands FOR DELETE
  USING (get_my_role() = 'internal');

-- ---- truck_models ----
CREATE POLICY "truck_models: authenticated can select"
  ON truck_models FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "truck_models: internal can insert"
  ON truck_models FOR INSERT
  WITH CHECK (get_my_role() = 'internal');

CREATE POLICY "truck_models: internal can update"
  ON truck_models FOR UPDATE
  USING (get_my_role() = 'internal');

CREATE POLICY "truck_models: internal can delete"
  ON truck_models FOR DELETE
  USING (get_my_role() = 'internal');

-- ---- part_categories ----
CREATE POLICY "part_categories: authenticated can select"
  ON part_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "part_categories: internal can insert"
  ON part_categories FOR INSERT
  WITH CHECK (get_my_role() = 'internal');

CREATE POLICY "part_categories: internal can update"
  ON part_categories FOR UPDATE
  USING (get_my_role() = 'internal');

CREATE POLICY "part_categories: internal can delete"
  ON part_categories FOR DELETE
  USING (get_my_role() = 'internal');

-- ---- parts ----
CREATE POLICY "parts: authenticated can select"
  ON parts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "parts: internal can insert"
  ON parts FOR INSERT
  WITH CHECK (get_my_role() = 'internal');

CREATE POLICY "parts: internal can update"
  ON parts FOR UPDATE
  USING (get_my_role() = 'internal');

CREATE POLICY "parts: internal can delete"
  ON parts FOR DELETE
  USING (get_my_role() = 'internal');

-- ---- workshops ----
CREATE POLICY "workshops: authenticated can select"
  ON workshops FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "workshops: workshop role can insert"
  ON workshops FOR INSERT
  WITH CHECK (get_my_role() = 'workshop');

CREATE POLICY "workshops: internal can update"
  ON workshops FOR UPDATE
  USING (get_my_role() = 'internal');

-- ---- orders ----
CREATE POLICY "orders: customer sees own orders"
  ON orders FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "orders: workshop sees assigned orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workshops
      WHERE workshops.id = orders.workshop_id
        AND workshops.profile_id = auth.uid()
    )
  );

CREATE POLICY "orders: internal sees all orders"
  ON orders FOR SELECT
  USING (get_my_role() = 'internal');

CREATE POLICY "orders: customer can insert"
  ON orders FOR INSERT
  WITH CHECK (get_my_role() = 'customer' AND auth.uid() = customer_id);

CREATE POLICY "orders: internal can update"
  ON orders FOR UPDATE
  USING (get_my_role() = 'internal');

-- ---- order_events ----
CREATE POLICY "order_events: visible to order participants"
  ON order_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_events.order_id
        AND (
          orders.customer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM workshops
            WHERE workshops.id = orders.workshop_id
              AND workshops.profile_id = auth.uid()
          )
          OR get_my_role() = 'internal'
        )
    )
  );

CREATE POLICY "order_events: internal can insert"
  ON order_events FOR INSERT
  WITH CHECK (get_my_role() = 'internal');

-- ---- notifications ----
CREATE POLICY "notifications: user sees own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications: internal can insert"
  ON notifications FOR INSERT
  WITH CHECK (get_my_role() = 'internal');

CREATE POLICY "notifications: user can update own (mark read)"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ---- files ----
CREATE POLICY "files: owner can select"
  ON files FOR SELECT
  USING (auth.uid() = uploader_id);

CREATE POLICY "files: internal can select all"
  ON files FOR SELECT
  USING (get_my_role() = 'internal');

CREATE POLICY "files: assigned workshop can select drawing after in_production"
  ON files FOR SELECT
  USING (
    file_type = 'drawing'
    AND EXISTS (
      SELECT 1 FROM orders
        JOIN workshops ON workshops.id = orders.workshop_id
      WHERE orders.id = files.order_id
        AND workshops.profile_id = auth.uid()
        AND orders.status IN (
          'in_production', 'pending_qc', 'qc_failed_cancelled',
          'cancelled_refunded', 'in_delivery', 'completed'
        )
    )
  );

CREATE POLICY "files: authenticated can insert"
  ON files FOR INSERT
  WITH CHECK (auth.uid() = uploader_id);

-- ============================================================
-- 6. Seed Data
-- ============================================================

-- Demo profile UUIDs (fixed for consistency across resets)
-- These must match the auth.users rows created via Supabase Auth
-- internal@partbank.com
-- workshop@bengkel.com
-- buyer@buyer.com

DO $$
DECLARE
  internal_id UUID := '00000000-0000-0000-0000-000000000001';
  workshop_id  UUID := '00000000-0000-0000-0000-000000000002';
  customer_id  UUID := '00000000-0000-0000-0000-000000000003';

  -- Truck brand IDs
  hino_id      UUID := uuid_generate_v4();
  fuso_id      UUID := uuid_generate_v4();
  isuzu_id     UUID := uuid_generate_v4();

  -- Hino model IDs
  hino_fm_id   UUID := uuid_generate_v4();
  hino_rng_id  UUID := uuid_generate_v4();

  -- Fuso model IDs
  fuso_fn_id   UUID := uuid_generate_v4();
  fuso_fj_id   UUID := uuid_generate_v4();

  -- Isuzu model IDs
  isuzu_elf_id UUID := uuid_generate_v4();
  isuzu_giga_id UUID := uuid_generate_v4();

  -- Category IDs (2 per model = 12 total)
  cat_hfm_1 UUID := uuid_generate_v4(); cat_hfm_2 UUID := uuid_generate_v4();
  cat_hrng_1 UUID := uuid_generate_v4(); cat_hrng_2 UUID := uuid_generate_v4();
  cat_ffn_1 UUID := uuid_generate_v4(); cat_ffn_2 UUID := uuid_generate_v4();
  cat_ffj_1 UUID := uuid_generate_v4(); cat_ffj_2 UUID := uuid_generate_v4();
  cat_ielf_1 UUID := uuid_generate_v4(); cat_ielf_2 UUID := uuid_generate_v4();
  cat_igiga_1 UUID := uuid_generate_v4(); cat_igiga_2 UUID := uuid_generate_v4();

BEGIN
  -- Profiles
  INSERT INTO profiles (id, role, full_name) VALUES
    (internal_id, 'internal', 'Admin PartBank'),
    (workshop_id,  'workshop', 'Bengkel Maju Jaya'),
    (customer_id,  'customer', 'Pak Budi Santoso');

  -- Workshop record
  INSERT INTO workshops (profile_id, name, capability_tags, is_verified) VALUES
    (workshop_id, 'Bengkel Maju Jaya', ARRAY['machining', 'welding', 'casting'], true);

  -- Truck brands
  INSERT INTO truck_brands (id, name) VALUES
    (hino_id,  'Hino'),
    (fuso_id,  'Mitsubishi Fuso'),
    (isuzu_id, 'Isuzu');

  -- Truck models
  INSERT INTO truck_models (id, brand_id, name, year_range) VALUES
    (hino_fm_id,    hino_id,  'FM 260 JD',   '2015–2023'),
    (hino_rng_id,   hino_id,  'Ranger FG',   '2012–2022'),
    (fuso_fn_id,    fuso_id,  'FN 527 ML',   '2016–2023'),
    (fuso_fj_id,    fuso_id,  'FJ 2523',     '2013–2021'),
    (isuzu_elf_id,  isuzu_id, 'ELF NMR 71',  '2014–2023'),
    (isuzu_giga_id, isuzu_id, 'Giga FVZ 34', '2017–2023');

  -- Part categories (2 per model)
  INSERT INTO part_categories (id, model_id, name) VALUES
    (cat_hfm_1,   hino_fm_id,    'Sistem Kemudi'),
    (cat_hfm_2,   hino_fm_id,    'Sistem Rem'),
    (cat_hrng_1,  hino_rng_id,   'Sistem Suspensi'),
    (cat_hrng_2,  hino_rng_id,   'Sistem Transmisi'),
    (cat_ffn_1,   fuso_fn_id,    'Sistem Kemudi'),
    (cat_ffn_2,   fuso_fn_id,    'Sistem Pendingin'),
    (cat_ffj_1,   fuso_fj_id,    'Sistem Rem'),
    (cat_ffj_2,   fuso_fj_id,    'Sistem Bahan Bakar'),
    (cat_ielf_1,  isuzu_elf_id,  'Sistem Kemudi'),
    (cat_ielf_2,  isuzu_elf_id,  'Sistem Rem'),
    (cat_igiga_1, isuzu_giga_id, 'Sistem Transmisi'),
    (cat_igiga_2, isuzu_giga_id, 'Sistem Suspensi');

  -- Parts (2–3 per category)
  INSERT INTO parts (category_id, name, description, manufacturability_grade, status, created_by) VALUES
    -- Hino FM 260 – Sistem Kemudi
    (cat_hfm_1, 'Tie Rod End Kiri', 'Tie rod end sisi kiri untuk Hino FM 260', 'B', 'request_only', internal_id),
    (cat_hfm_1, 'Rack Steering', 'Rack kemudi Hino FM 260 JD', 'A', 'request_only', internal_id),
    (cat_hfm_1, 'King Pin Set', 'Set king pin lengkap dengan bushing', 'B', 'request_only', internal_id),
    -- Hino FM 260 – Sistem Rem
    (cat_hfm_2, 'Kampas Rem Depan', 'Brake pad depan Hino FM 260', 'A', 'request_only', internal_id),
    (cat_hfm_2, 'Master Silinder Rem', 'Master cylinder rem hidrolik', 'B', 'request_only', internal_id),
    -- Hino Ranger – Sistem Suspensi
    (cat_hrng_1, 'Shackle Pegas Belakang', 'Shackle daun pegas belakang Ranger FG', 'B', 'request_only', internal_id),
    (cat_hrng_1, 'Bos Pegas Depan', 'Bushing pegas daun depan', 'C', 'request_only', internal_id),
    -- Hino Ranger – Sistem Transmisi
    (cat_hrng_2, 'Gardan Belakang', 'Differential rear axle Ranger FG', 'A', 'request_only', internal_id),
    (cat_hrng_2, 'Cross Joint Propeller', 'Universal joint propeller shaft', 'B', 'request_only', internal_id),
    -- Fuso FN – Sistem Kemudi
    (cat_ffn_1, 'Drag Link', 'Drag link kemudi Fuso FN 527', 'B', 'request_only', internal_id),
    (cat_ffn_1, 'Idler Arm', 'Idler arm steering Fuso FN', 'C', 'request_only', internal_id),
    -- Fuso FN – Sistem Pendingin
    (cat_ffn_2, 'Pompa Air', 'Water pump Fuso FN 527 ML', 'A', 'request_only', internal_id),
    (cat_ffn_2, 'Tutup Radiator', 'Radiator cap pressure valve', 'A', 'request_only', internal_id),
    -- Fuso FJ – Sistem Rem
    (cat_ffj_1, 'Booster Rem', 'Brake booster assembly Fuso FJ', 'B', 'request_only', internal_id),
    (cat_ffj_1, 'Caliper Rem Depan', 'Brake caliper depan FJ 2523', 'A', 'request_only', internal_id),
    -- Fuso FJ – Sistem Bahan Bakar
    (cat_ffj_2, 'Filter Solar', 'Fuel filter diesel Fuso FJ', 'A', 'request_only', internal_id),
    (cat_ffj_2, 'Pompa Injeksi', 'Injection pump FJ 2523', 'B', 'request_only', internal_id),
    -- Isuzu ELF – Sistem Kemudi
    (cat_ielf_1, 'Tie Rod End', 'Tie rod end Isuzu ELF NMR 71', 'B', 'request_only', internal_id),
    (cat_ielf_1, 'Ball Joint Bawah', 'Lower ball joint ELF NMR', 'B', 'request_only', internal_id),
    -- Isuzu ELF – Sistem Rem
    (cat_ielf_2, 'Kampas Rem Tromol', 'Brake shoe tromol belakang ELF', 'A', 'request_only', internal_id),
    (cat_ielf_2, 'Wheel Cylinder Belakang', 'Wheel cylinder rem tromol', 'B', 'request_only', internal_id),
    -- Isuzu Giga – Sistem Transmisi
    (cat_igiga_1, 'Kopling Utama', 'Clutch disc assembly Giga FVZ', 'A', 'request_only', internal_id),
    (cat_igiga_1, 'Plat Penekan Kopling', 'Pressure plate clutch Giga FVZ', 'B', 'request_only', internal_id),
    -- Isuzu Giga – Sistem Suspensi
    (cat_igiga_2, 'Shock Absorber Depan', 'Front shock absorber Isuzu Giga', 'A', 'request_only', internal_id),
    (cat_igiga_2, 'Baut U-Bolt Belakang', 'U-bolt pegas belakang Giga FVZ', 'B', 'request_only', internal_id);

END $$;
