-- ─────────────────────────────────────────────────────────────────────────────
-- 042_bi_tracking.sql
-- Business Intelligence: tracking tables + analytics SQL functions
-- ADDITIVE ONLY — zero changes to existing tables or counts
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── TRACKING TABLES ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS search_events (
  id           bigserial    PRIMARY KEY,
  occurred_at  timestamptz  NOT NULL DEFAULT now(),
  query        text         NOT NULL,
  result_count integer,
  has_results  boolean      GENERATED ALWAYS AS (COALESCE(result_count, 0) > 0) STORED,
  source       text         NOT NULL DEFAULT 'preset_grid',
  clicked_id   uuid,
  firebase_uid text,
  ip_hash      text,
  device       text
);

CREATE INDEX IF NOT EXISTS idx_se_occurred_at  ON search_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_se_query        ON search_events(query);
CREATE INDEX IF NOT EXISTS idx_se_has_results  ON search_events(has_results);

ALTER TABLE search_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "se_insert" ON search_events FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id             bigserial    PRIMARY KEY,
  occurred_at    timestamptz  NOT NULL DEFAULT now(),
  firebase_uid   text,
  event_type     text         NOT NULL
    CHECK (event_type IN ('upload', 'analyze', 'analyze_failed', 'cancelled')),
  processing_ms  integer,
  is_error       boolean      NOT NULL DEFAULT false,
  preset_applied text,
  ip_hash        text,
  device         text
);

CREATE INDEX IF NOT EXISTS idx_aue_occurred_at ON ai_usage_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_aue_event_type  ON ai_usage_events(event_type);

ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aue_insert" ON ai_usage_events FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bi_funnel_events (
  id            bigserial    PRIMARY KEY,
  occurred_at   timestamptz  NOT NULL DEFAULT now(),
  session_key   text,
  firebase_uid  text,
  event_type    text         NOT NULL
    CHECK (event_type IN (
      'view_preset', 'view_bundle',
      'add_to_cart', 'remove_from_cart',
      'checkout_open', 'payment_attempted',
      'payment_success', 'payment_failed',
      'download_completed'
    )),
  resource_id   text,
  resource_type text,
  order_id      text,
  ip_hash       text,
  device        text
);

CREATE INDEX IF NOT EXISTS idx_bfe_occurred_at ON bi_funnel_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_bfe_event_type  ON bi_funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_bfe_session     ON bi_funnel_events(session_key);

ALTER TABLE bi_funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bfe_insert" ON bi_funnel_events FOR INSERT WITH CHECK (true);

-- ─── BI SQL FUNCTIONS (SECURITY DEFINER) ─────────────────────────────────────

-- Gap-filled daily revenue — always returns every day in range, even zero days
CREATE OR REPLACE FUNCTION bi_daily_revenue(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(day date, revenue numeric, orders bigint, aov numeric)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    d::date                                                      AS day,
    COALESCE(e.revenue, 0)                                       AS revenue,
    COALESCE(e.orders,  0)                                       AS orders,
    CASE WHEN COALESCE(e.orders, 0) > 0
         THEN ROUND(COALESCE(e.revenue, 0) / e.orders, 2)
         ELSE 0
    END                                                          AS aov
  FROM generate_series(
    date_trunc('day', p_from),
    date_trunc('day', p_to),
    '1 day'::interval
  ) d
  LEFT JOIN (
    SELECT
      date_trunc('day', paid_at)::date AS day,
      SUM(total_inr)                   AS revenue,
      COUNT(*)                         AS orders
    FROM orders
    WHERE status = 'paid'
      AND paid_at BETWEEN p_from AND p_to
    GROUP BY 1
  ) e ON e.day = d::date
  ORDER BY day;
$$;

-- Product performance: preset stats + download events + order revenue in period
CREATE OR REPLACE FUNCTION bi_product_performance(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(
  preset_id       uuid,
  preset_title    text,
  preset_slug     text,
  category_name   text,
  price_usd       numeric,
  is_free         boolean,
  views_alltime   bigint,
  downloads_total bigint,
  downloads_free  bigint,
  downloads_paid  bigint,
  revenue         numeric,
  unit_sales      bigint,
  review_count    integer,
  rating          numeric,
  conversion_pct  numeric
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id,
    p.title,
    p.slug,
    c.name                           AS category_name,
    p.price::numeric,
    p.is_free,
    p.view_count::bigint             AS views_alltime,
    COALESCE(de.total_dl, 0)         AS downloads_total,
    COALESCE(de.free_dl,  0)         AS downloads_free,
    COALESCE(de.paid_dl,  0)         AS downloads_paid,
    COALESCE(rev.revenue, 0)         AS revenue,
    COALESCE(rev.sales,   0)::bigint AS unit_sales,
    p.review_count,
    p.rating::numeric,
    CASE WHEN p.view_count > 0
         THEN ROUND((COALESCE(rev.sales, 0)::numeric / p.view_count) * 100, 2)
         ELSE 0
    END                              AS conversion_pct
  FROM presets p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN (
    SELECT
      preset_id,
      COUNT(*)                                        AS total_dl,
      COUNT(*) FILTER (WHERE download_type = 'free') AS free_dl,
      COUNT(*) FILTER (WHERE download_type = 'paid') AS paid_dl
    FROM download_events
    WHERE occurred_at BETWEEN p_from AND p_to
    GROUP BY preset_id
  ) de ON de.preset_id = p.id
  LEFT JOIN (
    SELECT
      oi.preset_id::uuid              AS pid,
      SUM(oi.price_inr * oi.quantity)::numeric AS revenue,
      SUM(oi.quantity)                AS sales
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status  = 'paid'
      AND o.paid_at BETWEEN p_from AND p_to
    GROUP BY oi.preset_id
  ) rev ON rev.pid = p.id
  WHERE p.is_published = true
  ORDER BY revenue DESC NULLS LAST, downloads_total DESC NULLS LAST;
$$;

-- Co-purchase pairs (frequently bought together)
CREATE OR REPLACE FUNCTION bi_top_copurchased(p_limit integer DEFAULT 10)
RETURNS TABLE(
  preset_a_id    uuid,
  preset_b_id    uuid,
  preset_a_title text,
  preset_b_title text,
  count          bigint
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    a.preset_id::uuid AS preset_a_id,
    b.preset_id::uuid AS preset_b_id,
    a.preset_title    AS preset_a_title,
    b.preset_title    AS preset_b_title,
    COUNT(*)          AS count
  FROM order_items a
  JOIN order_items b ON a.order_id = b.order_id AND a.preset_id < b.preset_id
  JOIN orders o      ON o.id = a.order_id
  WHERE o.status = 'paid'
  GROUP BY a.preset_id, b.preset_id, a.preset_title, b.preset_title
  HAVING COUNT(*) >= 2
  ORDER BY count DESC
  LIMIT p_limit;
$$;

-- Revenue by category in period
CREATE OR REPLACE FUNCTION bi_revenue_by_category(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(category_name text, revenue numeric, unit_sales bigint, order_count bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    COALESCE(c.name, 'Uncategorised')        AS category_name,
    SUM(oi.price_inr * oi.quantity)::numeric AS revenue,
    SUM(oi.quantity)::bigint                 AS unit_sales,
    COUNT(DISTINCT oi.order_id)              AS order_count
  FROM order_items oi
  JOIN orders   o ON o.id   = oi.order_id
  JOIN presets  p ON p.id   = oi.preset_id::uuid
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE o.status  = 'paid'
    AND o.paid_at BETWEEN p_from AND p_to
  GROUP BY c.name
  ORDER BY revenue DESC;
$$;

-- Coupon performance in period
CREATE OR REPLACE FUNCTION bi_revenue_by_coupon(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(
  coupon_code      text,
  discount_type    text,
  discount_value   numeric,
  uses             bigint,
  gross_revenue    numeric,
  total_discount   numeric,
  net_revenue      numeric
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    cc.code,
    cc.discount_type,
    cc.discount_value::numeric,
    COUNT(o.id)::bigint                  AS uses,
    SUM(o.subtotal_inr)::numeric         AS gross_revenue,
    SUM(o.discount_amount_inr)::numeric  AS total_discount,
    SUM(o.total_inr)::numeric            AS net_revenue
  FROM orders o
  JOIN coupon_codes cc ON cc.id = o.coupon_id
  WHERE o.status  = 'paid'
    AND o.paid_at BETWEEN p_from AND p_to
  GROUP BY cc.code, cc.discount_type, cc.discount_value
  ORDER BY uses DESC;
$$;

-- All-time customer LTV with segment classification
CREATE OR REPLACE FUNCTION bi_customer_ltv()
RETURNS TABLE(
  customer_key    text,
  email           text,
  total_orders    bigint,
  ltv_inr         numeric,
  first_purchase  timestamptz,
  last_purchase   timestamptz,
  avg_order_value numeric,
  segment         text
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    COALESCE(firebase_uid, lower(email)) AS customer_key,
    lower(email)                         AS email,
    COUNT(*)                             AS total_orders,
    SUM(total_inr)::numeric              AS ltv_inr,
    MIN(paid_at)                         AS first_purchase,
    MAX(paid_at)                         AS last_purchase,
    ROUND(AVG(total_inr)::numeric, 2)    AS avg_order_value,
    CASE
      WHEN COUNT(*) >= 5
           AND MAX(paid_at) >= NOW() - INTERVAL '90 days'  THEN 'power'
      WHEN COUNT(*) >= 2
           AND MAX(paid_at) >= NOW() - INTERVAL '90 days'  THEN 'returning'
      WHEN COUNT(*) = 1
           AND MAX(paid_at) >= NOW() - INTERVAL '60 days'  THEN 'new'
      WHEN MAX(paid_at) < NOW() - INTERVAL '180 days'      THEN 'dormant'
      WHEN MAX(paid_at) < NOW() - INTERVAL '90 days'       THEN 'at_risk'
      ELSE 'one_time'
    END AS segment
  FROM orders
  WHERE status = 'paid'
  GROUP BY COALESCE(firebase_uid, lower(email)), lower(email)
  ORDER BY ltv_inr DESC;
$$;

-- Search analytics summary
CREATE OR REPLACE FUNCTION bi_search_summary(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(
  total_searches       bigint,
  unique_queries       bigint,
  zero_result_count    bigint,
  zero_result_pct      numeric,
  avg_result_count     numeric,
  top_queries          jsonb
)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH period AS (
    SELECT * FROM search_events WHERE occurred_at BETWEEN p_from AND p_to
  )
  SELECT
    COUNT(*)                                           AS total_searches,
    COUNT(DISTINCT query)                              AS unique_queries,
    COUNT(*) FILTER (WHERE NOT has_results)            AS zero_result_count,
    CASE WHEN COUNT(*) > 0
         THEN ROUND(COUNT(*) FILTER (WHERE NOT has_results)::numeric / COUNT(*) * 100, 1)
         ELSE 0
    END                                                AS zero_result_pct,
    ROUND(COALESCE(AVG(result_count), 0)::numeric, 1) AS avg_result_count,
    COALESCE(
      (SELECT jsonb_agg(q)
       FROM (
         SELECT query, COUNT(*) AS cnt
         FROM period
         GROUP BY query
         ORDER BY cnt DESC
         LIMIT 20
       ) q
      ), '[]'::jsonb
    )                                                  AS top_queries
  FROM period;
$$;

-- AI Studio usage analytics
CREATE OR REPLACE FUNCTION bi_ai_summary(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(
  total_uploads      bigint,
  total_analyses     bigint,
  total_errors       bigint,
  error_rate         numeric,
  avg_processing_ms  numeric,
  unique_users       bigint,
  preset_applies     bigint
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'upload')              AS total_uploads,
    COUNT(*) FILTER (WHERE event_type = 'analyze')             AS total_analyses,
    COUNT(*) FILTER (WHERE is_error = true)                    AS total_errors,
    CASE WHEN COUNT(*) > 0
         THEN ROUND(COUNT(*) FILTER (WHERE is_error)::numeric / COUNT(*) * 100, 1)
         ELSE 0
    END                                                         AS error_rate,
    ROUND(COALESCE(
      AVG(processing_ms) FILTER (WHERE event_type = 'analyze' AND NOT is_error), 0
    )::numeric, 0)                                             AS avg_processing_ms,
    COUNT(DISTINCT firebase_uid) FILTER (WHERE firebase_uid IS NOT NULL)
                                                               AS unique_users,
    COUNT(*) FILTER (WHERE preset_applied IS NOT NULL)        AS preset_applies
  FROM ai_usage_events
  WHERE occurred_at BETWEEN p_from AND p_to;
$$;

-- Funnel stage counts from bi_funnel_events
CREATE OR REPLACE FUNCTION bi_funnel_stages(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(stage text, event_count bigint, unique_sessions bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    event_type                         AS stage,
    COUNT(*)                           AS event_count,
    COUNT(DISTINCT session_key)        AS unique_sessions
  FROM bi_funnel_events
  WHERE occurred_at BETWEEN p_from AND p_to
  GROUP BY event_type
  ORDER BY
    CASE event_type
      WHEN 'view_preset'        THEN 1
      WHEN 'view_bundle'        THEN 2
      WHEN 'add_to_cart'        THEN 3
      WHEN 'remove_from_cart'   THEN 4
      WHEN 'checkout_open'      THEN 5
      WHEN 'payment_attempted'  THEN 6
      WHEN 'payment_success'    THEN 7
      WHEN 'payment_failed'     THEN 8
      WHEN 'download_completed' THEN 9
      ELSE 10
    END;
$$;

-- Grant execute to authenticated and anon roles (service-role always has access)
GRANT EXECUTE ON FUNCTION bi_daily_revenue(timestamptz, timestamptz)             TO service_role;
GRANT EXECUTE ON FUNCTION bi_product_performance(timestamptz, timestamptz)        TO service_role;
GRANT EXECUTE ON FUNCTION bi_top_copurchased(integer)                             TO service_role;
GRANT EXECUTE ON FUNCTION bi_revenue_by_category(timestamptz, timestamptz)        TO service_role;
GRANT EXECUTE ON FUNCTION bi_revenue_by_coupon(timestamptz, timestamptz)          TO service_role;
GRANT EXECUTE ON FUNCTION bi_customer_ltv()                                        TO service_role;
GRANT EXECUTE ON FUNCTION bi_search_summary(timestamptz, timestamptz)              TO service_role;
GRANT EXECUTE ON FUNCTION bi_ai_summary(timestamptz, timestamptz)                  TO service_role;
GRANT EXECUTE ON FUNCTION bi_funnel_stages(timestamptz, timestamptz)               TO service_role;
