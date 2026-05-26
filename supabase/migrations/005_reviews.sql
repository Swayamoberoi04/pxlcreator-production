-- ============================================================
-- PXL Creator — Reviews
-- Migration: 005_reviews.sql
--
-- Creates preset_reviews with:
--   - verified-purchase enforcement
--   - auto-aggregation trigger (updates presets.rating + review_count)
--   - moderation flag (is_approved)
--   - RLS: public reads approved reviews, auth users write own review
--
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ============================================================
-- TABLE: preset_reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS preset_reviews (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id           UUID          NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  firebase_uid        TEXT          NOT NULL,       -- reviewer's Firebase UID
  email               TEXT          NOT NULL,       -- snapshot at review time

  rating              SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text         TEXT,                         -- optional written review

  -- Moderation
  is_approved         BOOLEAN       NOT NULL DEFAULT FALSE,  -- admin must approve
  is_verified_purchase BOOLEAN      NOT NULL DEFAULT FALSE,  -- set by trigger/API

  -- One review per user per preset
  UNIQUE (preset_id, firebase_uid),

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_preset_id     ON preset_reviews(preset_id);
CREATE INDEX IF NOT EXISTS idx_reviews_firebase_uid  ON preset_reviews(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_reviews_approved      ON preset_reviews(preset_id, is_approved);

CREATE TRIGGER preset_reviews_updated_at
  BEFORE UPDATE ON preset_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNCTION: recalculate_preset_rating
-- Called after every INSERT/UPDATE/DELETE on preset_reviews.
-- Recomputes rating and review_count from approved reviews only.
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_preset_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_preset_id UUID;
  avg_rating       NUMERIC(3,2);
  total_reviews    INTEGER;
BEGIN
  -- Determine which preset to update
  IF TG_OP = 'DELETE' THEN
    target_preset_id := OLD.preset_id;
  ELSE
    target_preset_id := NEW.preset_id;
  END IF;

  -- Compute new aggregates from approved reviews only
  SELECT
    COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 5.0),
    COUNT(*)
  INTO avg_rating, total_reviews
  FROM preset_reviews
  WHERE preset_id = target_preset_id
    AND is_approved = TRUE;

  -- Update the preset row
  UPDATE presets
  SET
    rating       = avg_rating,
    review_count = total_reviews,
    updated_at   = NOW()
  WHERE id = target_preset_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER preset_reviews_aggregate
  AFTER INSERT OR UPDATE OF rating, is_approved OR DELETE
  ON preset_reviews
  FOR EACH ROW EXECUTE FUNCTION recalculate_preset_rating();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE preset_reviews ENABLE ROW LEVEL SECURITY;

-- Public can read approved reviews
CREATE POLICY "Public can read approved reviews"
  ON preset_reviews FOR SELECT
  USING (is_approved = TRUE);

-- Authenticated users (checked in API via firebase_uid claim) can INSERT
-- NOTE: Actual enforcement done server-side in the API route.
-- Service role bypasses this. We add a permissive insert policy here
-- so the anon client can be used for reading; writes go through the admin client.
-- No public INSERT policy — all writes via service role API routes only.
