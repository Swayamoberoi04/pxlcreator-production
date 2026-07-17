-- ═══════════════════════════════════════════════════════════════
-- 020_preview_engine.sql
-- Phase 4B — AI Preview Generation Engine (blueprint §11)
--
-- Tables: preview_jobs, preview_cache, prompt_history, provider_logs
-- Storage: private "ai-previews" bucket (signed-URL access only)
--
-- All access is server-side via the service-role key. RLS is enabled
-- with NO public policies — anonymous/authenticated clients cannot
-- read or write these tables directly.
-- ═══════════════════════════════════════════════════════════════

-- ── Job store & audit trail ────────────────────────────────────
CREATE TABLE IF NOT EXISTS preview_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL CHECK (status IN
                    ('queued','generating','qa','ready','degraded','failed','expired','deleted')),
  client_ip_hash  text NOT NULL,
  image_phash     text NOT NULL,
  image_meta      jsonb NOT NULL DEFAULT '{}'::jsonb,
  preset_slug     text NOT NULL,
  style_profile   text NOT NULL,
  prompt_version  text NOT NULL,
  provider        text NULL,
  provider_ms     integer NULL,
  qa_verdict      jsonb NULL,
  qa_retries      smallint NOT NULL DEFAULT 0,
  preview_path    text NULL,          -- storage key in ai-previews bucket
  preview_data_uri text NULL,         -- inline fallback when storage upload fails
  expires_at      timestamptz NULL,
  error_code      text NULL,
  total_ms        integer NULL,
  cost_usd        numeric(8,5) NULL
);

CREATE INDEX IF NOT EXISTS idx_preview_jobs_status ON preview_jobs (status, updated_at);
CREATE INDEX IF NOT EXISTS idx_preview_jobs_cache  ON preview_jobs (image_phash, preset_slug, prompt_version)
  WHERE status = 'ready';

-- ── Exact-result cache ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS preview_cache (
  cache_key       text PRIMARY KEY,   -- phash:presetSlug:promptVersion:providerId
  preview_path    text NULL,
  preview_data_uri text NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  hit_count       integer NOT NULL DEFAULT 0,
  source_job_id   uuid NULL REFERENCES preview_jobs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_preview_cache_expiry ON preview_cache (expires_at);

-- ── Prompt evolution history (append-only) ─────────────────────
CREATE TABLE IF NOT EXISTS prompt_history (
  prompt_version    text PRIMARY KEY,
  created_at        timestamptz NOT NULL DEFAULT now(),
  identity_preamble text NOT NULL,
  template_notes    text NOT NULL,
  active            boolean NOT NULL DEFAULT false
);

-- Seed the launch prompt version (identity lock verbatim from blueprint §4.2)
INSERT INTO prompt_history (prompt_version, identity_preamble, template_notes, active)
VALUES (
  'p4.0.0',
  'Apply ONLY a photographic color grade to this image. Do not add, remove, move, or reshape any object or person. Preserve faces, body proportions, composition, framing, camera angle, perspective, background content, and all textures exactly. Do not crop, rotate, or change aspect ratio. The result must be the same photograph with different color treatment only.',
  'Launch template: identity lock (Part A) + evidence-traceable grade brief (Part B) built from preset intelligence + style profile + analysis conditionals (skin clause iff hasSkinTones; exposure clause iff analysis exposure matches preset exposureTendency; lighting-character clause from scene.timeOfDay). Sanitized user mood keywords included as quoted data.',
  true
)
ON CONFLICT (prompt_version) DO NOTHING;

-- ── Provider call ledger ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_logs (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  job_id          uuid NULL REFERENCES preview_jobs(id) ON DELETE SET NULL,
  provider        text NOT NULL,
  operation       text NOT NULL,      -- 'edit' | 'qa_referee'
  latency_ms      integer NOT NULL,
  http_status     integer NULL,
  tokens_or_units jsonb NULL,
  cost_usd        numeric(8,5) NULL,
  error           text NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_logs_time ON provider_logs (created_at);

-- ── Lock down: RLS on, no public policies (service role bypasses) ──
ALTER TABLE preview_jobs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE preview_cache  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_logs  ENABLE ROW LEVEL SECURITY;

-- ── Private storage bucket for generated previews ──────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-previews', 'ai-previews', false)
ON CONFLICT (id) DO NOTHING;
