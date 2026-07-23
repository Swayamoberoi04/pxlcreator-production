-- ============================================================
-- PXL Creator — Fix missing unlock system (P0)
-- Migration: 022_fix_missing_unlock_system.sql
--
-- Root cause: migration 017 was never applied to production, so the
-- `user_unlocks` table does not exist. Password unlocks silently failed
-- to record, and review eligibility (which reads user_unlocks) returned
-- 403 "You must purchase or unlock this preset before reviewing it."
--
-- This migration is fully idempotent — safe to run even if parts of 017
-- were partially applied.
--
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── 1. Columns 017 was meant to add to presets ───────────────
ALTER TABLE presets
  ADD COLUMN IF NOT EXISTS unlock_password     TEXT,
  ADD COLUMN IF NOT EXISTS youtube_video_title TEXT;

-- ── 2. user_unlocks table (read by review eligibility) ───────
CREATE TABLE IF NOT EXISTS user_unlocks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid   TEXT        NOT NULL,
  preset_id      UUID        NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  unlock_method  TEXT        NOT NULL CHECK (unlock_method IN ('payment', 'password')),
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_unlocks_unique UNIQUE (firebase_uid, preset_id)
);

CREATE INDEX IF NOT EXISTS user_unlocks_uid_idx    ON user_unlocks (firebase_uid);
CREATE INDEX IF NOT EXISTS user_unlocks_preset_idx ON user_unlocks (preset_id);

-- ── 3. RLS — all writes go through service-role API routes ───
ALTER TABLE user_unlocks ENABLE ROW LEVEL SECURITY;

-- ── 4. Force PostgREST to reload its schema cache immediately ─
NOTIFY pgrst, 'reload schema';
