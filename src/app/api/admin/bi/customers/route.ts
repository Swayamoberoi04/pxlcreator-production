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

    const [ltvRes, periodOrdersRes] = await Promise.all([
      supabase.rpc("bi_customer_ltv"),
      supabase
        .from("orders")
        .select("firebase_uid, email, total_inr, paid_at")
        .eq("status", "paid")
        .gte("paid_at", from)
        .lte("paid_at", to),
    ])

    if (ltvRes.error) throw ltvRes.error

    type CustomerRow = {
      customer_key: string; email: string; total_orders: number
      ltv_inr: number; first_purchase: string; last_purchase: string
      avg_order_value: number; segment: string
    }

    const allCustomers = (ltvRes.data ?? []) as CustomerRow[]

    const segments = {
      new:       allCustomers.filter((c) => c.segment === "new"),
      returning: allCustomers.filter((c) => c.segment === "returning"),
      power:     allCustomers.filter((c) => c.segment === "power"),
      one_time:  allCustomers.filter((c) => c.segment === "one_time"),
      at_risk:   allCustomers.filter((c) => c.segment === "at_risk"),
      dormant:   allCustomers.filter((c) => c.segment === "dormant"),
    }

    const topByLtv = allCustomers.slice(0, 20).map((c) => ({
      email:           c.email,
      total_orders:    c.total_orders,
      ltv_inr:         c.ltv_inr,
      avg_order_value: c.avg_order_value,
      last_purchase:   c.last_purchase,
      segment:         c.segment,
    }))

    const periodOrders = periodOrdersRes.data ?? []
    const periodCustomerKeys = new Set(
      periodOrders.map((o) => o.firebase_uid ?? o.email.toLowerCase())
    )

    const newInPeriod = allCustomers.filter(
      (c) => new Date(c.first_purchase) >= new Date(from) && new Date(c.first_purchase) <= new Date(to)
    ).length

    const returningInPeriod = allCustomers.filter(
      (c) =>
        periodCustomerKeys.has(c.customer_key) &&
        new Date(c.first_purchase) < new Date(from)
    ).length

    const totalRevenue = periodOrders.reduce((s, o) => s + (o.total_inr ?? 0), 0)
    const avgLtv = allCustomers.length > 0
      ? allCustomers.reduce((s, c) => s + c.ltv_inr, 0) / allCustomers.length
      : 0
    const maxLtv = allCustomers.length > 0
      ? Math.max(...allCustomers.map((c) => c.ltv_inr))
      : 0
    const repeatPurchaseRate = allCustomers.length > 0
      ? Math.round((allCustomers.filter((c) => c.total_orders >= 2).length / allCustomers.length) * 100)
      : 0

    return NextResponse.json({
      summary: {
        totalCustomers:      allCustomers.length,
        newInPeriod,
        returningInPeriod,
        avgLtv:              Math.round(avgLtv),
        maxLtv,
        repeatPurchaseRate,
        periodRevenue:       totalRevenue,
      },
      segmentCounts: {
        new:       segments.new.length,
        returning: segments.returning.length,
        power:     segments.power.length,
        one_time:  segments.one_time.length,
        at_risk:   segments.at_risk.length,
        dormant:   segments.dormant.length,
      },
      topByLtv,
      dormantToReengage: segments.dormant.slice(0, 10).map((c) => ({
        email:        c.email,
        ltv_inr:      c.ltv_inr,
        last_purchase: c.last_purchase,
      })),
    })
  } catch (err) {
    console.error("[bi/customers]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
