-- ============================================================
-- PXL Creator — Bundles Schema
-- Migration: 005_bundles_schema.sql
--
-- Adds rich bundle metadata tables. Bundles are also purchasable
-- as regular presets (preset_type = 'bundle') — the purchase flow
-- is unchanged. These tables drive the premium display layer:
-- value comparison, included pack lists, marketing copy, etc.
-- ============================================================

-- ============================================================
-- TABLE: bundles
-- Rich metadata for bundle display and marketing pages.
-- ============================================================
CREATE TABLE IF NOT EXISTS bundles (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT          NOT NULL UNIQUE,
  title                 TEXT          NOT NULL,
  tagline               TEXT,
  description           TEXT,
  why_creators_love_it  TEXT,         -- 2-3 sentence marketing pitch

  -- Linked preset (the purchasable item in the presets table)
  -- Set by admin after adding the bundle as a preset
  preset_id             UUID          REFERENCES presets(id) ON DELETE SET NULL,

  -- Pricing
  price_usd             NUMERIC(8,2)  NOT NULL,
  individual_value_usd  NUMERIC(8,2)  NOT NULL,   -- what buying all packs separately costs

  -- Badge & status
  bundle_badge          TEXT          NOT NULL DEFAULT 'NEW'
                                      CHECK (bundle_badge IN (
                                        'BESTSELLER','MOST POPULAR','CREATOR FAVORITE',
                                        'PRO LEVEL','TRENDING','BEST VALUE','LIMITED','NEW'
                                      )),
  is_featured           BOOLEAN       NOT NULL DEFAULT FALSE,
  is_published          BOOLEAN       NOT NULL DEFAULT TRUE,

  -- Display metadata
  target_audience       TEXT[]        NOT NULL DEFAULT '{}',
  use_cases             TEXT[]        NOT NULL DEFAULT '{}',
  features              TEXT[]        NOT NULL DEFAULT '{}',
  thumbnail_url         TEXT,

  -- Ordering
  order_index           INTEGER       NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER bundles_updated_at
  BEFORE UPDATE ON bundles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: bundle_included_packs
-- Describes which packs are inside a bundle (display only).
-- These are descriptive, not FK-linked, for flexibility.
-- ============================================================
CREATE TABLE IF NOT EXISTS bundle_included_packs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id     UUID        NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  preset_count  INTEGER     NOT NULL DEFAULT 0,
  category      TEXT        NOT NULL,
  description   TEXT,
  icon          TEXT,                    -- emoji
  order_index   INTEGER     NOT NULL DEFAULT 0
);

-- ============================================================
-- TABLE: bundle_presets (optional FK linking)
-- Links bundles to actual preset rows in the presets table.
-- Used when admin wants to track exactly which presets go into each bundle.
-- ============================================================
CREATE TABLE IF NOT EXISTS bundle_presets (
  bundle_id   UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  preset_id   UUID NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  PRIMARY KEY (bundle_id, preset_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bundles_slug        ON bundles(slug);
CREATE INDEX IF NOT EXISTS idx_bundles_featured    ON bundles(is_featured);
CREATE INDEX IF NOT EXISTS idx_bundles_published   ON bundles(is_published);
CREATE INDEX IF NOT EXISTS idx_bundles_order       ON bundles(order_index);
CREATE INDEX IF NOT EXISTS idx_bundle_packs_bundle ON bundle_included_packs(bundle_id, order_index);

-- ============================================================
-- ROW LEVEL SECURITY
-- Public can read published bundles.
-- All write operations go through the service role.
-- ============================================================
ALTER TABLE bundles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_included_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_presets        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published bundles"
  ON bundles FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "Public can read bundle included packs"
  ON bundle_included_packs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bundles
      WHERE bundles.id = bundle_included_packs.bundle_id
        AND bundles.is_published = TRUE
    )
  );

CREATE POLICY "Public can read bundle_presets"
  ON bundle_presets FOR SELECT
  USING (TRUE);
