-- ═══════════════════════════════════════════════════════════════
-- 021_download_analytics.sql
-- Production Download Analytics System
--
-- Extends the existing preset counters (migration 008: presets.download_count
-- + increment_preset_downloads RPC) with:
--   • separate free / paid counters on presets
--   • a rich download_events ledger (one row per genuine download)
--   • an atomic, dedup-aware record_preset_download() RPC that is the
--     ONE write path — inserts the event AND bumps the counters in a
--     single transaction, so concurrent downloads can never double-count
--     or lose an increment.
--
-- The counter is incremented ONLY from server routes at the exact point a
-- download URL is successfully served (never on views, clicks, password
-- attempts, checkout, or failures). Duplicate downloads within a short
-- cooldown (same user/IP + preset) are suppressed.
--
-- Idempotent — safe to re-run. Existing presets keep their current
-- download_count; the new free/paid columns initialise to 0.
-- ═══════════════════════════════════════════════════════════════

-- ── Separate free / paid counters (total stays in download_count) ──
ALTER TABLE presets ADD COLUMN IF NOT EXISTS downloads_free INTEGER NOT NULL DEFAULT 0;
ALTER TABLE presets ADD COLUMN IF NOT EXISTS downloads_paid INTEGER NOT NULL DEFAULT 0;

-- ── Download event ledger ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS download_events (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  preset_id      uuid NULL REFERENCES presets(id) ON DELETE SET NULL,
  preset_slug    text NOT NULL,
  download_type  text NOT NULL CHECK (download_type IN ('free','paid')),
  actor          text NOT NULL CHECK (actor IN ('anonymous','user')),
  firebase_uid   text NULL,
  ip_hash        text NULL,           -- salted SHA-256 prefix, never a raw IP
  country        text NULL,
  version        text NULL,           -- app/build version at download time
  device         text NULL,           -- coarse: mobile | tablet | desktop
  referrer       text NULL,
  order_reference text NULL,          -- paid: order/token id for auditing
  dedup_key      text NOT NULL        -- (actor-id):(preset) — drives cooldown suppression
);

CREATE INDEX IF NOT EXISTS idx_download_events_preset   ON download_events (preset_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_download_events_time     ON download_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_download_events_slug     ON download_events (preset_slug);
CREATE INDEX IF NOT EXISTS idx_download_events_type     ON download_events (download_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_download_events_dedup    ON download_events (dedup_key, occurred_at DESC);

ALTER TABLE download_events ENABLE ROW LEVEL SECURITY;  -- service-role only, no public policies

-- ── The single write path: atomic, dedup-aware ────────────────
-- Returns (counted, total) — counted=false means a duplicate within the
-- cooldown window was suppressed. The UPDATE is atomic under concurrency;
-- the dedup pre-check is best-effort (a rare simultaneous double is the
-- worst case, never a lost or negative count).
CREATE OR REPLACE FUNCTION record_preset_download(
  p_preset_id        uuid,
  p_preset_slug      text,
  p_type             text,
  p_actor            text,
  p_uid              text,
  p_ip_hash          text,
  p_dedup_key        text,
  p_cooldown_seconds integer,
  p_country          text DEFAULT NULL,
  p_version          text DEFAULT NULL,
  p_device           text DEFAULT NULL,
  p_referrer         text DEFAULT NULL,
  p_order_reference  text DEFAULT NULL
)
RETURNS TABLE(counted boolean, total bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent integer;
BEGIN
  -- Duplicate suppression: same dedup_key seen within the cooldown window
  SELECT count(*) INTO v_recent
  FROM download_events
  WHERE dedup_key = p_dedup_key
    AND occurred_at > now() - make_interval(secs => GREATEST(p_cooldown_seconds, 0));

  IF v_recent > 0 THEN
    RETURN QUERY
      SELECT false, COALESCE((SELECT download_count FROM presets WHERE id = p_preset_id), 0)::bigint;
    RETURN;
  END IF;

  INSERT INTO download_events(
    preset_id, preset_slug, download_type, actor, firebase_uid, ip_hash,
    country, version, device, referrer, order_reference, dedup_key
  ) VALUES (
    p_preset_id, p_preset_slug, p_type, p_actor, p_uid, p_ip_hash,
    p_country, p_version, p_device, p_referrer, p_order_reference, p_dedup_key
  );

  IF p_preset_id IS NOT NULL THEN
    UPDATE presets SET
      download_count = download_count + 1,
      downloads_free = downloads_free + (CASE WHEN p_type = 'free' THEN 1 ELSE 0 END),
      downloads_paid = downloads_paid + (CASE WHEN p_type = 'paid' THEN 1 ELSE 0 END)
    WHERE id = p_preset_id;
  END IF;

  RETURN QUERY
    SELECT true, COALESCE((SELECT download_count FROM presets WHERE id = p_preset_id), 0)::bigint;
END;
$$;

-- ── Admin aggregate: per-preset rollup with windowed counts ────
CREATE OR REPLACE FUNCTION preset_download_stats()
RETURNS TABLE(
  preset_id     uuid,
  preset_slug   text,
  total         bigint,
  free          bigint,
  paid          bigint,
  today         bigint,
  this_week     bigint,
  this_month    bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.slug,
    p.download_count::bigint,
    p.downloads_free::bigint,
    p.downloads_paid::bigint,
    COALESCE(t.today, 0),
    COALESCE(t.week, 0),
    COALESCE(t.month, 0)
  FROM presets p
  LEFT JOIN (
    SELECT
      preset_id,
      count(*) FILTER (WHERE occurred_at >= date_trunc('day',   now())) AS today,
      count(*) FILTER (WHERE occurred_at >= date_trunc('week',  now())) AS week,
      count(*) FILTER (WHERE occurred_at >= date_trunc('month', now())) AS month
    FROM download_events
    GROUP BY preset_id
  ) t ON t.preset_id = p.id;
$$;

-- ── Admin: daily download trend (gap-filled for clean charts) ──
CREATE OR REPLACE FUNCTION download_daily_trend(p_days integer DEFAULT 30)
RETURNS TABLE(day date, total bigint, free bigint, paid bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    d::date AS day,
    COALESCE(e.total, 0)::bigint,
    COALESCE(e.free,  0)::bigint,
    COALESCE(e.paid,  0)::bigint
  FROM generate_series(
    date_trunc('day', now()) - make_interval(days => GREATEST(p_days, 1) - 1),
    date_trunc('day', now()),
    interval '1 day'
  ) d
  LEFT JOIN (
    SELECT
      date_trunc('day', occurred_at)::date AS day,
      count(*)                                        AS total,
      count(*) FILTER (WHERE download_type = 'free')  AS free,
      count(*) FILTER (WHERE download_type = 'paid')  AS paid
    FROM download_events
    WHERE occurred_at >= date_trunc('day', now()) - make_interval(days => GREATEST(p_days, 1) - 1)
    GROUP BY 1
  ) e ON e.day = d::date
  ORDER BY day;
$$;
