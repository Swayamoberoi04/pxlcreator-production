"use client"

import { useCallback, useEffect, useState } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

type DatePreset = "7d" | "30d" | "90d" | "ytd"

interface DateRange { from: string; to: string }

function getRange(preset: DatePreset): DateRange {
  const to  = new Date()
  const map: Record<DatePreset, number> = { "7d": 7, "30d": 30, "90d": 90, "ytd": 0 }
  let from: Date
  if (preset === "ytd") {
    from = new Date(to.getFullYear(), 0, 1)
  } else {
    from = new Date(to.getTime() - map[preset] * 86400000)
  }
  return { from: from.toISOString(), to: to.toISOString() }
}

// ─── Inline chart components ──────────────────────────────────────────────────

function Sparkline({ data, color = "#6366f1", height = 48 }: {
  data: number[]; color?: string; height?: number
}) {
  if (data.length < 2) return <div style={{ height }} />
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 280
    const y = height - (v / max) * (height - 4) - 2
    return `${x},${y}`
  })
  const areaPoints = `0,${height} ${pts.join(" ")} 280,${height}`
  return (
    <svg viewBox={`0 0 280 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#sg-${color.replace("#","")})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function BarRow({ label, value, max, unit = "₹", color = "#6366f1" }: {
  label: string; value: number; max: number; unit?: string; color?: string
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{label}</span>
        <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--muted-foreground, #888)" }}>
          {unit === "₹" ? `₹${Math.round(value).toLocaleString()}` : `${value.toLocaleString()}${unit}`}
        </span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 4, height: 6 }}>
        <div style={{ background: color, borderRadius: 4, height: 6, width: `${pct}%`, transition: "width 0.5s" }} />
      </div>
    </div>
  )
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, growth, color = "#6366f1" }: {
  label: string; value: string; sub?: string; growth?: number; color?: string
}) {
  const gColor = growth == null ? undefined : growth >= 0 ? "#22c55e" : "#ef4444"
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: "16px 20px", minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{sub}</div>}
      {growth != null && (
        <div style={{ fontSize: 12, color: gColor, marginTop: 4 }}>
          {growth >= 0 ? "▲" : "▼"} {Math.abs(growth)}% vs. previous period
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0" }}>{subtitle}</p>}
    </div>
  )
}

function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "#666" }}>
      <span style={{ fontSize: 14 }}>Loading…</span>
    </div>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div style={{ padding: 20, background: "rgba(239,68,68,0.1)", borderRadius: 8, color: "#ef4444", fontSize: 13 }}>
      {msg}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: "#666", fontSize: 13 }}>
      {message}
    </div>
  )
}

// ─── TAB: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ range }: { range: DateRange }) {
  const [data, setData]     = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState("")

  const load = useCallback(() => {
    setLoading(true); setError("")
    const p = new URLSearchParams({ from: range.from, to: range.to })
    void fetch(`/api/admin/bi/overview?${p}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError("Failed to load overview data"); setLoading(false) })
  }, [range.from, range.to])

  useEffect(() => { void load() }, [load])

  if (loading) return <Loading />
  if (error)   return <ErrorMsg msg={error} />
  if (!data)   return null

  const curr    = data.current as Record<string, number>
  const growth  = data.growth  as Record<string, number>
  const trend   = (data.trend as Array<{ day: string; revenue: number; orders: number }>) ?? []

  const revSeries = trend.map((d) => d.revenue)
  const ordSeries = trend.map((d) => d.orders)

  return (
    <div>
      <SectionHeader title="Executive Overview" subtitle="Revenue, orders and customer activity in the selected period" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 32 }}>
        <KpiCard label="Net Revenue"       value={`₹${Math.round(curr.netRevenue ?? 0).toLocaleString()}`}   growth={growth.revenue}   color="#6366f1" />
        <KpiCard label="Paid Orders"       value={`${curr.orderCount ?? 0}`}                                 growth={growth.orders}    color="#06b6d4" />
        <KpiCard label="Avg. Order Value"  value={`₹${Math.round(curr.aov ?? 0).toLocaleString()}`}          color="#f59e0b" />
        <KpiCard label="Unique Customers"  value={`${curr.uniqueCustomers ?? 0}`}                            growth={growth.customers} color="#10b981" />
        <KpiCard label="Downloads"         value={`${(curr.downloads ?? 0).toLocaleString()}`}               growth={growth.downloads} color="#8b5cf6" />
        <KpiCard label="Gross Revenue"     value={`₹${Math.round(curr.grossRevenue ?? 0).toLocaleString()}`} sub="before discounts"    color="#64748b" />
        <KpiCard label="Discounts Given"   value={`₹${Math.round(curr.totalDiscount ?? 0).toLocaleString()}`} color="#f97316" />
        <KpiCard label="Failed Payments"   value={`${curr.failedPayments ?? 0}`} sub="payment attempts" color="#ef4444" />
        <KpiCard label="Refunds"           value={`₹${Math.round(curr.refundAmount ?? 0).toLocaleString()}`} color="#dc2626" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Daily Revenue (₹)</div>
          <Sparkline data={revSeries} color="#6366f1" height={80} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginTop: 4 }}>
            <span>{trend[0]?.day?.slice(5) ?? ""}</span>
            <span>{trend[trend.length - 1]?.day?.slice(5) ?? ""}</span>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Daily Orders</div>
          <Sparkline data={ordSeries} color="#06b6d4" height={80} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginTop: 4 }}>
            <span>{trend[0]?.day?.slice(5) ?? ""}</span>
            <span>{trend[trend.length - 1]?.day?.slice(5) ?? ""}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TAB: Revenue ─────────────────────────────────────────────────────────────

function RevenueTab({ range }: { range: DateRange }) {
  const [data, setData]     = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState("")

  const load = useCallback(() => {
    setLoading(true); setError("")
    const p = new URLSearchParams({ from: range.from, to: range.to })
    void fetch(`/api/admin/bi/revenue?${p}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError("Failed to load revenue data"); setLoading(false) })
  }, [range.from, range.to])

  useEffect(() => { void load() }, [load])

  if (loading) return <Loading />
  if (error)   return <ErrorMsg msg={error} />
  if (!data)   return null

  type DailyRow    = { day: string; revenue: number; orders: number; aov: number }
  type CatRow      = { category_name: string; revenue: number; unit_sales: number }
  type CouponRow   = { coupon_code: string; uses: number; total_discount: number; net_revenue: number }
  type ProductRow  = { preset_title: string; revenue: number; unit_sales: number }

  const daily      = (data.daily      as DailyRow[])   ?? []
  const byCategory = (data.byCategory as CatRow[])     ?? []
  const byCoupon   = (data.byCoupon   as CouponRow[])  ?? []
  const topProducts = (data.topProducts as ProductRow[]) ?? []

  const maxCatRev  = Math.max(...byCategory.map((c) => c.revenue), 1)
  const maxProdRev = Math.max(...topProducts.map((p) => p.revenue), 1)

  return (
    <div>
      <SectionHeader title="Revenue Analytics" subtitle="Daily trends, breakdown by product, category and coupon" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Daily Revenue (₹) — {daily.length} days</div>
          <Sparkline data={daily.map((d) => d.revenue)} color="#6366f1" height={100} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginTop: 4 }}>
            <span>{daily[0]?.day?.slice(5) ?? ""}</span>
            <span>Avg AOV: ₹{Math.round(daily.reduce((s, d) => s + d.aov, 0) / Math.max(daily.length, 1)).toLocaleString()}</span>
            <span>{daily[daily.length - 1]?.day?.slice(5) ?? ""}</span>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Revenue by Category</div>
          {byCategory.length === 0
            ? <EmptyState message="No sales in this period" />
            : byCategory.map((c) => (
                <BarRow key={c.category_name} label={c.category_name} value={c.revenue} max={maxCatRev} color="#6366f1" />
              ))}
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Top Presets by Revenue</div>
          {topProducts.length === 0
            ? <EmptyState message="No sales in this period" />
            : topProducts.slice(0, 10).map((p) => (
                <BarRow key={p.preset_title} label={p.preset_title} value={p.revenue} max={maxProdRev} color="#06b6d4" />
              ))}
        </div>
      </div>

      {byCoupon.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Coupon Performance</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Code", "Uses", "Discount Given", "Net Revenue"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 12px 6px 0", color: "#888", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byCoupon.map((c) => (
                <tr key={c.coupon_code} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "8px 12px 8px 0", fontFamily: "monospace" }}>{c.coupon_code}</td>
                  <td style={{ padding: "8px 12px 8px 0" }}>{c.uses}</td>
                  <td style={{ padding: "8px 12px 8px 0", color: "#f97316" }}>₹{Math.round(c.total_discount).toLocaleString()}</td>
                  <td style={{ padding: "8px 12px 8px 0", color: "#10b981" }}>₹{Math.round(c.net_revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── TAB: Products ────────────────────────────────────────────────────────────

function ProductsTab({ range }: { range: DateRange }) {
  const [data, setData]     = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState("")
  const [view, setView]     = useState<"revenue" | "downloads" | "hidden" | "traps" | "copurchased">("revenue")

  const load = useCallback(() => {
    setLoading(true); setError("")
    const p = new URLSearchParams({ from: range.from, to: range.to })
    void fetch(`/api/admin/bi/products?${p}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError("Failed to load product data"); setLoading(false) })
  }, [range.from, range.to])

  useEffect(() => { void load() }, [load])

  if (loading) return <Loading />
  if (error)   return <ErrorMsg msg={error} />
  if (!data)   return null

  type ProdRow = {
    preset_id: string; preset_title: string; preset_slug: string
    category_name: string; price_usd: number; is_free: boolean
    views_alltime: number; downloads_total: number; revenue: number
    unit_sales: number; review_count: number; rating: number; conversion_pct: number
  }
  type CopurchRow = { preset_a_title: string; preset_b_title: string; count: number }

  const views: Record<string, ProdRow[]> = {
    revenue:    (data.topRevenue     as ProdRow[])     ?? [],
    downloads:  (data.topDownloads   as ProdRow[])     ?? [],
    hidden:     (data.hiddenWinners  as ProdRow[])     ?? [],
    traps:      (data.trafficTraps   as ProdRow[])     ?? [],
  }
  const copurchased = (data.copurchased as CopurchRow[]) ?? []

  const viewOptions: Array<{ id: typeof view; label: string }> = [
    { id: "revenue",    label: "Top Revenue" },
    { id: "downloads",  label: "Top Downloads" },
    { id: "hidden",     label: "Hidden Winners" },
    { id: "traps",      label: "Traffic Traps" },
    { id: "copurchased", label: "Frequently Bought Together" },
  ]

  const activeRows = view === "copurchased" ? [] : views[view] ?? []
  const maxRev  = Math.max(...activeRows.map((r) => r.revenue), 1)
  const maxDl   = Math.max(...activeRows.map((r) => r.downloads_total), 1)

  return (
    <div>
      <SectionHeader title="Product Intelligence" subtitle="Performance, hidden winners, and bundle opportunities" />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {viewOptions.map((o) => (
          <button key={o.id} onClick={() => setView(o.id)}
            style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", background: view === o.id ? "#6366f1" : "transparent", color: view === o.id ? "#fff" : "#888", cursor: "pointer", fontSize: 12 }}>
            {o.label}
          </button>
        ))}
      </div>

      {view === "copurchased" ? (
        copurchased.length === 0
          ? <EmptyState message="Not enough order data to detect co-purchase patterns yet (need ≥2 shared orders)." />
          : (
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Bundle Opportunities — presets bought together</div>
              {copurchased.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", minWidth: 24 }}>×{c.count}</span>
                  <span style={{ fontSize: 13 }}>{c.preset_a_title}</span>
                  <span style={{ color: "#666" }}>+</span>
                  <span style={{ fontSize: 13 }}>{c.preset_b_title}</span>
                </div>
              ))}
            </div>
          )
      ) : activeRows.length === 0 ? (
        <EmptyState message={view === "hidden" ? "No hidden winners found (need low views + ≥2 sales)." : view === "traps" ? "No traffic traps found." : "No products with data in this period."} />
      ) : (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Preset", "Category", "Price", "Views*", "Downloads", "Sales", "Revenue", "Conv%", "Rating"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px 6px 0", color: "#888", fontWeight: 500, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeRows.map((p) => (
                  <tr key={p.preset_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "8px 10px 8px 0", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.preset_title}</td>
                    <td style={{ padding: "8px 10px 8px 0", color: "#888", fontSize: 11 }}>{p.category_name ?? "—"}</td>
                    <td style={{ padding: "8px 10px 8px 0", whiteSpace: "nowrap" }}>{p.is_free ? "Free" : `$${p.price_usd}`}</td>
                    <td style={{ padding: "8px 10px 8px 0", color: "#888" }}>{(p.views_alltime ?? 0).toLocaleString()}</td>
                    <td style={{ padding: "8px 10px 8px 0" }}>{(p.downloads_total ?? 0).toLocaleString()}</td>
                    <td style={{ padding: "8px 10px 8px 0" }}>{p.unit_sales ?? 0}</td>
                    <td style={{ padding: "8px 10px 8px 0", color: "#10b981" }}>₹{Math.round(p.revenue ?? 0).toLocaleString()}</td>
                    <td style={{ padding: "8px 10px 8px 0", color: "#f59e0b" }}>{p.conversion_pct ?? 0}%</td>
                    <td style={{ padding: "8px 10px 8px 0" }}>{p.rating ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {view === "revenue" && <p style={{ fontSize: 11, color: "#555", marginTop: 12 }}>* Views are all-time totals — period filtering not yet available for view counts.</p>}
          {(view === "hidden" || view === "traps") && (
            <div style={{ marginTop: 16, padding: 12, background: "rgba(99,102,241,0.08)", borderRadius: 8, fontSize: 12, color: "#818cf8" }}>
              {view === "hidden"
                ? "Hidden winners: high revenue relative to views. Consider featuring these on the homepage or running targeted ads."
                : "Traffic traps: many views, zero sales. Review price point, preview quality, and product description."}
            </div>
          )}
          {view === "downloads" && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Download volume</div>
              {activeRows.slice(0, 8).map((p) => (
                <BarRow key={p.preset_id} label={p.preset_title} value={p.downloads_total} max={maxDl} unit="" color="#8b5cf6" />
              ))}
            </div>
          )}
          {view === "revenue" && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Revenue contribution</div>
              {activeRows.slice(0, 8).map((p) => (
                <BarRow key={p.preset_id} label={p.preset_title} value={p.revenue} max={maxRev} color="#6366f1" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── TAB: Customers ───────────────────────────────────────────────────────────

function CustomersTab({ range }: { range: DateRange }) {
  const [data, setData]     = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState("")

  const load = useCallback(() => {
    setLoading(true); setError("")
    const p = new URLSearchParams({ from: range.from, to: range.to })
    void fetch(`/api/admin/bi/customers?${p}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError("Failed to load customer data"); setLoading(false) })
  }, [range.from, range.to])

  useEffect(() => { void load() }, [load])

  if (loading) return <Loading />
  if (error)   return <ErrorMsg msg={error} />
  if (!data)   return null

  const summary  = data.summary  as Record<string, number>
  const segments = data.segmentCounts as Record<string, number>
  const topByLtv = data.topByLtv as Array<{ email: string; total_orders: number; ltv_inr: number; last_purchase: string; segment: string }>
  const dormant  = data.dormantToReengage as Array<{ email: string; ltv_inr: number; last_purchase: string }>

  const segmentColors: Record<string, string> = {
    new: "#10b981", returning: "#6366f1", power: "#f59e0b",
    one_time: "#06b6d4", at_risk: "#f97316", dormant: "#ef4444",
  }
  const segmentLabels: Record<string, string> = {
    new: "New", returning: "Returning", power: "Power Buyers",
    one_time: "One-Time", at_risk: "At Risk", dormant: "Dormant",
  }
  const totalSegmented = Object.values(segments).reduce((s, v) => s + v, 0)

  return (
    <div>
      <SectionHeader title="Customer Intelligence" subtitle="Segmentation, LTV, and retention signals" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <KpiCard label="Total Customers (all-time)" value={`${summary.totalCustomers ?? 0}`}  color="#6366f1" />
        <KpiCard label="New in Period"              value={`${summary.newInPeriod ?? 0}`}      color="#10b981" />
        <KpiCard label="Returning in Period"        value={`${summary.returningInPeriod ?? 0}`} color="#06b6d4" />
        <KpiCard label="Avg. LTV (₹)"              value={`₹${(summary.avgLtv ?? 0).toLocaleString()}`} color="#f59e0b" />
        <KpiCard label="Highest LTV (₹)"           value={`₹${(summary.maxLtv ?? 0).toLocaleString()}`} color="#8b5cf6" />
        <KpiCard label="Repeat Purchase Rate"       value={`${summary.repeatPurchaseRate ?? 0}%`} color="#ec4899" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Customer Segments (all-time)</div>
          {Object.entries(segments).map(([seg, count]) => (
            <div key={seg} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: segmentColors[seg] ?? "#888", flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13 }}>{segmentLabels[seg] ?? seg}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{count}</span>
              <span style={{ fontSize: 11, color: "#888", minWidth: 36, textAlign: "right" }}>
                {totalSegmented > 0 ? Math.round((count / totalSegmented) * 100) : 0}%
              </span>
            </div>
          ))}
          <div style={{ marginTop: 12, height: 8, borderRadius: 4, overflow: "hidden", display: "flex" }}>
            {Object.entries(segments).map(([seg, count]) => (
              <div key={seg} style={{ flex: count, background: segmentColors[seg] ?? "#888" }} />
            ))}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Top Customers by LTV</div>
          {topByLtv.length === 0 ? <EmptyState message="No customer data available." /> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {["Email", "Orders", "LTV (₹)", "Segment"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "4px 8px 4px 0", color: "#888", fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topByLtv.slice(0, 10).map((c) => (
                    <tr key={c.email} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "6px 8px 6px 0", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</td>
                      <td style={{ padding: "6px 8px 6px 0" }}>{c.total_orders}</td>
                      <td style={{ padding: "6px 8px 6px 0", color: "#10b981" }}>₹{Math.round(c.ltv_inr).toLocaleString()}</td>
                      <td style={{ padding: "6px 8px 6px 0" }}>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 10, background: segmentColors[c.segment] + "33", color: segmentColors[c.segment] }}>
                          {segmentLabels[c.segment] ?? c.segment}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {dormant.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#ef4444" }}>
            {dormant.length} Dormant Customers — Win-Back Opportunity
          </div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>These high-value customers haven&apos;t purchased in 180+ days. Email re-engagement could recover revenue.</div>
          {dormant.map((c) => (
            <div key={c.email} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12 }}>
              <span>{c.email}</span>
              <span style={{ color: "#888" }}>Last: {c.last_purchase.slice(0, 10)}</span>
              <span style={{ color: "#f59e0b" }}>LTV: ₹{Math.round(c.ltv_inr).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TAB: Funnel ──────────────────────────────────────────────────────────────

function FunnelTab({ range }: { range: DateRange }) {
  const [data, setData]     = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState("")

  const load = useCallback(() => {
    setLoading(true); setError("")
    const p = new URLSearchParams({ from: range.from, to: range.to })
    void fetch(`/api/admin/bi/funnel?${p}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError("Failed to load funnel data"); setLoading(false) })
  }, [range.from, range.to])

  useEffect(() => { void load() }, [load])

  if (loading) return <Loading />
  if (error)   return <ErrorMsg msg={error} />
  if (!data)   return null

  const pf = data.paymentFunnel as Record<string, number>

  const paymentStages = [
    { label: "Orders Created", count: pf.ordersCreated, color: "#6366f1" },
    { label: "Pending (awaiting payment)", count: pf.pendingOrders, color: "#f59e0b" },
    { label: "Payment Attempted", count: pf.paymentAttempts, color: "#06b6d4" },
    { label: "Payment Captured", count: pf.paymentsCaptured, color: "#10b981" },
    { label: "Paid Orders", count: pf.paidOrders, color: "#10b981" },
    { label: "Failed Payments", count: pf.paymentsFailed, color: "#ef4444" },
  ]
  const maxCount = Math.max(...paymentStages.map((s) => s.count ?? 0), 1)

  return (
    <div>
      <SectionHeader title="Conversion Funnel" subtitle="Payment pipeline and order flow in the selected period" />

      {data.note != null && (
        <div style={{ padding: "12px 16px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, fontSize: 13, color: "#818cf8", marginBottom: 24 }}>
          {String(data.note)}
        </div>
      )}

      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>Payment Funnel (from real order + payment data)</div>
        {paymentStages.map((s) => (
          <div key={s.label} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span>{s.label}</span>
              <span style={{ color: s.color, fontWeight: 600 }}>{(s.count ?? 0).toLocaleString()}</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 8 }}>
              <div style={{ background: s.color, borderRadius: 6, height: 8, width: `${Math.min(((s.count ?? 0) / maxCount) * 100, 100)}%`, transition: "width 0.5s" }} />
            </div>
          </div>
        ))}
        <div style={{ marginTop: 20, padding: 12, background: "rgba(16,185,129,0.08)", borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13 }}>Payment Success Rate</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#10b981" }}>{pf.paymentSuccessRate ?? 0}%</span>
        </div>
      </div>

      <div style={{ padding: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 12, color: "#666" }}>
        <strong style={{ color: "#888" }}>Granular funnel tracking</strong> (add-to-cart, checkout_open, etc.) is active from today. Data accumulates over time and will appear here automatically.
      </div>
    </div>
  )
}

// ─── TAB: Search Intelligence ─────────────────────────────────────────────────

function SearchTab({ range }: { range: DateRange }) {
  const [data, setData]     = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState("")

  const load = useCallback(() => {
    setLoading(true); setError("")
    const p = new URLSearchParams({ from: range.from, to: range.to })
    void fetch(`/api/admin/bi/search-intel?${p}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError("Failed to load search data"); setLoading(false) })
  }, [range.from, range.to])

  useEffect(() => { void load() }, [load])

  if (loading) return <Loading />
  if (error)   return <ErrorMsg msg={error} />
  if (!data)   return null

  const s  = data.summary as Record<string, unknown>
  const zr = data.topZeroResults as Array<{ query: string; count: number }> ?? []

  const totalSearches = Number(s?.total_searches ?? 0)
  const topQueries    = (s?.top_queries as Array<{ query: string; cnt: number }>) ?? []
  const maxQCount     = Math.max(...topQueries.map((q) => q.cnt), 1)

  return (
    <div>
      <SectionHeader title="Search Intelligence" subtitle="What visitors are searching for and where content gaps exist" />

      {totalSearches === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Search tracking is active</div>
          <div style={{ fontSize: 13, color: "#888" }}>Data will appear here as visitors use the search feature. Every search query is now being logged.</div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
            <KpiCard label="Total Searches"   value={totalSearches.toLocaleString()}           color="#6366f1" />
            <KpiCard label="Unique Queries"   value={String(s?.unique_queries ?? 0)}           color="#06b6d4" />
            <KpiCard label="Zero-Result Rate" value={`${s?.zero_result_pct ?? 0}%`}            color="#ef4444" />
            <KpiCard label="Avg. Results"     value={String(s?.avg_result_count ?? 0)}         color="#10b981" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Top Queries</div>
              {topQueries.slice(0, 15).map((q) => (
                <BarRow key={q.query} label={q.query} value={q.cnt} max={maxQCount} unit=" searches" color="#6366f1" />
              ))}
            </div>

            <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#ef4444" }}>Zero-Result Queries</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>These searches found nothing — create presets for these topics.</div>
              {zr.length === 0
                ? <EmptyState message="No zero-result searches yet." />
                : zr.map((q) => (
                    <div key={q.query} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
                      <span style={{ fontStyle: "italic" }}>&ldquo;{q.query}&rdquo;</span>
                      <span style={{ color: "#ef4444", fontWeight: 600 }}>{q.count}×</span>
                    </div>
                  ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── TAB: AI Studio ───────────────────────────────────────────────────────────

function AIStudioTab({ range }: { range: DateRange }) {
  const [data, setData]     = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState("")

  const load = useCallback(() => {
    setLoading(true); setError("")
    const p = new URLSearchParams({ from: range.from, to: range.to })
    void fetch(`/api/admin/bi/ai-usage?${p}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError("Failed to load AI usage data"); setLoading(false) })
  }, [range.from, range.to])

  useEffect(() => { void load() }, [load])

  if (loading) return <Loading />
  if (error)   return <ErrorMsg msg={error} />
  if (!data)   return null

  const s     = data.summary      as Record<string, unknown>
  const daily = data.dailyAnalyses as Array<{ day: string; count: number }> ?? []

  const totalAnalyses = Number(s?.total_analyses ?? 0)

  return (
    <div>
      <SectionHeader title="AI Studio Analytics" subtitle="Image analysis usage, error rates and performance metrics" />

      {totalAnalyses === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>AI tracking is active</div>
          <div style={{ fontSize: 13, color: "#888" }}>Every image analysis is now being logged. Usage data will appear here as users interact with the AI Studio.</div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
            <KpiCard label="Total Analyses"   value={totalAnalyses.toLocaleString()}      color="#6366f1" />
            <KpiCard label="Image Uploads"    value={String(s?.total_uploads ?? 0)}       color="#06b6d4" />
            <KpiCard label="Error Rate"       value={`${s?.error_rate ?? 0}%`}            color="#ef4444" />
            <KpiCard label="Avg. Speed"       value={`${s?.avg_processing_ms ?? 0}ms`}    color="#10b981" />
            <KpiCard label="Unique Users"     value={String(s?.unique_users ?? 0)}        color="#f59e0b" />
            <KpiCard label="Preset Applies"   value={String(s?.preset_applies ?? 0)}      color="#8b5cf6" />
          </div>

          {daily.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Daily AI Analyses</div>
              <Sparkline data={daily.map((d) => d.count)} color="#8b5cf6" height={80} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginTop: 4 }}>
                <span>{daily[0]?.day?.slice(5) ?? ""}</span>
                <span>{daily[daily.length - 1]?.day?.slice(5) ?? ""}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── TAB: Community ───────────────────────────────────────────────────────────

function CommunityTab({ range }: { range: DateRange }) {
  const [data, setData]     = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState("")

  const load = useCallback(() => {
    setLoading(true); setError("")
    const p = new URLSearchParams({ from: range.from, to: range.to })
    void fetch(`/api/admin/bi/community?${p}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError("Failed to load community data"); setLoading(false) })
  }, [range.from, range.to])

  useEffect(() => { void load() }, [load])

  if (loading) return <Loading />
  if (error)   return <ErrorMsg msg={error} />
  if (!data)   return null

  return (
    <div>
      <SectionHeader title="Community Analytics" subtitle="Posts, comments, showcase and creator activity in the period" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        <KpiCard label="New Posts"           value={String(data.postsInPeriod ?? 0)}      color="#6366f1" />
        <KpiCard label="New Comments"        value={String(data.commentsInPeriod ?? 0)}   color="#06b6d4" />
        <KpiCard label="Showcase Uploads"    value={String(data.showcaseInPeriod ?? 0)}   color="#8b5cf6" />
        <KpiCard label="Total Creators"      value={String(data.totalCreators ?? 0)}      color="#f59e0b" sub="all-time" />
        <KpiCard label="Challenge Completes" value={String(data.challengeCompletes ?? 0)} color="#10b981" />
      </div>
    </div>
  )
}

// ─── TAB: Insights ────────────────────────────────────────────────────────────

function InsightsTab({ range }: { range: DateRange }) {
  const [data, setData]     = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState("")

  const load = useCallback(() => {
    setLoading(true); setError("")
    const p = new URLSearchParams({ from: range.from, to: range.to })
    void fetch(`/api/admin/bi/insights?${p}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError("Failed to generate insights"); setLoading(false) })
  }, [range.from, range.to])

  useEffect(() => { void load() }, [load])

  if (loading) return <Loading />
  if (error)   return <ErrorMsg msg={error} />
  if (!data)   return null

  type Insight = { id: string; priority: "critical" | "warning" | "opportunity" | "info"; category: string; title: string; detail: string; action?: string }
  const insights = (data.insights as Insight[]) ?? []

  const priorityConfig = {
    critical:    { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", emoji: "🚨" },
    warning:     { color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)", emoji: "⚠️" },
    opportunity: { color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", emoji: "💡" },
    info:        { color: "#6366f1", bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.25)", emoji: "ℹ️" },
  }

  return (
    <div>
      <SectionHeader title="Automated Business Insights" subtitle="Rule-based signals generated from your real data — ranked by priority" />

      {insights.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No critical signals detected</div>
          <div style={{ fontSize: 13, color: "#888" }}>Your metrics look healthy for this period. Try extending the date range to detect longer-term patterns.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {insights.map((ins) => {
            const cfg = priorityConfig[ins.priority]
            return (
              <div key={ins.id} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{cfg.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: cfg.color + "33", color: cfg.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {ins.priority}
                      </span>
                      <span style={{ fontSize: 11, color: "#888" }}>{ins.category}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{ins.title}</div>
                    <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>{ins.detail}</div>
                    {ins.action && (
                      <div style={{ marginTop: 10, fontSize: 12, color: cfg.color, fontWeight: 500 }}>
                        → {ins.action}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 24, fontSize: 11, color: "#555", textAlign: "right" }}>
        Generated at {data.generatedAt ? new Date(String(data.generatedAt)).toLocaleString() : "—"}
      </div>
    </div>
  )
}

// ─── TAB: Forecast ────────────────────────────────────────────────────────────

function ForecastTab() {
  const [data, setData]     = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState("")
  const [histDays, setHistDays] = useState(90)

  const load = useCallback(() => {
    setLoading(true); setError("")
    void fetch(`/api/admin/bi/forecast?days=${histDays}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError("Failed to load forecast"); setLoading(false) })
  }, [histDays])

  useEffect(() => { void load() }, [load])

  if (loading) return <Loading />
  if (error)   return <ErrorMsg msg={error} />
  if (!data)   return null

  const summary  = data.summary  as Record<string, unknown>
  const hist     = (data.historical  as Array<{ day: string; revenue: number }>) ?? []
  const proj     = (data.projected   as Array<{ day: string; projected_revenue: number }>) ?? []

  const histValues = hist.map((d) => d.revenue)
  const projValues = proj.map((d) => d.projected_revenue)
  const combined   = [...histValues, ...projValues]
  const max        = Math.max(...combined, 1)

  const trendColor: Record<string, string> = {
    strong_growth: "#10b981", growing: "#6366f1", flat: "#f59e0b", declining: "#ef4444",
  }
  const trendLabel: Record<string, string> = {
    strong_growth: "Strong Growth", growing: "Growing", flat: "Flat", declining: "Declining",
  }
  const trend = String(summary?.trend ?? "flat")

  return (
    <div>
      <SectionHeader title="Revenue Forecast" subtitle="Linear regression on daily revenue — illustrative projection, not a guarantee" />

      <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#888" }}>Historical window:</span>
        {([30, 60, 90, 180] as const).map((d) => (
          <button key={d} onClick={() => setHistDays(d)}
            style={{ padding: "4px 12px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: histDays === d ? "#6366f1" : "transparent", color: histDays === d ? "#fff" : "#888", cursor: "pointer", fontSize: 12 }}>
            {d}d
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
        <KpiCard label="Projected Next Month" value={`₹${Math.round(Number(summary?.projectedMonthly ?? 0)).toLocaleString()}`} color={trendColor[trend]} />
        <KpiCard label="Recent Month Actual"  value={`₹${Math.round(Number(summary?.recentMonthly ?? 0)).toLocaleString()}`}   color="#6366f1" />
        <KpiCard label="Projected Growth"     value={`${summary?.growthPct ?? 0}%`}  color={trendColor[trend]} />
        <KpiCard label="Revenue Trend"        value={trendLabel[trend] ?? trend}     color={trendColor[trend]} sub="linear regression slope" />
      </div>

      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Historical + 30-Day Projection</div>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 16 }}>
          <span style={{ color: "#6366f1" }}>■</span> Historical ({histDays}d) &nbsp;
          <span style={{ color: "#f59e0b" }}>■</span> Projected (30d)
        </div>
        <div style={{ position: "relative", height: 100 }}>
          <svg viewBox={`0 0 ${combined.length} 100`} preserveAspectRatio="none" style={{ width: "100%", height: 100 }}>
            {histValues.length > 1 && (
              <>
                <polyline
                  points={histValues.map((v, i) => `${i},${100 - (v / max) * 96}`).join(" ")}
                  fill="none" stroke="#6366f1" strokeWidth="0.8" strokeLinejoin="round"
                />
                <polygon
                  points={`0,100 ${histValues.map((v, i) => `${i},${100 - (v / max) * 96}`).join(" ")} ${histValues.length - 1},100`}
                  fill="rgba(99,102,241,0.15)"
                />
              </>
            )}
            {projValues.length > 1 && (
              <>
                <polyline
                  points={projValues.map((v, i) => `${histValues.length + i},${100 - (v / max) * 96}`).join(" ")}
                  fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3,2" strokeLinejoin="round"
                />
              </>
            )}
            {histValues.length > 0 && (
              <line
                x1={histValues.length - 1} y1="0"
                x2={histValues.length - 1} y2="100"
                stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="2,2"
              />
            )}
          </svg>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginTop: 4 }}>
          <span>{hist[0]?.day?.slice(5) ?? ""}</span>
          <span>Today</span>
          <span>{proj[proj.length - 1]?.day?.slice(5) ?? ""}</span>
        </div>
      </div>

      <div style={{ padding: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 12, color: "#666" }}>
        Projection uses ordinary least squares on daily revenue. Assumes current trend continues — does not account for seasonality, new product launches, or marketing spend changes. Use as a directional signal, not a financial forecast.
      </div>
    </div>
  )
}

// ─── TABS DEFINITION ──────────────────────────────────────────────────────────

const TABS = [
  { id: "overview",   label: "Overview" },
  { id: "revenue",    label: "Revenue" },
  { id: "products",   label: "Products" },
  { id: "customers",  label: "Customers" },
  { id: "funnel",     label: "Funnel" },
  { id: "search",     label: "Search" },
  { id: "ai",         label: "AI Studio" },
  { id: "community",  label: "Community" },
  { id: "insights",   label: "Insights" },
  { id: "forecast",   label: "Forecast" },
] as const

type TabId = typeof TABS[number]["id"]

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function BIPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [preset, setPreset]       = useState<DatePreset>("30d")
  const [range, setRange]         = useState<DateRange>(() => getRange("30d"))

  function selectPreset(p: DatePreset) {
    setPreset(p)
    setRange(getRange(p))
  }

  const presetButtons: Array<{ id: DatePreset; label: string }> = [
    { id: "7d",  label: "7 Days" },
    { id: "30d", label: "30 Days" },
    { id: "90d", label: "90 Days" },
    { id: "ytd", label: "Year to Date" },
  ]

  return (
    <div style={{ fontFamily: "inherit", minHeight: "100vh" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Business Intelligence</h1>
            <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0" }}>
              Real data from orders, downloads, customers, and platform usage
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#888", marginRight: 4 }}>Period:</span>
            {presetButtons.map((btn) => (
              <button key={btn.id} onClick={() => selectPreset(btn.id)}
                style={{
                  padding: "6px 14px", borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: preset === btn.id ? "#6366f1" : "transparent",
                  color: preset === btn.id ? "#fff" : "#888",
                  cursor: "pointer", fontSize: 12,
                }}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 8 }}>
          {new Date(range.from).toLocaleDateString()} → {new Date(range.to).toLocaleDateString()}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", gap: 2, marginBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.08)", overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 16px", background: "transparent",
              border: "none", borderBottom: activeTab === tab.id ? "2px solid #6366f1" : "2px solid transparent",
              color: activeTab === tab.id ? "#e2e8f0" : "#888",
              cursor: "pointer", fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
              whiteSpace: "nowrap", transition: "color 0.2s",
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Active tab content ── */}
      <div>
        {activeTab === "overview"  && <OverviewTab  range={range} key={range.from} />}
        {activeTab === "revenue"   && <RevenueTab   range={range} key={range.from} />}
        {activeTab === "products"  && <ProductsTab  range={range} key={range.from} />}
        {activeTab === "customers" && <CustomersTab range={range} key={range.from} />}
        {activeTab === "funnel"    && <FunnelTab    range={range} key={range.from} />}
        {activeTab === "search"    && <SearchTab    range={range} key={range.from} />}
        {activeTab === "ai"        && <AIStudioTab  range={range} key={range.from} />}
        {activeTab === "community" && <CommunityTab range={range} key={range.from} />}
        {activeTab === "insights"  && <InsightsTab  range={range} key={range.from} />}
        {activeTab === "forecast"  && <ForecastTab               key={range.from} />}
      </div>
    </div>
  )
}
