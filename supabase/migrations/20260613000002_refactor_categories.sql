-- Refactor: part_categories becomes global (no model_id)
-- parts gains model_id directly

-- 1. Add model_id to parts, derive from existing category relationship
ALTER TABLE parts ADD COLUMN model_id UUID REFERENCES truck_models;

UPDATE parts
SET model_id = (
  SELECT model_id FROM part_categories WHERE id = parts.category_id
);

ALTER TABLE parts ALTER COLUMN model_id SET NOT NULL;

-- 2. Drop model_id from part_categories
ALTER TABLE part_categories DROP COLUMN model_id;

-- 3. Update RLS: deleteModel dependency check now uses parts.model_id
-- (no policy changes needed — existing policies don't reference model_id on categories)
