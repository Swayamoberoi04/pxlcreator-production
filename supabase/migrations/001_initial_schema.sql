-- ============================================================
-- PXL Creator — Supabase Initial Schema
-- Migration: 001_initial_schema.sql
--
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- Or via: supabase db push (if using Supabase CLI)
-- ============================================================

-- ── Enable UUID generation ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  icon        TEXT,                        -- emoji or icon name
  color       TEXT,                        -- hex colour for UI
  order_index INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: presets
-- ============================================================
CREATE TABLE IF NOT EXISTS presets (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT          NOT NULL UNIQUE,
  title              TEXT          NOT NULL,
  tagline            TEXT,
  description        TEXT,

  -- ── Category (FK) ──────────────────────────────────────
  category_id        UUID          REFERENCES categories(id) ON DELETE SET NULL,

  -- ── Media ──────────────────────────────────────────────
  thumbnail_url      TEXT,
  before_url         TEXT,
  after_url          TEXT,

  -- ── YouTube metadata ───────────────────────────────────
  youtube_video_id   TEXT,
  youtube_url        TEXT,
  youtube_channel_id TEXT,
  youtube_raw_title  TEXT,         -- original YT title (before editing)
  youtube_raw_desc   TEXT,         -- full YT description (for re-parsing)
  youtube_published  TIMESTAMPTZ,  -- when the YT video was published
  youtube_thumbnail  TEXT,         -- YT thumbnail URL (as fallback)

  -- ── Pricing ────────────────────────────────────────────
  price              NUMERIC(10,2) NOT NULL DEFAULT 0,
  original_price     NUMERIC(10,2),
  is_free            BOOLEAN       NOT NULL DEFAULT FALSE,

  -- ── Status & visibility ────────────────────────────────
  is_featured        BOOLEAN       NOT NULL DEFAULT FALSE,
  is_published       BOOLEAN       NOT NULL DEFAULT TRUE,
  badge              TEXT          CHECK (badge IN ('New', 'Best Seller', 'Sale', 'Free')),

  -- ── Download ───────────────────────────────────────────
  download_url       TEXT,         -- Payhip/Gumroad/Drive link from YT desc
  download_file_name TEXT,         -- displayed filename after auth

  -- ── Preset metadata ────────────────────────────────────
  include_count      INTEGER,
  preset_type        TEXT          NOT NULL DEFAULT 'lightroom',
  mood               TEXT,         -- "Warm", "Moody", "Clean", "Vintage", etc.
  tone               TEXT,         -- "Gold", "Teal-Orange", "B&W", etc.
  features           TEXT[]        NOT NULL DEFAULT '{}',
  compatibility      TEXT[]        NOT NULL DEFAULT '{"Lightroom Classic","Lightroom CC","Camera Raw"}',
  ai_tags            TEXT[]        NOT NULL DEFAULT '{}',

  -- ── Stats (can be updated via admin) ───────────────────
  rating             NUMERIC(3,2)  NOT NULL DEFAULT 5.0
                                   CHECK (rating >= 0 AND rating <= 5),
  review_count       INTEGER       NOT NULL DEFAULT 0,

  -- ── Ordering & timestamps ──────────────────────────────
  order_index        INTEGER       NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Auto-update updated_at on row change ──────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER presets_updated_at
  BEFORE UPDATE ON presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: preset_images
-- ============================================================
CREATE TABLE IF NOT EXISTS preset_images (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id   UUID        NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  url         TEXT        NOT NULL,
  alt_text    TEXT,
  order_index INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: tags
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

-- ============================================================
-- TABLE: preset_tags  (junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS preset_tags (
  preset_id UUID NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  tag_id    UUID NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  PRIMARY KEY (preset_id, tag_id)
);

-- ============================================================
-- INDEXES — for fast filtering and search
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_presets_category    ON presets(category_id);
CREATE INDEX IF NOT EXISTS idx_presets_published   ON presets(is_published);
CREATE INDEX IF NOT EXISTS idx_presets_featured    ON presets(is_featured);
CREATE INDEX IF NOT EXISTS idx_presets_free        ON presets(is_free);
CREATE INDEX IF NOT EXISTS idx_presets_order       ON presets(order_index);
CREATE INDEX IF NOT EXISTS idx_presets_slug        ON presets(slug);
CREATE INDEX IF NOT EXISTS idx_presets_youtube_id  ON presets(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_preset_images_order ON preset_images(preset_id, order_index);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_presets_fts ON presets
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(tagline, '') || ' ' || coalesce(description, '')));

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE presets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_tags   ENABLE ROW LEVEL SECURITY;

-- Public can read published presets
CREATE POLICY "Public can read published presets"
  ON presets FOR SELECT
  USING (is_published = TRUE);

-- Public can read all categories
CREATE POLICY "Public can read categories"
  ON categories FOR SELECT
  USING (TRUE);

-- Public can read preset images for published presets
CREATE POLICY "Public can read preset images"
  ON preset_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM presets
      WHERE presets.id = preset_images.preset_id
        AND presets.is_published = TRUE
    )
  );

-- Public can read tags
CREATE POLICY "Public can read tags"
  ON tags FOR SELECT
  USING (TRUE);

-- Public can read preset_tags
CREATE POLICY "Public can read preset_tags"
  ON preset_tags FOR SELECT
  USING (TRUE);

-- NOTE: Admin operations use the SERVICE ROLE KEY which bypasses RLS entirely.
-- No additional write policies needed.
