import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { createClient }              from "@supabase/supabase-js"
import { requirePermission }         from "@/lib/admin/permissions"
import { parseDateRange, previousPeriod, growthPct } from "@/lib/bi/date-range"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function getKpis(supabase: ReturnType<typeof db>, from: string, to: string) {
  const [ordersRes, dlRes, customersRes, failedRes, refundRes] = await Promise.all([
    supabase
      .from("orders")
      .select("total_inr, subtotal_inr, discount_amount_inr")
      .eq("status", "paid")
      .gte("paid_at", from)
      .lte("paid_at", to),

    supabase
      .from("download_events")
      .select("id", { count: "exact", head: true })
      .gte("occurred_at", from)
      .lte("occurred_at", to),

    supabase
      .from("orders")
      .select("firebase_uid, email")
      .eq("status", "paid")
      .gte("paid_at", from)
      .lte("paid_at", to),

    supabase
      .from("payment_transactions")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", from)
      .lte("created_at", to),

    supabase
      .from("orders")
      .select("total_inr")
      .eq("status", "refunded")
      .gte("updated_at", from)
      .lte("updated_at", to),
  ])

  const paidOrders  = ordersRes.data ?? []
  const netRevenue  = paidOrders.reduce((s, o) => s + (o.total_inr ?? 0), 0)
  const grossRevenue = paidOrders.reduce((s, o) => s + (o.subtotal_inr ?? 0), 0)
  const totalDiscount = paidOrders.reduce((s, o) => s + (o.discount_amount_inr ?? 0), 0)
  const orderCount  = paidOrders.length
  const aov         = orderCount > 0 ? netRevenue / orderCount : 0

  const uniqueCustomers = new Set(
    customersRes.data?.map((o) => o.firebase_uid ?? o.email) ?? []
  ).size

  const downloads     = dlRes.count ?? 0
  const failedPayments = failedRes.count ?? 0
  const refundAmount  = (refundRes.data ?? []).reduce((s, o) => s + (o.total_inr ?? 0), 0)

  return { netRevenue, grossRevenue, totalDiscount, orderCount, aov, uniqueCustomers, downloads, failedPayments, refundAmount }
}

export async function GET(req: NextRequest) {
  try {
    const deny = await requirePermission("analytics:read")
    if (deny) return deny

    const supabase = db()
    const curr     = parseDateRange(req.nextUrl.searchParams)
    const prev     = previousPeriod(curr)

    const [currentKpis, prevKpis, trendRes] = await Promise.all([
      getKpis(supabase, curr.from, curr.to),
      getKpis(supabase, prev.from, prev.to),
      supabase.rpc("bi_daily_revenue", { p_from: curr.from, p_to: curr.to }),
    ])

    const growth = {
      revenue:   growthPct(currentKpis.netRevenue,     prevKpis.netRevenue),
      orders:    growthPct(currentKpis.orderCount,     prevKpis.orderCount),
      customers: growthPct(currentKpis.uniqueCustomers, prevKpis.uniqueCustomers),
      downloads: growthPct(currentKpis.downloads,      prevKpis.downloads),
    }

    return NextResponse.json({
      current:  currentKpis,
      previous: prevKpis,
      growth,
      trend:    trendRes.data ?? [],
    })
  } catch (err) {
    console.error("[bi/overview]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
