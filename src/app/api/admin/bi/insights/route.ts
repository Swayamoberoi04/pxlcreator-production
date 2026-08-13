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

type Insight = {
  id:       string
  priority: "critical" | "warning" | "opportunity" | "info"
  category: string
  title:    string
  detail:   string
  action?:  string
}

export async function GET(req: NextRequest) {
  try {
    const deny = await requirePermission("analytics:read")
    if (deny) return deny

    const supabase = db()
    const curr     = parseDateRange(req.nextUrl.searchParams)
    const prev     = previousPeriod(curr)

    const [
      currOrdersRes, prevOrdersRes,
      failedPayRes,
      searchRes,
      ltvRes,
      topProdRes,
      copurchaseRes,
    ] = await Promise.all([
      supabase.from("orders").select("total_inr, subtotal_inr").eq("status", "paid").gte("paid_at", curr.from).lte("paid_at", curr.to),
      supabase.from("orders").select("total_inr").eq("status", "paid").gte("paid_at", prev.from).lte("paid_at", prev.to),
      supabase.from("payment_transactions").select("status").gte("created_at", curr.from).lte("created_at", curr.to),
      supabase.rpc("bi_search_summary", { p_from: curr.from, p_to: curr.to }),
      supabase.rpc("bi_customer_ltv"),
      supabase.rpc("bi_product_performance", { p_from: curr.from, p_to: curr.to }),
      supabase.rpc("bi_top_copurchased", { p_limit: 5 }),
    ])

    const insights: Insight[] = []

    /* ── Revenue momentum ── */
    const currRevenue = (currOrdersRes.data ?? []).reduce((s, o) => s + (o.total_inr ?? 0), 0)
    const prevRevenue = (prevOrdersRes.data ?? []).reduce((s, o) => s + (o.total_inr ?? 0), 0)
    const revGrowth   = growthPct(currRevenue, prevRevenue)

    if (revGrowth >= 30) {
      insights.push({ id: "rev_up", priority: "opportunity", category: "Revenue", title: `Revenue up ${revGrowth}% vs. previous period`, detail: `Net revenue grew from ₹${Math.round(prevRevenue).toLocaleString()} to ₹${Math.round(currRevenue).toLocaleString()}. Strong momentum — consider increasing ad spend or launching a limited-time offer.`, action: "Review top-selling products and double down on what's working." })
    } else if (revGrowth <= -20) {
      insights.push({ id: "rev_down", priority: "critical", category: "Revenue", title: `Revenue down ${Math.abs(revGrowth)}% vs. previous period`, detail: `Revenue fell from ₹${Math.round(prevRevenue).toLocaleString()} to ₹${Math.round(currRevenue).toLocaleString()}. Investigate whether this correlates with traffic drops, fewer promotions, or seasonal factors.`, action: "Check traffic analytics and recent content publish dates." })
    }

    /* ── Payment failure rate ── */
    const payments       = failedPayRes.data ?? []
    const totalPayments  = payments.length
    const failedPayments = payments.filter((p) => p.status === "failed").length
    if (totalPayments > 0) {
      const failRate = Math.round((failedPayments / totalPayments) * 100)
      if (failRate >= 20) {
        insights.push({ id: "payment_fail", priority: "critical", category: "Payments", title: `High payment failure rate: ${failRate}%`, detail: `${failedPayments} of ${totalPayments} payment attempts failed. This is above the 20% threshold. Check Razorpay dashboard for error codes.`, action: "Review Razorpay error logs and consider enabling UPI/net banking fallbacks." })
      } else if (failRate >= 10) {
        insights.push({ id: "payment_warn", priority: "warning", category: "Payments", title: `Payment failure rate at ${failRate}%`, detail: `${failedPayments} failed payments in this period. Normal is <10%. Monitor for trends.`, action: "Keep an eye on Razorpay dashboard this week." })
      }
    }

    /* ── Discount impact ── */
    const currGross    = (currOrdersRes.data ?? []).reduce((s, o) => s + (o.subtotal_inr ?? 0), 0)
    const discountTotal = currGross - currRevenue
    const discountPct  = currGross > 0 ? Math.round((discountTotal / currGross) * 100) : 0
    if (discountPct >= 30) {
      insights.push({ id: "high_discount", priority: "warning", category: "Pricing", title: `High coupon discount rate: ${discountPct}% of gross revenue`, detail: `Coupons reduced gross revenue by ₹${Math.round(discountTotal).toLocaleString()} this period. Heavy discounting trains customers to wait for sales.`, action: "Audit coupon limits and expiry dates. Consider value-add bundles instead of discounts." })
    }

    /* ── Search zero-results ── */
    const searchSummary = (searchRes.data as unknown[])?.[0] as Record<string, number> | undefined
    if (searchSummary) {
      const zeroPct = Number(searchSummary.zero_result_pct ?? 0)
      const total   = Number(searchSummary.total_searches  ?? 0)
      if (total >= 10 && zeroPct >= 30) {
        insights.push({ id: "search_gap", priority: "opportunity", category: "Search", title: `${zeroPct}% of searches return zero results`, detail: `${Math.round(total * zeroPct / 100)} searches found nothing. These are unmet demand signals — create presets matching these queries.`, action: "Go to Search Intelligence tab to see exact zero-result queries." })
      }
    }

    /* ── Dormant customers ── */
    type CustomerRow = { segment: string; ltv_inr: number }
    const customers = (ltvRes.data ?? []) as CustomerRow[]
    const dormant   = customers.filter((c) => c.segment === "dormant")
    const dormantLtv = dormant.reduce((s, c) => s + c.ltv_inr, 0)
    if (dormant.length >= 5) {
      insights.push({ id: "dormant", priority: "opportunity", category: "Retention", title: `${dormant.length} dormant customers worth ₹${Math.round(dormantLtv).toLocaleString()} LTV`, detail: `These customers purchased before but haven't returned in 180+ days. A win-back campaign targeting them could recover significant revenue.`, action: "Export dormant customer emails for a re-engagement email campaign." })
    }

    /* ── Bundle opportunity from co-purchase ── */
    type CopurchaseRow = { preset_a_title: string; preset_b_title: string; count: number }
    const copurchase = (copurchaseRes.data ?? []) as CopurchaseRow[]
    if (copurchase.length > 0) {
      const top = copurchase[0]
      insights.push({ id: "bundle_opp", priority: "opportunity", category: "Bundles", title: `Bundle opportunity: "${top.preset_a_title}" + "${top.preset_b_title}"`, detail: `These two presets were bought together ${top.count} times. Creating a bundle at a 10–15% discount could increase AOV while feeling like a deal.`, action: "Go to Bundles CMS and create this bundle." })
    }

    /* ── Hidden winner ── */
    type ProductRow = { preset_title: string; views_alltime: number; unit_sales: number; revenue: number; is_free: boolean }
    const products     = (topProdRes.data ?? []) as ProductRow[]
    const hiddenWinner = products.find((p) => !p.is_free && p.revenue > 0 && p.views_alltime < 200 && p.unit_sales >= 2)
    if (hiddenWinner) {
      insights.push({ id: "hidden_winner", priority: "opportunity", category: "Products", title: `Hidden winner: "${hiddenWinner.preset_title}"`, detail: `This preset has only ${hiddenWinner.views_alltime} all-time views but has generated ₹${Math.round(hiddenWinner.revenue).toLocaleString()} in revenue. Low visibility, high conversion.`, action: "Feature it on the homepage or run a social media post highlighting it." })
    }

    /* ── Traffic trap ── */
    const trafficTrap = products.find((p) => !p.is_free && p.views_alltime > 100 && p.unit_sales === 0)
    if (trafficTrap) {
      insights.push({ id: "traffic_trap", priority: "warning", category: "Products", title: `Traffic trap: "${trafficTrap.preset_title}" — ${trafficTrap.views_alltime} views, 0 sales`, detail: `This preset attracts visitors but converts none of them to buyers. The price, preview quality, or description may need work.`, action: "Review the preset's before/after images, description, and price point." })
    }

    /* ── No-revenue products ── */
    const zeroRevPaid = products.filter((p) => !p.is_free && p.revenue === 0).length
    if (zeroRevPaid > 5) {
      insights.push({ id: "zero_rev", priority: "info", category: "Products", title: `${zeroRevPaid} paid presets generated zero revenue this period`, detail: `These presets had no sales. They may be new, low-visibility, or underperforming.`, action: "Review listing quality, pricing, and promotion for these presets." })
    }

    insights.sort((a, b) => {
      const p = { critical: 0, warning: 1, opportunity: 2, info: 3 }
      return p[a.priority] - p[b.priority]
    })

    return NextResponse.json({ insights, generatedAt: new Date().toISOString() })
  } catch (err) {
    console.error("[bi/insights]", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
