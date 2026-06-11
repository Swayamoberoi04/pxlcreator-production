-- ============================================================
-- PXL Creator — Preset Unlock System
-- Migration: 017_preset_unlocks.sql
--
-- Adds:
--   1. unlock_password + youtube_video_title columns to presets
--   2. user_unlocks table (tracks both payment and password unlocks)
--   3. RLS policies — users can only read their own unlocks
--      all writes go through service-role API routes
--
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── 1. Extend presets table ──────────────────────────────────

ALTER TABLE presets
  ADD COLUMN IF NOT EXISTS unlock_password    TEXT,
  ADD COLUMN IF NOT EXISTS youtube_video_title TEXT;

-- ── 2. user_unlocks table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_unlocks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid   TEXT        NOT NULL,
  preset_id      UUID        NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  unlock_method  TEXT        NOT NULL CHECK (unlock_method IN ('payment', 'password')),
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_unlocks_unique UNIQUE (firebase_uid, preset_id)
);

CREATE INDEX IF NOT EXISTS user_unlocks_uid_idx      ON user_unlocks (firebase_uid);
CREATE INDEX IF NOT EXISTS user_unlocks_preset_idx   ON user_unlocks (preset_id);

-- ── 3. RLS ───────────────────────────────────────────────────

ALTER TABLE user_unlocks ENABLE ROW LEVEL SECURITY;

-- Users cannot read/write directly from client — all access via service-role API
-- (No public SELECT policy — queries require service role key)
