import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { createClient }              from "@supabase/supabase-js"
import { requirePermission }         from "@/lib/admin/permissions"
import { parseDateRange }            from "@/lib/bi/date-range"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function GET(req: NextRequest) {
  try {
    const deny = await requirePermission("analytics:read")
    if (deny) return deny

    const supabase = db()
    const { from, to } = parseDateRange(req.nextUrl.searchParams)

    const [perfRes, copurchaseRes] = await Promise.all([
      supabase.rpc("bi_product_performance", { p_from: from, p_to: to }),
      supabase.rpc("bi_top_copurchased",     { p_limit: 10 }),
    ])

    if (perfRes.error) throw perfRes.error

    const products = (perfRes.data ?? []) as Array<{
      preset_id: string; preset_title: string; preset_slug: string
      category_name: string; price_usd: number; is_free: boolean
      views_alltime: number; downloads_total: number
      downloads_free: number; downloads_paid: number
      revenue: number; unit_sales: number
      review_count: number; rating: number; conversion_pct: number
    }>

    const topRevenue     = [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 10)
    const topDownloads   = [...products].sort((a, b) => b.downloads_total - a.downloads_total).slice(0, 10)
    const hiddenWinners  = products
      .filter((p) => !p.is_free && p.revenue > 0 && p.views_alltime < 200 && p.unit_sales >= 2)
      .slice(0, 5)
    const trafficTraps   = products
      .filter((p) => p.views_alltime > 100 && p.unit_sales === 0 && !p.is_free)
      .slice(0, 5)
    const underperformers = products
      .filter((p) => !p.is_free && p.revenue === 0 && p.views_alltime > 50)
      .slice(0, 5)

    return NextResponse.json({
      all:           products,
      topRevenue,
      topDownloads,
      hiddenWinners,
      trafficTraps,
      underperformers,
      copurchased:   copurchaseRes.data ?? [],
    })
  } catch (err) {
    console.error("[bi/products]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
