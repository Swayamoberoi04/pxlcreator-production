-- ============================================================
-- PXL Creator — Fix admin_resource_versions.resource_id type
-- Migration: 037_fix_version_resource_id_type.sql
--
-- Bug found via live diagnostic: migration 033 typed resource_id as UUID,
-- which works for every UUID-keyed table (homepage_sections, site_seo,
-- courses, blog_posts) but breaks for AI Studio's deliberate singleton
-- row (ai_studio_settings.id = 'default', a TEXT primary key — see
-- migration 036). Every version snapshot for AI Studio was silently
-- failing with "invalid input syntax for type uuid" — the actual setting
-- update still succeeded (crud-factory doesn't fail the request on a
-- version-snapshot error), so this was invisible in normal use and only
-- surfaced under an explicit live test.
--
-- resource_id is widened to TEXT — a UUID is valid text, so every
-- existing UUID-keyed row keeps working unchanged.
--
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE admin_resource_versions
  ALTER COLUMN resource_id TYPE TEXT USING resource_id::TEXT;
