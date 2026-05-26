-- ============================================================
-- PXL Creator — Analytics
-- Migration: 003_analytics.sql
--
-- Adds a view_count column to presets and a server-side RPC
-- to increment it atomically.
--
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Add view_count to presets ────────────────────────────────
ALTER TABLE presets
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Index for ordering presets by most-viewed
CREATE INDEX IF NOT EXISTS idx_presets_view_count ON presets(view_count DESC);

-- ── RPC: increment_preset_views ──────────────────────────────
-- Called server-side only (admin client / service role).
-- SECURITY DEFINER runs as the function owner, bypassing RLS.
CREATE OR REPLACE FUNCTION increment_preset_views(p_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE presets
  SET view_count = view_count + 1
  WHERE id = p_id;
$$;
