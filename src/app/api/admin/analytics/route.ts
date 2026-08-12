/**
 * GET /api/admin/analytics
 *
 * Aggregates across orders, download_events, presets, blog_posts,
 * and courses. Read-only — no crud-factory needed.
 *
 * Returns:
 *   summary   — KPI totals (see admin_analytics_summary() in migration 040)
 *   revTrend  — 30-day daily revenue + order series
 *   dlTrend   — 30-day daily download series (reuses download_daily_trend())
 *   topRevenue — top 10 presets by paid revenue (order_items)
 *   topDownloads — top 10 presets by download count (preset_download_stats())
 */

import "server-only"
import { NextResponse }      from "next/server"
import { createClient }      from "@supabase/supabase-js"
import { requirePermission } from "@/lib/admin/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET() {
  try {
    const deny = await requirePermission("analytics:read")
    if (deny) return deny

    const supabase = db()

    const [
      summaryRes,
      revTrendRes,
      dlTrendRes,
      topRevRes,
      topDlRes,
    ] = await Promise.all([
      supabase.rpc("admin_analytics_summary"),
      supabase.rpc("admin_revenue_trend",    { p_days: 30 }),
      supabase.rpc("download_daily_trend",   { p_days: 30 }),
      supabase.rpc("admin_top_presets_revenue", { p_limit: 10 }),
      supabase.rpc("preset_download_stats"),
    ])

    if (summaryRes.error) throw summaryRes.error
    if (revTrendRes.error) throw revTrendRes.error
    if (dlTrendRes.error) throw dlTrendRes.error
    if (topRevRes.error) throw topRevRes.error
    if (topDlRes.error) throw topDlRes.error

    const summary     = (summaryRes.data  as unknown[])[0] ?? {}
    const topDownloads = (topDlRes.data as { preset_slug: string; preset_id: string; total: number; free: number; paid: number; today: number; this_week: number; this_month: number }[])
      ?.sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
      .slice(0, 10) ?? []

    return NextResponse.json({
      summary,
      revTrend:     revTrendRes.data  ?? [],
      dlTrend:      dlTrendRes.data   ?? [],
      topRevenue:   topRevRes.data    ?? [],
      topDownloads,
    })
  } catch (err) {
    console.error("[api/admin/analytics]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
