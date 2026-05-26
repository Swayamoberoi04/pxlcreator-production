-- ============================================================
-- PXL Creator — Storage Architecture
-- Migration: 006_storage.sql
--
-- Defines RLS policies for Supabase Storage buckets.
-- Buckets must be created FIRST in the Supabase Dashboard:
--
--   Dashboard → Storage → New Bucket:
--   1. "preset-thumbnails"  — Public: YES  (thumbnails visible to all)
--   2. "preset-files"       — Public: NO   (paid downloads only)
--   3. "creator-uploads"    — Public: NO   (admin-managed originals)
--
-- After creating buckets, run this SQL to apply policies.
-- ============================================================

-- ============================================================
-- BUCKET: preset-thumbnails (public read)
-- Admin uploads via service role, public reads freely.
-- ============================================================
DROP POLICY IF EXISTS "Public can view thumbnails"        ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage thumbnails" ON storage.objects;

CREATE POLICY "Public can view thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'preset-thumbnails');

CREATE POLICY "Service role can manage thumbnails"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'preset-thumbnails'
    AND auth.role() = 'service_role'
  );

-- ============================================================
-- BUCKET: preset-files (private — signed URLs only)
-- Only service role can read/write.
-- Frontend gets a time-limited signed URL via the download API.
-- ============================================================
DROP POLICY IF EXISTS "Service role manages preset files" ON storage.objects;

CREATE POLICY "Service role manages preset files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'preset-files'
    AND auth.role() = 'service_role'
  );

-- ============================================================
-- BUCKET: creator-uploads (admin only)
-- ============================================================
DROP POLICY IF EXISTS "Service role manages creator uploads" ON storage.objects;

CREATE POLICY "Service role manages creator uploads"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'creator-uploads'
    AND auth.role() = 'service_role'
  );

-- ============================================================
-- TABLE: storage_assets (track what's in storage)
-- Maps Supabase Storage paths back to presets.
-- ============================================================
CREATE TABLE IF NOT EXISTS storage_assets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id     UUID        REFERENCES presets(id) ON DELETE SET NULL,
  bucket        TEXT        NOT NULL,   -- 'preset-thumbnails' | 'preset-files' | 'creator-uploads'
  path          TEXT        NOT NULL,   -- path within the bucket
  file_name     TEXT        NOT NULL,
  file_size     BIGINT,                 -- bytes
  mime_type     TEXT,
  asset_type    TEXT        NOT NULL    -- 'thumbnail' | 'download_file' | 'gallery_image' | 'before' | 'after'
                CHECK (asset_type IN ('thumbnail', 'download_file', 'gallery_image', 'before', 'after')),
  uploaded_by   TEXT,                   -- firebase_uid of uploader
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bucket, path)
);

CREATE INDEX IF NOT EXISTS idx_storage_assets_preset_id ON storage_assets(preset_id);
CREATE INDEX IF NOT EXISTS idx_storage_assets_bucket    ON storage_assets(bucket, path);

ALTER TABLE storage_assets ENABLE ROW LEVEL SECURITY;
-- No public policies — all access via service role only.
