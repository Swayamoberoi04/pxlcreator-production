-- ============================================================
-- PXL Creator — Community Moderation
-- Migration: 039_community_moderation.sql
--
-- Everything else moderation needs already exists in the schema
-- (012/013_community_*.sql): channel_posts.is_removed, post_comments.
-- is_removed, showcase_items.is_removed/is_featured, and — already fully
-- built, just never had an admin UI — content_reports (a user-flagging
-- queue: target_type/target_id/reason/status/reviewed_by/reviewed_at).
--
-- The one real gap: no way to ban a user. Adds that to community_profiles.
--
-- SCOPE NOTE: this migration + the admin moderation panel cover Posts,
-- Comments, Showcase, Users, and the Reports queue. Channels, Projects,
-- Teams, and community_messages (Spaces) are NOT covered this pass —
-- same crud-factory pattern, straightforward follow-up.
--
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE community_profiles
  ADD COLUMN IF NOT EXISTS is_banned     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned_reason TEXT,
  ADD COLUMN IF NOT EXISTS banned_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_community_profiles_banned ON community_profiles(is_banned) WHERE is_banned = TRUE;
