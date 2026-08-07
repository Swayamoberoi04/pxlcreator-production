-- ============================================================
-- PXL Creator — Global SEO Manager
-- Migration: 035_site_seo.sql
--
-- Individual content (a preset, a course, a blog post) already has its
-- own SEO fields — that's the shared SEOForm component reused on every
-- edit page. This table covers the OTHER half: index/listing pages that
-- aren't a database record at all (Homepage, /store, /bundles, /courses,
-- /blog, /community, /studio) but still need admin-editable meta title,
-- description, keywords, OG image/type, Twitter card, canonical URL, and
-- a raw JSON-LD schema override.
--
-- Seeded with each page's CURRENT hardcoded metadata (see the page files'
-- existing `export const metadata`) so wiring this in changes nothing
-- until an admin edits it — same zero-diff cutover as every other module.
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS site_seo (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key         TEXT        NOT NULL UNIQUE,   -- e.g. 'home', 'store', 'blog'
  label            TEXT        NOT NULL,          -- admin-facing display name
  path             TEXT        NOT NULL,          -- e.g. '/', '/store' — for the "View page" link

  seo_title        TEXT,
  seo_description  TEXT,
  seo_keywords     TEXT,
  og_image_url     TEXT,
  og_type          TEXT        NOT NULL DEFAULT 'website',
  twitter_card     TEXT        NOT NULL DEFAULT 'summary_large_image'
                    CHECK (twitter_card IN ('summary', 'summary_large_image')),
  canonical_url    TEXT,
  schema_json      JSONB,                          -- optional raw JSON-LD override

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION site_seo_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS site_seo_updated_at ON site_seo;
CREATE TRIGGER site_seo_updated_at
  BEFORE UPDATE ON site_seo
  FOR EACH ROW EXECUTE FUNCTION site_seo_touch_updated_at();

ALTER TABLE site_seo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read site SEO" ON site_seo;
CREATE POLICY "Public can read site SEO"
  ON site_seo FOR SELECT
  USING (true);

-- Writes: service role only (admin API routes).

-- ── Seed — exact current values from each page's hardcoded metadata ──

INSERT INTO site_seo (page_key, label, path, seo_title, seo_description, seo_keywords) VALUES
  ('home', 'Homepage', '/',
   'PXL Creator — Premium Cinematic Presets',
   'Handcrafted Lightroom presets, cinematic editing tools, and creator resources for photographers and filmmakers.',
   'lightroom presets, cinematic presets, photo editing presets, lightroom mobile presets, cinematic lightroom presets, film emulation presets, portrait presets, landscape presets, street photography presets, creator tools, photography presets, PXL Creator'
  ),
  ('store', 'Store (Presets)', '/store',
   'Store — Preset Packs & Free Downloads',
   'Browse 24 PXL Creator preset packs — 12 free downloads and tiered paid packs from ₹420. Cinematic, film emulation, portrait, landscape and street. Instant download.',
   NULL
  ),
  ('bundles', 'Bundles', '/bundles',
   'Bundles — PXL Creator',
   'Save more with PXL Creator preset bundles. Hand-curated collections at one discounted price — get the complete look instantly.',
   NULL
  ),
  ('courses', 'Courses', '/courses',
   'Courses',
   'Learn photography editing, colour grading and business from PXL Creator. Practical video courses built for real creators.',
   NULL
  ),
  ('blog', 'Blog', '/blog',
   'Blog',
   'Photography tutorials, editing tips, gear reviews and behind-the-scenes from the PXL Creator team.',
   NULL
  ),
  ('community', 'Community', '/community', NULL, NULL, NULL),
  ('ai_studio', 'AI Studio', '/studio',
   'AI Studio — Describe the look. AI does the edit.',
   'Upload any photo and describe the mood in plain English. PXL Vision AI analyses your image, applies a custom colour grade, and recommends the PXL preset that matches it best.',
   NULL
  )
ON CONFLICT (page_key) DO NOTHING;
