/**
 * GET /api/admin/orders
 *
 * Admin-only: returns all orders with summary data.
 * Protected by the existing admin session middleware.
 */

import { NextRequest, NextResponse }  from "next/server"
import { createAdminClient }           from "@/lib/supabase/admin"
import { requireAdmin }                from "@/lib/admin/guard"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const deny = await requireAdmin()
  if (deny) return deny

  try {
    const supabase = createAdminClient()
    const url      = new URL(req.url)
    const status   = url.searchParams.get("status")    // filter by status
    const limit    = Number(url.searchParams.get("limit") ?? "50")
    const offset   = Number(url.searchParams.get("offset") ?? "0")

    let query = supabase
      .from("orders")
      .select(`
        id,
        email,
        customer_name,
        status,
        total_inr,
        subtotal_usd,
        created_at,
        paid_at,
        razorpay_order_id,
        razorpay_payment_id,
        order_items ( id, preset_title, price_inr, quantity )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    const VALID_STATUSES = ["pending", "paid", "failed", "cancelled", "refunded"] as const
    type OrderStatus = typeof VALID_STATUSES[number]
    if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
      query = query.eq("status", status as OrderStatus) as typeof query
    }

    const { data: orders, error, count } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    /* Compute revenue metrics */
    const { data: metrics } = await supabase
      .from("orders")
      .select("status, total_inr, subtotal_usd, created_at")

    const paid = metrics?.filter((o) => o.status === "paid") ?? []
    const now  = new Date()
    const thisMonthPaid = paid.filter((o) => {
      const d = new Date(o.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })

    const summary = {
      total_orders:      metrics?.length ?? 0,
      paid_orders:       paid.length,
      total_revenue_inr: paid.reduce((s, o) => s + Number(o.total_inr), 0),
      total_revenue_usd: paid.reduce((s, o) => s + Number(o.subtotal_usd), 0),
      this_month_inr:    thisMonthPaid.reduce((s, o) => s + Number(o.total_inr), 0),
      avg_order_inr:     paid.length
        ? paid.reduce((s, o) => s + Number(o.total_inr), 0) / paid.length
        : 0,
    }

    return NextResponse.json({ orders, count, summary })
  } catch (e) {
    console.error("[admin/orders]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
