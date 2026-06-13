-- Allow orders for parts not yet in the catalog.
-- part_id becomes nullable; custom fields capture buyer's free-form request.

ALTER TABLE orders
  ALTER COLUMN part_id DROP NOT NULL,
  ADD COLUMN custom_part_name TEXT,
  ADD COLUMN custom_part_description TEXT,
  ADD COLUMN truck_info TEXT;
