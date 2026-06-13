-- Technical drawing path (stored in drawings bucket) and internal price reference.
ALTER TABLE parts
  ADD COLUMN drawing_url    TEXT,
  ADD COLUMN price_reference INTEGER;
