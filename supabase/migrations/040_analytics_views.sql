-- ═══════════════════════════════════════════════════════════════
-- 040_analytics_views.sql
-- Admin Analytics — aggregate SQL functions
--
-- Adds three SECURITY DEFINER functions called exclusively from
-- /api/admin/analytics (service role). No new tables needed —
-- all data lives in existing commerce/download/content tables.
--
-- Note on "display stats":
--   blog_posts.views_count, courses.students_count/sales_count/
--   revenue_cached are admin-editable display fields (see migrations
--   030 and 032 comments) — NOT automatically incremented by visits.
--   The admin UI labels these "Display value" so the operator knows
--   they reflect whatever was manually entered.
--
-- Real-tracked counters:
--   orders/order_items  — Razorpay-confirmed paid orders
--   download_events     — fired on actual file delivery (021)
--   presets.view_count  — RPC increment_preset_views on detail page (003)
--   presets.download_count — record_preset_download RPC (021)
--
-- Idempotent — safe to re-run (CREATE OR REPLACE).
-- ═══════════════════════════════════════════════════════════════

-- ── Overall KPI summary ────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_analytics_summary()
RETURNS TABLE(
  total_revenue_inr     numeric,
  paid_orders_count     bigint,
  total_downloads       bigint,
  free_downloads        bigint,
  paid_downloads        bigint,
  total_preset_views    bigint,
  total_blog_views      bigint,
  total_course_students bigint,
  total_course_revenue  numeric,
  revenue_today         numeric,
  revenue_this_week     numeric,
  revenue_this_month    numeric,
  orders_today          bigint,
  orders_this_week      bigint,
  orders_this_month     bigint,
  downloads_today       bigint,
  downloads_this_week   bigint,
  downloads_this_month  bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(SUM(o.total_inr), 0)                                                          AS total_revenue_inr,
    COUNT(o.id)                                                                             AS paid_orders_count,
    COALESCE((SELECT SUM(download_count) FROM presets), 0)                                 AS total_downloads,
    COALESCE((SELECT SUM(downloads_free) FROM presets), 0)                                 AS free_downloads,
    COALESCE((SELECT SUM(downloads_paid) FROM presets), 0)                                 AS paid_downloads,
    COALESCE((SELECT SUM(view_count)     FROM presets), 0)                                 AS total_preset_views,
    COALESCE((SELECT SUM(views_count)    FROM blog_posts WHERE is_published = TRUE), 0)    AS total_blog_views,
    COALESCE((SELECT SUM(students_count) FROM courses   WHERE is_published = TRUE), 0)     AS total_course_students,
    COALESCE((SELECT SUM(revenue_cached) FROM courses   WHERE is_published = TRUE), 0)     AS total_course_revenue,
    COALESCE(SUM(o.total_inr) FILTER (WHERE o.paid_at >= date_trunc('day',   now())), 0)  AS revenue_today,
    COALESCE(SUM(o.total_inr) FILTER (WHERE o.paid_at >= date_trunc('week',  now())), 0)  AS revenue_this_week,
    COALESCE(SUM(o.total_inr) FILTER (WHERE o.paid_at >= date_trunc('month', now())), 0)  AS revenue_this_month,
    COUNT(o.id) FILTER (WHERE o.paid_at >= date_trunc('day',   now()))                     AS orders_today,
    COUNT(o.id) FILTER (WHERE o.paid_at >= date_trunc('week',  now()))                     AS orders_this_week,
    COUNT(o.id) FILTER (WHERE o.paid_at >= date_trunc('month', now()))                     AS orders_this_month,
    COALESCE((
      SELECT COUNT(*) FROM download_events
      WHERE occurred_at >= date_trunc('day', now())
    ), 0)                                                                                   AS downloads_today,
    COALESCE((
      SELECT COUNT(*) FROM download_events
      WHERE occurred_at >= date_trunc('week', now())
    ), 0)                                                                                   AS downloads_this_week,
    COALESCE((
      SELECT COUNT(*) FROM download_events
      WHERE occurred_at >= date_trunc('month', now())
    ), 0)                                                                                   AS downloads_this_month
  FROM orders o
  WHERE o.status = 'paid';
$$;

-- ── Daily revenue + order trend (gap-filled) ───────────────────
CREATE OR REPLACE FUNCTION admin_revenue_trend(p_days integer DEFAULT 30)
RETURNS TABLE(day date, revenue numeric, orders bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    d::date                      AS day,
    COALESCE(e.revenue, 0)       AS revenue,
    COALESCE(e.orders,  0)       AS orders
  FROM generate_series(
    date_trunc('day', now()) - make_interval(days => GREATEST(p_days, 1) - 1),
    date_trunc('day', now()),
    interval '1 day'
  ) d
  LEFT JOIN (
    SELECT
      date_trunc('day', paid_at)::date AS day,
      SUM(total_inr)                    AS revenue,
      COUNT(*)                          AS orders
    FROM orders
    WHERE status = 'paid'
      AND paid_at >= date_trunc('day', now()) - make_interval(days => GREATEST(p_days, 1) - 1)
    GROUP BY 1
  ) e ON e.day = d::date
  ORDER BY day;
$$;

-- ── Top presets by revenue (from actual paid order_items) ──────
CREATE OR REPLACE FUNCTION admin_top_presets_revenue(p_limit integer DEFAULT 10)
RETURNS TABLE(
  preset_id    uuid,
  preset_title text,
  preset_slug  text,
  revenue      numeric,
  unit_sales   bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    oi.preset_id,
    oi.preset_title,
    oi.preset_slug,
    SUM(oi.price_inr * oi.quantity) AS revenue,
    SUM(oi.quantity)::bigint         AS unit_sales
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.status = 'paid'
  GROUP BY oi.preset_id, oi.preset_title, oi.preset_slug
  ORDER BY revenue DESC
  LIMIT GREATEST(p_limit, 1);
$$;
