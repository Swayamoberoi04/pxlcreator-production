"use client"

import { useEffect, useState } from "react"
import Link                    from "next/link"
import { OrdersTable, MetricsBar, type OrderRow } from "@/components/admin/OrdersTable"
import type { CommerceMetrics } from "@/types/commerce"

export default function AdminOrdersPage() {
  const [orders,  setOrders]  = useState<OrderRow[]>([])
  const [metrics, setMetrics] = useState<CommerceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [status,  setStatus]  = useState<string>("all")

  useEffect(() => {
    const url = status === "all"
      ? "/api/admin/orders"
      : `/api/admin/orders?status=${status}`

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return }
        setOrders(data.orders ?? [])
        setMetrics(data.summary ?? null)
      })
      .catch(() => setError("Failed to load orders"))
      .finally(() => setLoading(false))
  }, [status])

  const STATUS_FILTERS = [
    { value: "all",       label: "All" },
    { value: "paid",      label: "Paid" },
    { value: "pending",   label: "Pending" },
    { value: "failed",    label: "Failed" },
    { value: "refunded",  label: "Refunded" },
  ]

  return (
    <div className="p-6 sm:p-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">Orders</h1>
          <p className="text-small text-muted mt-0.5">Payment transactions and purchase history</p>
        </div>
        <Link
          href="/admin"
          className="text-small text-muted hover:text-foreground transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      {/* ── Metrics ── */}
      {metrics && <MetricsBar metrics={metrics} />}

      {/* ── Status filter ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatus(f.value); setLoading(true) }}
            className={[
              "rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors",
              status === f.value
                ? "border-gold/40 bg-gold/10 text-gold"
                : "border-border bg-surface text-muted hover:text-foreground",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl border border-border bg-surface animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-6 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && <OrdersTable orders={orders} />}

    </div>
  )
}
