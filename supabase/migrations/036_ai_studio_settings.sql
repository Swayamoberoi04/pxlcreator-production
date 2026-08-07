-- ============================================================
-- PXL Creator — AI Studio Settings
-- Migration: 036_ai_studio_settings.sql
--
-- A SINGLETON row (id is the literal text 'default', not a UUID) so the
-- admin API can reuse crud-factory's item routes as-is — GET/PATCH
-- /api/admin/ai-studio/default — instead of a bespoke singleton endpoint.
--
-- Scope decision: the actual Gemini model IDs (GEMINI_MODEL /
-- GEMINI_IMAGE_MODEL) stay as env vars, NOT here. They're deploy-time
-- infra config — letting an admin type an arbitrary model string into a
-- form is how you silently break the AI pipeline in production. Same
-- reasoning for the underlying system prompt (src/lib/ai/providers/
-- gemini-prompt.ts) — it stays code-controlled. What IS safe and useful
-- to expose: the free-tier rate limit ("Credits"), a kill switch
-- ("Feature toggles"), hero/announcement copy, the quick-vibe prompt
-- chips shown to users ("Prompt templates" — UI suggestions, not the
-- actual system prompt), FAQ, and tutorials.
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_studio_settings (
  id                   TEXT        PRIMARY KEY DEFAULT 'default',

  is_enabled           BOOLEAN     NOT NULL DEFAULT TRUE,
  free_edits_per_hour  INTEGER     NOT NULL DEFAULT 5,

  hero_badge_label     TEXT,
  hero_title           TEXT,
  hero_subtitle        TEXT,
  fine_print           TEXT,
  announcement         TEXT,       -- optional small callout, NULL = hidden

  -- Quick-vibe prompt suggestion chips shown above the prompt input.
  -- [{ "id": "golden-hour", "label": "Golden Hour", "icon": "☀", "keywords": ["warm","golden"] }]
  prompt_chips         JSONB       NOT NULL DEFAULT '[]',

  -- FAQ — reuses the same {title: question, subtitle: answer} shape as
  -- Homepage's FAQ section (same SectionItemsEditor, same FAQSection component).
  faq_items            JSONB       NOT NULL DEFAULT '[]',

  -- Tutorials — {title, subtitle: description, image_url: thumbnail, link_href: video/article URL}
  tutorial_items        JSONB       NOT NULL DEFAULT '[]',

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION ai_studio_settings_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_studio_settings_updated_at ON ai_studio_settings;
CREATE TRIGGER ai_studio_settings_updated_at
  BEFORE UPDATE ON ai_studio_settings
  FOR EACH ROW EXECUTE FUNCTION ai_studio_settings_touch_updated_at();

ALTER TABLE ai_studio_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read AI Studio settings" ON ai_studio_settings;
CREATE POLICY "Public can read AI Studio settings"
  ON ai_studio_settings FOR SELECT
  USING (true);

-- Writes: service role only (admin API routes).

-- ── Seed — exact current hardcoded values from src/app/studio/page.tsx
--    and src/components/studio/AestheticChips.tsx, so wiring this in is
--    a zero-diff change until an admin edits it. ──

INSERT INTO ai_studio_settings (
  id, is_enabled, free_edits_per_hour, hero_badge_label, hero_title, hero_subtitle, fine_print, prompt_chips
) VALUES (
  'default', TRUE, 5,
  'AI Studio · Beta',
  'Describe the look. AI does the edit.',
  'Upload any photo, write what mood you''re after — PXL Vision AI reads your image, applies a custom colour grade, and recommends the preset that matches it best.',
  'PXL Vision AI · Images are processed in-memory and never stored · 5 edits / hour per session · Results are approximate — real Lightroom presets give the full look.',
  '[
    {"id":"golden-hour","label":"Golden Hour","icon":"☀","keywords":["warm","golden","amber","sunset","sun"]},
    {"id":"cinematic","label":"Cinematic","icon":"◈","keywords":["cinematic","dramatic","contrast","rich","dark"]},
    {"id":"film-grain","label":"Film Vintage","icon":"⬡","keywords":["grain","vintage","faded","analogue","film"]},
    {"id":"cool-edit","label":"Cool & Clean","icon":"◇","keywords":["cool","teal","minimal","airy","blue","crisp"]},
    {"id":"moody","label":"Moody Dark","icon":"●","keywords":["moody","dark","shadows","noir","atmospheric"]},
    {"id":"portrait","label":"Portrait Glow","icon":"◯","keywords":["portrait","skin","soft","warm","glow","faces"]},
    {"id":"vibrant","label":"Vibrant","icon":"✦","keywords":["vibrant","saturated","punchy","vivid","bold"]}
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
