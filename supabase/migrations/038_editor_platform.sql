-- ============================================================
-- PXL Creator — Editor Platform CMS
-- Migration: 038_editor_platform.sql
--
-- The "Editor Platform" is the in-browser WebGL2 photo editor launched
-- from AI Studio's "Continue editing" button (src/lib/editor/**,
-- src/components/editor/**) — a client-side tool, not a marketing page.
-- There is no Hero/Pricing/CTA surface to manage. What genuinely maps to
-- admin content:
--   1. Quick Look presets — the one-click looks in the left sidebar,
--      currently hardcoded in src/lib/editor/presets.ts.
--   2. Changelog — a new "What's New" panel in the editor TopBar.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ── Quick Look presets ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS editor_quick_presets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_key   TEXT        NOT NULL UNIQUE,
  name         TEXT        NOT NULL,
  adjustments  JSONB       NOT NULL DEFAULT '{}',  -- Partial<Adjustments> — see src/lib/editor/adjustments.ts
  order_index  INTEGER     NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION editor_quick_presets_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS editor_quick_presets_updated_at ON editor_quick_presets;
CREATE TRIGGER editor_quick_presets_updated_at
  BEFORE UPDATE ON editor_quick_presets
  FOR EACH ROW EXECUTE FUNCTION editor_quick_presets_touch_updated_at();

ALTER TABLE editor_quick_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active quick presets" ON editor_quick_presets;
CREATE POLICY "Public can read active quick presets"
  ON editor_quick_presets FOR SELECT
  USING (is_active = TRUE);

-- Seed — exact current values from src/lib/editor/presets.ts.
INSERT INTO editor_quick_presets (preset_key, name, adjustments, order_index) VALUES
  ('punch',           'Punch',           '{"contrast":22,"clarity":18,"vibrance":24,"blacks":-10}'::jsonb, 1),
  ('warm-film',       'Warm Film',       '{"temperature":18,"contrast":-8,"highlights":-14,"blacks":12,"vibrance":10}'::jsonb, 2),
  ('cool-editorial',  'Cool Editorial',  '{"temperature":-16,"tint":6,"contrast":12,"shadows":10,"saturation":-8}'::jsonb, 3),
  ('matte-fade',      'Matte Fade',      '{"blacks":24,"contrast":-14,"highlights":-8,"saturation":-12,"dehaze":-6}'::jsonb, 4),
  ('crisp-hdr',       'Crisp HDR',       '{"shadows":26,"highlights":-30,"clarity":22,"dehaze":16,"sharpening":30}'::jsonb, 5),
  ('mono',            'Mono',            '{"saturation":-100,"contrast":18,"clarity":14,"sharpening":20}'::jsonb, 6)
ON CONFLICT (preset_key) DO NOTHING;

-- ── Changelog ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS editor_changelog (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  version_label  TEXT        NOT NULL UNIQUE,
  title          TEXT        NOT NULL,
  description    TEXT,
  released_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_published   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_editor_changelog_released ON editor_changelog(released_at DESC);

CREATE OR REPLACE FUNCTION editor_changelog_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS editor_changelog_updated_at ON editor_changelog;
CREATE TRIGGER editor_changelog_updated_at
  BEFORE UPDATE ON editor_changelog
  FOR EACH ROW EXECUTE FUNCTION editor_changelog_touch_updated_at();

ALTER TABLE editor_changelog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published changelog" ON editor_changelog;
CREATE POLICY "Public can read published changelog"
  ON editor_changelog FOR SELECT
  USING (is_published = TRUE);

-- Seed — real entries reflecting the editor's actual shipped phase history.
INSERT INTO editor_changelog (version_label, title, description, released_at) VALUES
  ('Phase 4', 'AI Assistant', 'In-browser scene analysis, one-click recommendations, natural-language prompt editing, style matching from a reference photo, and shareable recipes — no cloud LLM required.', '2026-07-20T00:00:00Z'),
  ('Phase 3B', 'Healing & Spot Removal', 'Remove blemishes and distractions with heal or clone tools, fully non-destructive and included in export.', '2026-07-12T00:00:00Z'),
  ('Phase 3', 'Local Masking', 'Brush, linear, radial, luminance-range, and auto sky/subject masks — apply adjustments to exactly the part of the photo that needs them.', '2026-07-05T00:00:00Z'),
  ('Phase 2', 'Curves, Color Mixer & Grading', 'RGB/R/G/B tone curves, 8-band HSL color mixer, 3-way color grading wheels, vignette, grain, and noise reduction.', '2026-06-25T00:00:00Z'),
  ('Phase 1', 'Editor Launch', 'Light, color, and detail sliders, crop and straighten, before/after compare, undo/redo, and export — free, non-destructive editing after every AI Studio result.', '2026-06-15T00:00:00Z')
ON CONFLICT (version_label) DO NOTHING;
