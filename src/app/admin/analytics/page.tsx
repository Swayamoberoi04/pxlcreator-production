"use client"

/**
 * /admin/analytics — Read-only aggregation dashboard
 *
 * Pulls from:
 *   • orders / order_items   — REAL revenue + orders (Razorpay-confirmed)
 *   • download_events        — REAL download counts (record_preset_download RPC)
 *   • presets.view_count     — REAL (increment_preset_views RPC on detail page)
 *   • blog_posts.views_count — DISPLAY field (admin-editable, not auto-tracked)
 *   • courses.students_count / revenue_cached — DISPLAY fields (admin-editable)
 *
 * All data labelled accordingly so the operator is never misled.
 */

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"

/* ── Types ────────────────────────────────────────────────────── */
interface Summary {
  total_revenue_inr:     number
  paid_orders_count:     number
  total_downloads:       number
  free_downloads:        number
  paid_downloads:        number
  total_preset_views:    number
  total_blog_views:      number
  total_course_students: number
  total_course_revenue:  number
  revenue_today:         number
  revenue_this_week:     number
  revenue_this_month:    number
  orders_today:          number
  orders_this_week:      number
  orders_this_month:     number
  downloads_today:       number
  downloads_this_week:   number
  downloads_this_month:  number
}

interface TrendDay {
  day:     string
  revenue?: number
  orders?:  number
  total?:   number
  free?:    number
  paid?:    number
}

interface TopPreset {
  preset_id:    string
  preset_title: string
  preset_slug:  string
  revenue?:     number
  unit_sales?:  number
  total?:       number
}

interface AnalyticsData {
  summary:      Summary
  revTrend:     TrendDay[]
  dlTrend:      TrendDay[]
  topRevenue:   TopPreset[]
  topDownloads: TopPreset[]
}

/* ── Sparkline SVG ────────────────────────────────────────────── */
function Sparkline({
  data,
  valueKey,
  color = "#FFD60A",
  height = 48,
}: {
  data:     TrendDay[]
  valueKey: keyof TrendDay
  color?:   string
  height?:  number
}) {
  if (!data.length) return null
  const vals    = data.map((d) => Number(d[valueKey] ?? 0))
  const max     = Math.max(...vals, 1)
  const width   = 280
  const padX    = 0
  const padY    = 4
  const xStep   = (width - padX * 2) / Math.max(vals.length - 1, 1)
  const points  = vals.map((v, i) => {
    const x = padX + i * xStep
    const y = padY + (1 - v / max) * (height - padY * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const polyline = points.join(" ")

  const areaPoints =
    `${padX},${height} ` + polyline + ` ${padX + (vals.length - 1) * xStep},${height}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`sg-${valueKey as string}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#sg-${valueKey as string})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Stat tile ────────────────────────────────────────────────── */
function StatTile({
  label,
  value,
  sub,
  hint,
  trend,
  trendKey,
  color = "#FFD60A",
  prefix = "",
  suffix = "",
  isDisplay = false,
}: {
  label:     string
  value:     number | string
  sub?:      string
  hint?:     string
  trend?:    TrendDay[]
  trendKey?: keyof TrendDay
  color?:    string
  prefix?:   string
  suffix?:   string
  isDisplay?: boolean
}) {
  const formatted =
    typeof value === "number"
      ? value.toLocaleString("en-IN", { maximumFractionDigits: 0 })
      : value

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-white/40">{label}</p>
          {isDisplay && (
            <p className="text-[0.6rem] text-amber-400/70 leading-none">display value</p>
          )}
        </div>
        {hint && (
          <span className="text-[0.65rem] text-white/30 text-right leading-tight max-w-[100px]">{hint}</span>
        )}
      </div>

      <p className="font-mono font-bold text-[1.5rem] text-white leading-none">
        {prefix}{formatted}{suffix}
      </p>

      {sub && (
        <p className="text-[0.75rem] text-white/50">{sub}</p>
      )}

      {trend && trendKey && (
        <div className="mt-1">
          <Sparkline data={trend} valueKey={trendKey} color={color} height={44} />
        </div>
      )}
    </div>
  )
}

/* ── Mini bar chart ───────────────────────────────────────────── */
function BarChart({
  data,
  valueKey,
  labelKey,
  color = "#FFD60A",
  formatValue,
}: {
  data:        TopPreset[]
  valueKey:    keyof TopPreset
  labelKey:    keyof TopPreset
  color?:      string
  formatValue: (v: number) => string
}) {
  if (!data.length) return <p className="text-[0.8125rem] text-white/40 py-4 text-center">No data yet</p>

  const max = Math.max(...data.map((d) => Number(d[valueKey] ?? 0)), 1)

  return (
    <div className="flex flex-col gap-2">
      {data.slice(0, 8).map((row, i) => {
        const val = Number(row[valueKey] ?? 0)
        const pct = (val / max) * 100
        return (
          <div key={row.preset_id ?? i} className="flex items-center gap-3">
            <span className="text-[0.65rem] text-white/30 w-4 shrink-0 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[0.8125rem] text-white/85 truncate leading-tight">{String(row[labelKey] ?? "—")}</p>
              <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
            <span className="text-[0.75rem] font-mono text-white/60 shrink-0">{formatValue(val)}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Loading skeleton ─────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-36 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-64 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
        ))}
      </div>
    </div>
  )
}

/* ── Period badge ─────────────────────────────────────────────── */
function PeriodRow({
  label, today, week, month, prefix = "", suffix = "",
}: {
  label: string; today: number; week: number; month: number
  prefix?: string; suffix?: string
}) {
  const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 })
  return (
    <div className="flex items-center gap-2 text-[0.8125rem] text-white/60">
      <span className="text-white/40 w-32 shrink-0">{label}</span>
      <span className="font-mono">{prefix}{fmt(today)}{suffix}</span>
      <span className="text-white/20">·</span>
      <span className="font-mono">{prefix}{fmt(week)}{suffix}</span>
      <span className="text-white/20">·</span>
      <span className="font-mono">{prefix}{fmt(month)}{suffix}</span>
    </div>
  )
}

/* ── Main page ────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [data,    setData]    = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/analytics")
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const json = await res.json() as AnalyticsData
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setTimeout(() => { void fetchData() }, 0)
  }, [fetchData])

  const s = data?.summary

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[1.375rem] text-white leading-tight">Analytics</h1>
          <p className="mt-1 text-[0.8125rem] text-white/50">
            Real revenue and download data. Blog views and course stats are display values (admin-editable).
          </p>
        </div>
        <button
          type="button"
          onClick={() => { void fetchData() }}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-[0.8125rem] text-white/60 hover:text-white/90 hover:border-white/25 transition-colors disabled:opacity-40"
        >
          <RefreshIcon />
          Refresh
        </button>
      </div>

      {loading && <Skeleton />}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-4 text-[0.875rem] text-red-400">
          {error}
          <button type="button" onClick={() => { void fetchData() }} className="ml-3 underline hover:no-underline">Retry</button>
        </div>
      )}

      {!loading && data && s && (
        <>
          {/* Period legend */}
          <div className="flex items-center gap-2 text-[0.7rem] text-white/30 uppercase tracking-widest">
            <span>Periods:</span>
            <span>Today · This Week · This Month</span>
          </div>

          {/* Revenue + Orders — real data */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[0.7rem] font-bold uppercase tracking-widest text-white/40">Revenue &amp; Orders — Live</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatTile
                label="Total Revenue"
                value={s.total_revenue_inr}
                prefix="₹"
                hint="All-time paid orders"
                trend={data.revTrend}
                trendKey="revenue"
                color="#4ade80"
              />
              <StatTile
                label="Total Orders"
                value={s.paid_orders_count}
                hint="Razorpay-confirmed"
                trend={data.revTrend}
                trendKey="orders"
                color="#60a5fa"
              />
              <div className="col-span-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 flex flex-col gap-3">
                <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-white/40">Period Breakdown</p>
                <div className="flex flex-col gap-1.5 mt-1">
                  <PeriodRow label="Revenue (₹)"  today={s.revenue_today}  week={s.revenue_this_week}  month={s.revenue_this_month}  prefix="₹" />
                  <PeriodRow label="Orders"        today={s.orders_today}   week={s.orders_this_week}   month={s.orders_this_month}   />
                  <PeriodRow label="Downloads"     today={s.downloads_today} week={s.downloads_this_week} month={s.downloads_this_month} />
                </div>
              </div>
            </div>
          </section>

          {/* Downloads — real data */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[0.7rem] font-bold uppercase tracking-widest text-white/40">Downloads — Live</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <StatTile
                label="Total Downloads"
                value={s.total_downloads}
                sub={`${s.free_downloads.toLocaleString()} free · ${s.paid_downloads.toLocaleString()} paid`}
                trend={data.dlTrend}
                trendKey="total"
                color="#c084fc"
              />
              <StatTile label="Free Downloads" value={s.free_downloads}  trend={data.dlTrend} trendKey="free" color="#94a3b8" />
              <StatTile label="Paid Downloads" value={s.paid_downloads}  trend={data.dlTrend} trendKey="paid" color="#FFD60A" />
            </div>
          </section>

          {/* Preset views — real */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[0.7rem] font-bold uppercase tracking-widest text-white/40">Content — Mixed</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <StatTile
                label="Preset Views"
                value={s.total_preset_views}
                hint="RPC-tracked on detail page"
              />
              <StatTile
                label="Blog Views"
                value={s.total_blog_views}
                hint="Sum of views_count"
                isDisplay
              />
              <StatTile
                label="Course Students"
                value={s.total_course_students}
                sub={`₹${s.total_course_revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} display revenue`}
                isDisplay
              />
            </div>
          </section>

          {/* 30-day trend charts */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[0.8125rem] font-semibold text-white/85">Revenue Trend — 30 days</h3>
                <span className="text-[0.65rem] text-white/30 uppercase tracking-wide">₹ INR</span>
              </div>
              <Sparkline data={data.revTrend} valueKey="revenue" color="#4ade80" height={80} />
              <p className="text-[0.7rem] text-white/30">
                {data.revTrend.filter((d) => (d.revenue ?? 0) > 0).length} active days in last 30
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[0.8125rem] font-semibold text-white/85">Download Trend — 30 days</h3>
                <span className="text-[0.65rem] text-white/30 uppercase tracking-wide">total</span>
              </div>
              <Sparkline data={data.dlTrend} valueKey="total" color="#c084fc" height={80} />
              <p className="text-[0.7rem] text-white/30">
                {data.dlTrend.filter((d) => (d.total ?? 0) > 0).length} active days in last 30
              </p>
            </div>
          </section>

          {/* Top presets tables */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[0.8125rem] font-semibold text-white/85">Top Presets by Revenue</h3>
                <span className="text-[0.65rem] text-white/30 uppercase tracking-wide">₹ INR</span>
              </div>
              <BarChart
                data={data.topRevenue}
                valueKey="revenue"
                labelKey="preset_title"
                color="#4ade80"
                formatValue={(v) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
              />
              {data.topRevenue.length > 0 && (
                <p className="text-[0.7rem] text-white/30">From confirmed paid orders · all time</p>
              )}
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[0.8125rem] font-semibold text-white/85">Top Presets by Downloads</h3>
                <span className="text-[0.65rem] text-white/30 uppercase tracking-wide">all-time total</span>
              </div>
              <BarChart
                data={data.topDownloads}
                valueKey="total"
                labelKey="preset_slug"
                color="#c084fc"
                formatValue={(v) => v.toLocaleString()}
              />
              {data.topDownloads.length > 0 && (
                <p className="text-[0.7rem] text-white/30">
                  RPC-tracked downloads (free + paid) ·{" "}
                  <Link href="/admin/presets" className="text-white/50 hover:text-white/80 underline transition-colors">
                    manage presets →
                  </Link>
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/>
    </svg>
  )
}
