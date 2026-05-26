-- ============================================================
-- PXL Creator — Preset analytics expansion
-- Migration: 008_preset_analytics.sql
--
-- Adds purchase_count and download_count to the presets table.
-- Both are incremented atomically via SECURITY DEFINER RPCs
-- called from server-side API routes after the relevant event.
--
-- purchase_count — incremented when an order is verified paid
-- download_count — incremented each time a download link is followed
--
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Add columns ──────────────────────────────────────────────
ALTER TABLE presets
  ADD COLUMN IF NOT EXISTS purchase_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE presets
  ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0;

-- ── Indexes (for sorting presets by popularity) ──────────────
CREATE INDEX IF NOT EXISTS idx_presets_purchase_count ON presets(purchase_count DESC);
CREATE INDEX IF NOT EXISTS idx_presets_download_count ON presets(download_count DESC);

-- ── RPC: increment_preset_purchases ─────────────────────────
-- Called from verify-payment after signature check passes.
-- qty supports orders where the same preset has quantity > 1.
CREATE OR REPLACE FUNCTION increment_preset_purchases(p_id UUID, qty INTEGER DEFAULT 1)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE presets
  SET purchase_count = purchase_count + qty
  WHERE id = p_id;
$$;

-- ── RPC: increment_preset_downloads ─────────────────────────
-- Called from the download endpoint each time a file is served.
CREATE OR REPLACE FUNCTION increment_preset_downloads(p_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE presets
  SET download_count = download_count + 1
  WHERE id = p_id;
$$;
