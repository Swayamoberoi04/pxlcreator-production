-- ============================================================
-- PXL Creator — Generic resource version history
-- Migration: 033_admin_resource_versions.sql
--
-- ONE table, reusable by any admin module (Homepage sections now; Courses
-- and Blog can opt in later with zero schema changes — see the
-- `versioning: true` flag on crud-factory's CrudConfig).
--
-- A snapshot of the FULL row is stored before every PUT/PATCH, so
-- "Restore" can put a resource back exactly as it was — this is what
-- audit_log (migration 023) does NOT give you: audit_log records that a
-- change happened and which fields changed, not the prior values.
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_resource_versions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_table TEXT        NOT NULL,   -- e.g. 'homepage_sections', 'courses'
  resource_id    UUID        NOT NULL,
  snapshot       JSONB       NOT NULL,   -- full row, as it was BEFORE this update
  created_by     TEXT,                   -- admin email
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_resource_versions_lookup
  ON admin_resource_versions(resource_table, resource_id, created_at DESC);

ALTER TABLE admin_resource_versions ENABLE ROW LEVEL SECURITY;
-- No public policies — service role only (admin API routes).

-- Cap history growth: keep at most the 50 most recent versions per resource.
-- Called opportunistically after each insert (see crud-factory.ts).
CREATE OR REPLACE FUNCTION prune_admin_resource_versions(p_table TEXT, p_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM admin_resource_versions
  WHERE id IN (
    SELECT id FROM admin_resource_versions
    WHERE resource_table = p_table AND resource_id = p_id
    ORDER BY created_at DESC
    OFFSET 50
  );
END;
$$ LANGUAGE plpgsql;
