-- ═══════════════════════════════════════════════════════════════
-- 041_global_settings.sql
-- Global Site Settings — singleton table (id = 'default')
--
-- Migrates the values currently hardcoded in src/config/site.ts
-- so the admin can update brand name, socials, and policy links
-- without a code deploy. The CMS page reads this table; the public
-- site continues to use src/config/site.ts as a static fallback
-- until the admin has saved at least one row (zero-diff cutover).
--
-- Seeded with the exact current values from site.ts so the first
-- read is identical to what the site already shows.
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS global_settings (
  id                 TEXT        PRIMARY KEY DEFAULT 'default',
  brand_name         TEXT        NOT NULL DEFAULT 'PXL Creator',
  tagline            TEXT        NOT NULL DEFAULT 'Premium Cinematic Presets',
  description        TEXT,
  site_url           TEXT        NOT NULL DEFAULT 'https://www.pxlcreator.space',
  support_email      TEXT        NOT NULL DEFAULT 'creatorpxl@gmail.com',
  logo_url           TEXT,
  favicon_url        TEXT,
  social_youtube     TEXT,
  social_instagram   TEXT,
  social_twitter     TEXT,
  social_tiktok      TEXT,
  policy_terms_url   TEXT,
  policy_privacy_url TEXT,
  policy_refunds_url TEXT,
  policy_license_url TEXT,
  footer_note        TEXT,
  maintenance_mode   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'global_settings_updated_at'
  ) THEN
    CREATE TRIGGER global_settings_updated_at
      BEFORE UPDATE ON global_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- ── Seed with exact current values from src/config/site.ts ─────
INSERT INTO global_settings (
  id,
  brand_name,
  tagline,
  description,
  site_url,
  support_email,
  social_youtube,
  social_instagram
) VALUES (
  'default',
  'PXL Creator',
  'Premium Cinematic Presets',
  'Handcrafted Lightroom presets, cinematic editing tools, and creator resources for photographers and filmmakers.',
  'https://www.pxlcreator.space',
  'creatorpxl@gmail.com',
  'https://youtube.com/@pxlcreator04',
  'https://www.instagram.com/pxl_creator?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=='
)
ON CONFLICT (id) DO NOTHING;

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Public site can read brand name, socials, etc.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'global_settings'
      AND policyname = 'global_settings_public_read'
  ) THEN
    CREATE POLICY "global_settings_public_read"
      ON global_settings FOR SELECT USING (TRUE);
  END IF;
END
$$;
-- Writes go through service-role API routes only (no write policy needed).
