-- ============================================================
-- PXL Creator — Homepage CMS
-- Migration: 029_homepage_sections.sql
--
-- One row per homepage section (hero, featured, testimonials, ...).
-- Admins toggle/reorder/edit these instead of editing src/app/page.tsx.
--
-- `content` is a JSONB escape hatch for section-specific fields that don't
-- fit the common columns (title/subtitle/cta/image/video) — e.g. the FAQ
-- section's question/answer list — without a schema migration per section.
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS homepage_sections (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key  TEXT        NOT NULL UNIQUE,   -- stable key, e.g. 'hero', 'featured'
  label        TEXT        NOT NULL,          -- admin-facing display name
  enabled      BOOLEAN     NOT NULL DEFAULT TRUE,
  order_index  INTEGER     NOT NULL DEFAULT 0,

  title        TEXT,
  subtitle     TEXT,
  cta_label    TEXT,
  cta_href     TEXT,
  image_url    TEXT,
  video_url    TEXT,
  content      JSONB       NOT NULL DEFAULT '{}',

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_order ON homepage_sections(order_index);

CREATE OR REPLACE FUNCTION homepage_sections_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS homepage_sections_updated_at ON homepage_sections;
CREATE TRIGGER homepage_sections_updated_at
  BEFORE UPDATE ON homepage_sections
  FOR EACH ROW EXECUTE FUNCTION homepage_sections_touch_updated_at();

ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;

-- Public (anon) can read — the homepage itself needs to render these.
DROP POLICY IF EXISTS "Public can read homepage sections" ON homepage_sections;
CREATE POLICY "Public can read homepage sections"
  ON homepage_sections FOR SELECT
  USING (true);

-- Writes: service role only (admin API routes).

-- ── Seed the 11 sections currently hardcoded in src/app/page.tsx ──
-- order_index matches their current render order. Safe to re-run:
-- ON CONFLICT means existing admin edits are never overwritten.
INSERT INTO homepage_sections (section_key, label, order_index, title, subtitle) VALUES
  ('hero',             'Hero',                        1,  NULL, NULL),
  ('featured',         'Featured Presets',             2,  NULL, NULL),
  ('manifesto',        'Manifesto',                    3,  NULL, NULL),
  ('before_after',     'Before / After Sliders',       4,  NULL, NULL),
  ('ai_studio_banner', 'AI Studio Banner',             5,  NULL, NULL),
  ('shot_using_pxl',   'Creator Showcase',             6,  NULL, NULL),
  ('social_proof',     'Testimonials & Stats',         7,  NULL, NULL),
  ('philosophy_strip', 'Philosophy Strip',             8,  NULL, NULL),
  ('giveaway_banner',  'Giveaway Banner',               9,  NULL, NULL),
  ('lead_magnet',      'Lead Magnet',                  10, NULL, NULL),
  ('cta_banner',       'Final CTA',                    11, NULL, NULL)
ON CONFLICT (section_key) DO NOTHING;
