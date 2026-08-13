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

    const [dailyRes, categoryRes, couponRes, topProductsRes] = await Promise.all([
      supabase.rpc("bi_daily_revenue",       { p_from: from, p_to: to }),
      supabase.rpc("bi_revenue_by_category", { p_from: from, p_to: to }),
      supabase.rpc("bi_revenue_by_coupon",   { p_from: from, p_to: to }),
      supabase.rpc("admin_top_presets_revenue", { p_limit: 10 }),
    ])

    if (dailyRes.error)    throw dailyRes.error
    if (categoryRes.error) throw categoryRes.error

    return NextResponse.json({
      daily:      dailyRes.data    ?? [],
      byCategory: categoryRes.data ?? [],
      byCoupon:   couponRes.data   ?? [],
      topProducts: topProductsRes.data ?? [],
    })
  } catch (err) {
    console.error("[bi/revenue]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
