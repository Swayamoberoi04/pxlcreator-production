-- ============================================================
-- PXL Creator — Bundle Manager
-- Migration: 024_bundle_manager.sql
--
-- Adds sale_price_usd and compare_at_price_usd to bundles
-- for independent promotional pricing.
-- Adds order_index to bundle_presets for drag-and-drop ordering.
-- ============================================================

ALTER TABLE bundles
  ADD COLUMN IF NOT EXISTS sale_price_usd       NUMERIC(8,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS compare_at_price_usd NUMERIC(8,2) DEFAULT NULL;

COMMENT ON COLUMN bundles.sale_price_usd
  IS 'Active sale price — if set, this is what the customer pays instead of price_usd.';
COMMENT ON COLUMN bundles.compare_at_price_usd
  IS 'Shown struck-through as "individual value" on the bundle page when set.';

ALTER TABLE bundle_presets
  ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_bundle_presets_bundle_order
  ON bundle_presets (bundle_id, order_index);
