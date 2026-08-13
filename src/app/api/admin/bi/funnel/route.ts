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

    const [funnelRes, ordersRes, paymentsRes] = await Promise.all([
      supabase.rpc("bi_funnel_stages", { p_from: from, p_to: to }),
      supabase
        .from("orders")
        .select("status")
        .gte("created_at", from)
        .lte("created_at", to),
      supabase
        .from("payment_transactions")
        .select("status")
        .gte("created_at", from)
        .lte("created_at", to),
    ])

    const orders   = ordersRes.data   ?? []
    const payments = paymentsRes.data ?? []

    const pendingOrders = orders.filter((o) => o.status === "pending").length
    const paidOrders    = orders.filter((o) => o.status === "paid").length
    const failedOrders  = orders.filter((o) => o.status === "failed").length
    const totalPayments = payments.length
    const capturedPay   = payments.filter((p) => p.status === "captured").length
    const failedPay     = payments.filter((p) => p.status === "failed").length

    const paymentSuccessRate = totalPayments > 0
      ? Math.round((capturedPay / totalPayments) * 100)
      : 0

    const stages = funnelRes.data ?? []

    return NextResponse.json({
      trackedStages: stages,
      paymentFunnel: {
        ordersCreated:       orders.length,
        pendingOrders,
        paidOrders,
        failedOrders,
        paymentAttempts:     totalPayments,
        paymentsCaptured:    capturedPay,
        paymentsFailed:      failedPay,
        paymentSuccessRate,
      },
      note: stages.length === 0
        ? "Funnel tracking data is being collected. Historical order data shows payment funnel below."
        : undefined,
    })
  } catch (err) {
    console.error("[bi/funnel]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
