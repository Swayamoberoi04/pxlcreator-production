-- ============================================================
-- PXL Creator — Homepage CMS v2
-- Migration: 034_homepage_cms_v2.sql
--
-- Extends migration 029's homepage_sections with:
--   1. `items` JSONB — repeatable sub-content (testimonials, FAQ entries,
--      stat tiles, feature cards, video links). Generic {title, subtitle,
--      image_url, link_href, link_label} shape per item, editable via the
--      shared SectionItemsEditor — one editor for every repeatable-content
--      section instead of a bespoke one per section type.
--   2. `publish_at` / `unpublish_at` — real scheduling, not just an
--      enabled/disabled flag: a section can go live in the future and/or
--      come down automatically after a date (e.g. a limited-time banner).
--
-- Adds two new sections with REAL frontend components (FAQ,
-- Announcement Banner) plus placeholder rows for sections requested that
-- don't have a frontend component yet (Featured Bundles, Statistics,
-- Testimonials split-out, Feature Cards, Featured YouTube Videos, Footer
-- Promo) — these are fully editable in the CMS today; wiring their public
-- rendering is flagged as a follow-up, same as any other honestly-scoped
-- partial rollout in this project.
--
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE homepage_sections
  ADD COLUMN IF NOT EXISTS items         JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS publish_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unpublish_at  TIMESTAMPTZ;

-- Public read policy must now respect the schedule window, not just `enabled`.
DROP POLICY IF EXISTS "Public can read homepage sections" ON homepage_sections;
CREATE POLICY "Public can read homepage sections"
  ON homepage_sections FOR SELECT
  USING (
    enabled = TRUE
    AND (publish_at IS NULL OR publish_at <= NOW())
    AND (unpublish_at IS NULL OR unpublish_at > NOW())
  );

-- ── New sections ─────────────────────────────────────────────

INSERT INTO homepage_sections (section_key, label, order_index, enabled, title, subtitle, items) VALUES
  ('faq', 'FAQ', 12, TRUE,
   'Questions, Answered',
   'Everything you need to know before you get started.',
   '[
     {"title":"Do I need a subscription to use presets?","subtitle":"No — every preset is a one-time purchase or a free YouTube unlock. Lifetime access either way, no recurring fees."},
     {"title":"Do these presets work on mobile Lightroom?","subtitle":"Yes. Every preset is delivered as both .xmp (desktop) and .dng (mobile) so it works identically in Lightroom Mobile and Lightroom Classic."},
     {"title":"What if a preset doesn''t work for my photo?","subtitle":"Presets are a starting point, not a finish line — most images need a small exposure or white-balance tweak on top. Our support team is also happy to help if something looks off."}
   ]'::jsonb
  ),
  ('announcement_banner', 'Announcement Banner', 0, FALSE,
   'New: AI Studio is here',
   'Turn any photo into a graded, on-brand edit in seconds.',
   '[]'::jsonb
  ),
  ('featured_bundles', 'Featured Bundles', 13, FALSE, NULL, NULL, '[]'::jsonb),
  ('statistics', 'Statistics', 14, FALSE, NULL, NULL, '[]'::jsonb),
  ('testimonials', 'Testimonials', 15, FALSE, NULL, NULL, '[]'::jsonb),
  ('feature_cards', 'Feature Cards', 16, FALSE, NULL, NULL, '[]'::jsonb),
  ('featured_youtube_videos', 'Featured YouTube Videos', 17, FALSE, NULL, NULL, '[]'::jsonb),
  ('footer_promo', 'Footer Promotional Content', 18, FALSE, NULL, NULL, '[]'::jsonb)
ON CONFLICT (section_key) DO NOTHING;
