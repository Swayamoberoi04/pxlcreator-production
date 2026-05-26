"use client"

import { cn } from "@/lib/utils"
import type { CommerceMetrics } from "@/types/commerce"

/* ── Types (mirrors the API response) ─────────────────────── */
interface OrderItem { id: string; preset_title: string; price_inr: number; quantity: number }

export interface OrderRow {
  id:                  string
  email:               string
  customer_name:       string | null
  status:              string
  total_inr:           number
  subtotal_usd:        number
  created_at:          string
  paid_at:             string | null
  razorpay_order_id:   string | null
  razorpay_payment_id: string | null
  order_items:         OrderItem[]
}

/* ── Metrics cards ─────────────────────────────────────────── */
export function MetricsBar({ metrics }: { metrics: CommerceMetrics }) {
  const cards = [
    { label: "Total Revenue",   value: `₹${metrics.total_revenue_inr.toLocaleString("en-IN")}`,  sub: `$${metrics.total_revenue_usd.toFixed(0)} USD` },
    { label: "This Month",      value: `₹${metrics.this_month_inr.toLocaleString("en-IN")}`,     sub: "current month" },
    { label: "Paid Orders",     value: String(metrics.paid_orders),                               sub: `of ${metrics.total_orders} total` },
    { label: "Avg Order Value", value: `₹${Math.round(metrics.avg_order_inr).toLocaleString("en-IN")}`, sub: "per transaction" },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-label text-muted/60 tracking-widest mb-2">{c.label}</p>
          <p className="font-display font-bold text-2xl text-foreground">{c.value}</p>
          <p className="text-small text-muted mt-0.5">{c.sub}</p>
        </div>
      ))}
    </div>
  )
}

/* ── Status badge ──────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    failed:    "bg-red-500/10 text-red-400 border-red-500/20",
    cancelled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    refunded:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  }
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
      styles[status] ?? styles.pending
    )}>
      {status}
    </span>
  )
}

/* ── Orders table ──────────────────────────────────────────── */
export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  if (!orders.length) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-12 text-center">
        <p className="font-medium text-foreground">No orders yet</p>
        <p className="text-small text-muted mt-1">Orders will appear here once customers purchase presets.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-5 py-3.5 text-left text-label text-muted/60 tracking-widest font-medium">Customer</th>
              <th className="px-5 py-3.5 text-left text-label text-muted/60 tracking-widest font-medium">Items</th>
              <th className="px-5 py-3.5 text-left text-label text-muted/60 tracking-widest font-medium">Amount</th>
              <th className="px-5 py-3.5 text-left text-label text-muted/60 tracking-widest font-medium">Status</th>
              <th className="px-5 py-3.5 text-left text-label text-muted/60 tracking-widest font-medium">Date</th>
              <th className="px-5 py-3.5 text-left text-label text-muted/60 tracking-widest font-medium">Payment ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-surface/50 transition-colors">
                <td className="px-5 py-4">
                  <div>
                    <p className="font-medium text-foreground truncate max-w-[180px]">{order.customer_name ?? "—"}</p>
                    <p className="text-xs text-muted mt-0.5 truncate max-w-[180px]">{order.email}</p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-0.5">
                    {order.order_items.map((item) => (
                      <p key={item.id} className="text-xs text-muted truncate max-w-[160px]">{item.preset_title}</p>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="font-display font-bold text-gold">₹{Number(order.total_inr).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted">${Number(order.subtotal_usd).toFixed(2)}</p>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-5 py-4 text-xs text-muted whitespace-nowrap">
                  {new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-5 py-4">
                  {order.razorpay_payment_id ? (
                    <span className="text-xs font-mono text-muted/60 truncate block max-w-[120px]">
                      {order.razorpay_payment_id}
                    </span>
                  ) : (
                    <span className="text-xs text-muted/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
