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

CREATE TABLE profiles (
  id          UUID        REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role        user_role   NOT NULL,
  full_name   TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE truck_brands (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT        NOT NULL,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE truck_models (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand_id    UUID        REFERENCES truck_brands ON DELETE CASCADE NOT NULL,
  name        TEXT        NOT NULL,
  year_range  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE part_categories (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  model_id    UUID        REFERENCES truck_models ON DELETE CASCADE NOT NULL,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE order_events (
  id          UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id    UUID         REFERENCES orders ON DELETE CASCADE NOT NULL,
  actor_id    UUID         REFERENCES profiles NOT NULL,
  from_status order_status,
  to_status   order_status NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

CREATE TABLE notifications (
  id         UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID        REFERENCES profiles ON DELETE CASCADE NOT NULL,
  order_id   UUID        REFERENCES orders ON DELETE SET NULL,
  message    TEXT        NOT NULL,
  is_read    BOOLEAN     DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE files (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id     UUID        REFERENCES orders ON DELETE CASCADE NOT NULL,
  uploader_id  UUID        REFERENCES profiles NOT NULL,
  file_type    TEXT        NOT NULL CHECK (file_type IN ('re_receipt', 'part_receipt', 'drawing', 'reference_photo')),
  storage_path TEXT        NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. Triggers
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

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_brands    ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_models    ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE files           ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles
CREATE POLICY "profiles: own row or internal can select"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR get_my_role() = 'internal');

CREATE POLICY "profiles: insert own row"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: update own row"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- truck_brands
CREATE POLICY "truck_brands: authenticated can select"
  ON truck_brands FOR SELECT TO authenticated USING (true);

CREATE POLICY "truck_brands: internal can insert"
  ON truck_brands FOR INSERT WITH CHECK (get_my_role() = 'internal');

CREATE POLICY "truck_brands: internal can update"
  ON truck_brands FOR UPDATE USING (get_my_role() = 'internal');

CREATE POLICY "truck_brands: internal can delete"
  ON truck_brands FOR DELETE USING (get_my_role() = 'internal');

-- truck_models
CREATE POLICY "truck_models: authenticated can select"
  ON truck_models FOR SELECT TO authenticated USING (true);

CREATE POLICY "truck_models: internal can insert"
  ON truck_models FOR INSERT WITH CHECK (get_my_role() = 'internal');

CREATE POLICY "truck_models: internal can update"
  ON truck_models FOR UPDATE USING (get_my_role() = 'internal');

CREATE POLICY "truck_models: internal can delete"
  ON truck_models FOR DELETE USING (get_my_role() = 'internal');

-- part_categories
CREATE POLICY "part_categories: authenticated can select"
  ON part_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "part_categories: internal can insert"
  ON part_categories FOR INSERT WITH CHECK (get_my_role() = 'internal');

CREATE POLICY "part_categories: internal can update"
  ON part_categories FOR UPDATE USING (get_my_role() = 'internal');

CREATE POLICY "part_categories: internal can delete"
  ON part_categories FOR DELETE USING (get_my_role() = 'internal');

-- parts
CREATE POLICY "parts: authenticated can select"
  ON parts FOR SELECT TO authenticated USING (true);

CREATE POLICY "parts: internal can insert"
  ON parts FOR INSERT WITH CHECK (get_my_role() = 'internal');

CREATE POLICY "parts: internal can update"
  ON parts FOR UPDATE USING (get_my_role() = 'internal');

CREATE POLICY "parts: internal can delete"
  ON parts FOR DELETE USING (get_my_role() = 'internal');

-- workshops
CREATE POLICY "workshops: authenticated can select"
  ON workshops FOR SELECT TO authenticated USING (true);

CREATE POLICY "workshops: workshop role can insert"
  ON workshops FOR INSERT WITH CHECK (get_my_role() = 'workshop');

CREATE POLICY "workshops: internal can update"
  ON workshops FOR UPDATE USING (get_my_role() = 'internal');

-- orders
CREATE POLICY "orders: customer sees own orders"
  ON orders FOR SELECT USING (auth.uid() = customer_id);

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
  ON orders FOR SELECT USING (get_my_role() = 'internal');

CREATE POLICY "orders: customer can insert"
  ON orders FOR INSERT
  WITH CHECK (get_my_role() = 'customer' AND auth.uid() = customer_id);

CREATE POLICY "orders: internal can update"
  ON orders FOR UPDATE USING (get_my_role() = 'internal');

-- order_events
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
  ON order_events FOR INSERT WITH CHECK (get_my_role() = 'internal');

-- notifications
CREATE POLICY "notifications: user sees own"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications: internal can insert"
  ON notifications FOR INSERT WITH CHECK (get_my_role() = 'internal');

CREATE POLICY "notifications: user can update own (mark read)"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- files
CREATE POLICY "files: owner can select"
  ON files FOR SELECT USING (auth.uid() = uploader_id);

CREATE POLICY "files: internal can select all"
  ON files FOR SELECT USING (get_my_role() = 'internal');

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
  ON files FOR INSERT WITH CHECK (auth.uid() = uploader_id);
