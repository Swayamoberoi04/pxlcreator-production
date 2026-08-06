-- ============================================================
-- PXL Creator — Media Library
-- Migration: 028_media_library.sql
--
-- Turns the existing `storage_assets` table (migration 006) into a real,
-- browsable media library: adds folders, dimensions, alt text, and a
-- generic "media" bucket for content that isn't tied to a specific preset
-- (course thumbnails, blog covers, homepage banners, ...).
--
-- Idempotent — safe to re-run.
--
-- Manual step required first (Supabase Dashboard → Storage → New Bucket):
--   "media"  — Public: YES
-- ============================================================

-- ── 1. Widen storage_assets for general-purpose media ──────────

ALTER TABLE storage_assets
  ADD COLUMN IF NOT EXISTS folder      TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS alt_text    TEXT,
  ADD COLUMN IF NOT EXISTS width       INTEGER,
  ADD COLUMN IF NOT EXISTS height      INTEGER,
  ADD COLUMN IF NOT EXISTS public_url  TEXT,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- preset_id is no longer the only owner a media asset can have — widen the
-- asset_type check to cover general media library uploads.
ALTER TABLE storage_assets DROP CONSTRAINT IF EXISTS storage_assets_asset_type_check;
ALTER TABLE storage_assets ADD CONSTRAINT storage_assets_asset_type_check
  CHECK (asset_type IN (
    'thumbnail', 'download_file', 'gallery_image', 'before', 'after',
    'media_image', 'media_video', 'media_document', 'banner', 'og_image'
  ));

CREATE INDEX IF NOT EXISTS idx_storage_assets_folder ON storage_assets(folder);

CREATE OR REPLACE FUNCTION storage_assets_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS storage_assets_updated_at ON storage_assets;
CREATE TRIGGER storage_assets_updated_at
  BEFORE UPDATE ON storage_assets
  FOR EACH ROW EXECUTE FUNCTION storage_assets_touch_updated_at();

-- ── 2. "media" bucket policies (public read, service-role write) ──

DROP POLICY IF EXISTS "Public can view media"        ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage media" ON storage.objects;

CREATE POLICY "Public can view media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

CREATE POLICY "Service role can manage media"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'media'
    AND auth.role() = 'service_role'
  );

-- ── 3. Canonical folder list (documentation only — enforced in the API) ──
-- Presets · Bundles · Courses · Blogs · Community · AI Studio · Editor · General
