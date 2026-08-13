import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { createClient }              from "@supabase/supabase-js"
import { requirePermission }         from "@/lib/admin/permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

function linearRegression(ys: number[]): { slope: number; intercept: number } {
  const n  = ys.length
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 }
  const xs = ys.map((_, i) => i)
  const sumX  = xs.reduce((s, x) => s + x, 0)
  const sumY  = ys.reduce((s, y) => s + y, 0)
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0)
  const sumXX = xs.reduce((s, x) => s + x * x, 0)
  const slope     = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

export async function GET(req: NextRequest) {
  try {
    const deny = await requirePermission("analytics:read")
    if (deny) return deny

    const supabase = db()
    const days     = parseInt(req.nextUrl.searchParams.get("days") ?? "90", 10)

    const to   = new Date()
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)

    const trendRes = await supabase.rpc("bi_daily_revenue", {
      p_from: from.toISOString(),
      p_to:   to.toISOString(),
    })
    if (trendRes.error) throw trendRes.error

    const trend = (trendRes.data ?? []) as Array<{ day: string; revenue: number; orders: number }>
    const revSeries   = trend.map((d) => d.revenue)
    const { slope, intercept } = linearRegression(revSeries)

    const forecastDays = 30
    const projected: Array<{ day: string; projected_revenue: number }> = []
    for (let i = 1; i <= forecastDays; i++) {
      const d    = new Date(to.getTime() + i * 24 * 60 * 60 * 1000)
      const yhat = Math.max(0, intercept + slope * (trend.length + i - 1))
      projected.push({ day: d.toISOString().slice(0, 10), projected_revenue: Math.round(yhat) })
    }

    const totalProjected = projected.reduce((s, p) => s + p.projected_revenue, 0)
    const last30          = revSeries.slice(-30).reduce((s, v) => s + v, 0)
    const growthPct       = last30 > 0 ? Math.round(((totalProjected - last30) / last30) * 100) : 0

    return NextResponse.json({
      historical:      trend,
      projected,
      summary: {
        dailySlope:       Math.round(slope),
        projectedMonthly: Math.round(totalProjected),
        recentMonthly:    Math.round(last30),
        growthPct,
        trend:            slope > 50 ? "strong_growth" : slope > 0 ? "growing" : slope > -50 ? "flat" : "declining",
      },
    })
  } catch (err) {
    console.error("[bi/forecast]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
