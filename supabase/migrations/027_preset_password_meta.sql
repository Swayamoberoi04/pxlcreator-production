-- 027_preset_password_meta.sql
--
-- Adds password-management metadata columns to the presets table.
-- unlock_password already exists (added in migration 022).
-- These columns track who last set the password and when,
-- surfaced in the admin dashboard.

ALTER TABLE presets
  ADD COLUMN IF NOT EXISTS password_updated_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_updated_by  TEXT;

-- Speed up unlock-count aggregation per preset
CREATE INDEX IF NOT EXISTS user_unlocks_preset_method_idx
  ON user_unlocks (preset_id, unlock_method);
