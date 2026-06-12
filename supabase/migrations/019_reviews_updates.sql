-- ============================================================
-- PXL Creator — Reviews updates
-- Migration: 019_reviews_updates.sql
--
-- 1. Adds optional `title` column to preset_reviews
-- 2. Fixes the rating aggregate trigger: default to 0 (not 5.0)
--    when a preset has no approved reviews
-- 3. Resets any seeded fake ratings to 0
-- ============================================================

-- Add title column (optional, shown above review text)
ALTER TABLE preset_reviews
  ADD COLUMN IF NOT EXISTS title TEXT;

-- Fix aggregate function: COALESCE to 0 not 5.0
CREATE OR REPLACE FUNCTION recalculate_preset_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_preset_id UUID;
  avg_rating       NUMERIC(3,2);
  total_reviews    INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_preset_id := OLD.preset_id;
  ELSE
    target_preset_id := NEW.preset_id;
  END IF;

  SELECT
    COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0),
    COUNT(*)
  INTO avg_rating, total_reviews
  FROM preset_reviews
  WHERE preset_id = target_preset_id
    AND is_approved = TRUE;

  UPDATE presets
  SET
    rating       = avg_rating,
    review_count = total_reviews,
    updated_at   = NOW()
  WHERE id = target_preset_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset all presets with no approved reviews to rating=0
UPDATE presets p
SET rating = 0
WHERE (
  SELECT COUNT(*) FROM preset_reviews r
  WHERE r.preset_id = p.id AND r.is_approved = TRUE
) = 0;
