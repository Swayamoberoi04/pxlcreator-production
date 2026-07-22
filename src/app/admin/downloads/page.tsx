"use client"

/**
 * /admin/downloads — Download Analytics dashboard.
 *
 * Reads /api/admin/downloads (cookie-guarded, same-origin). Renders KPIs,
 * a 30-day trend area chart, top-10 and least-downloaded lists, a full
 * per-preset table, and CSV/Excel export — all with dependency-free SVG
 * charts on the brand tokens.
 */

import { useEffect, useState } from "react"

interface PresetRow {
  presetId: string; slug: string; name: string; price: number; isFree: boolean
  total: number; free: number; paid: number; today: number; week: number; month: number
  purchases: number; revenue: number; paidShare: number
}
interface TrendPoint { day: string; total: number; free: number; paid: number }
interface Payload {
  success: true
  totals: { total: number; free: number; paid: number; today: number; week: number; month: number; revenue: number; paidShare: number; presetsWithDownloads: number; presetCount: number }
  top10: PresetRow[]; least: PresetRow[]; trend: TrendPoint[]; presets: PresetRow[]
}

export default function DownloadAnalyticsPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/downloads", { credentials: "same-origin" })
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok || !j.success) throw new Error(j.detail || j.error || `HTTP ${r.status}`)
        setData(j as Payload)
      })
      .catch((e) => setError(String(e.message ?? e)))
  }, [])

  return (
    <div className="flex flex-col gap-8 p-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-px w-5 bg-gold/50" />
          <span className="text-[0.7rem] text-gold/60 tracking-widest">( ANALYTICS )</span>
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="font-display font-black text-[1.75rem] text-white/90">Download Analytics</h1>
          <a
            href="/api/admin/downloads?format=csv"
            className="rounded-full border border-border bg-surface px-4 py-2 text-[0.8125rem] font-medium text-white/70 hover:border-gold/40 hover:text-gold transition-colors"
          >
            Export CSV / Excel
          </a>
        </div>
        <p className="text-[0.875rem] text-white/30">Genuine successful downloads only — never views, clicks, or failed attempts.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-[0.875rem] text-red-300">
          {error.includes("021") || error.includes("does not exist") || error.includes("schema")
            ? "Analytics tables not found — apply migration 021_download_analytics.sql in the Supabase SQL editor, then reload."
            : `Could not load analytics: ${error}`}
        </div>
      )}

      {!data && !error && <div className="h-40 rounded-2xl bg-surface border border-border animate-pulse" />}

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="All-Time Downloads" value={data.totals.total} accent="text-gold" />
            <Kpi label="Today"  value={data.totals.today} />
            <Kpi label="This Week"  value={data.totals.week} />
            <Kpi label="This Month" value={data.totals.month} />
            <Kpi label="Free Downloads"  value={data.totals.free}  accent="text-emerald-400" />
            <Kpi label="Paid Downloads"  value={data.totals.paid}  accent="text-gold" />
            <Kpi label="Est. Revenue" value={data.totals.revenue} money accent="text-white/90" />
            <Kpi label="Paid Share"   value={Math.round(data.totals.paidShare * 100)} suffix="%" />
          </div>

          {/* Trend chart */}
          <Panel title="Downloads — last 30 days">
            <TrendChart trend={data.trend} />
          </Panel>

          {/* Top 10 + Least */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel title="Top 10 Presets">
              <BarList rows={data.top10} />
            </Panel>
            <Panel title="Least Downloaded (with ≥1)">
              {data.least.length > 0
                ? <BarList rows={data.least} />
                : <p className="text-[0.8125rem] text-white/30 py-6 text-center">No downloads recorded yet.</p>}
            </Panel>
          </div>

          {/* Full table */}
          <Panel title={`All presets (${data.totals.presetsWithDownloads}/${data.totals.presetCount} with downloads)`}>
            <div className="overflow-x-auto">
              <table className="w-full text-[0.8125rem]">
                <thead>
                  <tr className="text-left text-white/40 border-b border-border">
                    <th className="py-2 pr-3 font-semibold">Preset</th>
                    <th className="py-2 px-3 font-semibold text-right">Total</th>
                    <th className="py-2 px-3 font-semibold text-right">Free</th>
                    <th className="py-2 px-3 font-semibold text-right">Paid</th>
                    <th className="py-2 px-3 font-semibold text-right">Month</th>
                    <th className="py-2 px-3 font-semibold text-right">Revenue</th>
                    <th className="py-2 pl-3 font-semibold text-right">Paid %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.presets.map((r) => (
                    <tr key={r.presetId} className="border-b border-border/40 hover:bg-surface-2/40">
                      <td className="py-2 pr-3 text-white/80 truncate max-w-[220px]">{r.name || r.slug}</td>
                      <td className="py-2 px-3 text-right text-white/90 font-medium tabular-nums">{r.total.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-emerald-400/80 tabular-nums">{r.free.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-gold/80 tabular-nums">{r.paid.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-white/50 tabular-nums">{r.month.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-white/60 tabular-nums">{r.revenue ? `$${r.revenue.toLocaleString()}` : "—"}</td>
                      <td className="py-2 pl-3 text-right text-white/40 tabular-nums">{Math.round(r.paidShare * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}

/* ── Pieces ── */

function Kpi({ label, value, accent = "text-white/80", money, suffix }: {
  label: string; value: number; accent?: string; money?: boolean; suffix?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-1">
      <p className={`font-display font-black text-[1.5rem] leading-none ${accent}`}>
        {money ? "$" : ""}{value.toLocaleString()}{suffix ?? ""}
      </p>
      <p className="text-[0.7rem] text-white/40 uppercase tracking-wider font-semibold">{label}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
      <h2 className="text-[0.7rem] font-bold uppercase tracking-widest text-white/40">{title}</h2>
      {children}
    </div>
  )
}

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  if (trend.length === 0) return <p className="text-[0.8125rem] text-white/30 py-6 text-center">No data yet.</p>
  const W = 720, H = 160, P = 4
  const max = Math.max(1, ...trend.map((t) => t.total))
  const x = (i: number) => P + (i / Math.max(1, trend.length - 1)) * (W - 2 * P)
  const y = (v: number) => H - P - (v / max) * (H - 2 * P)
  const line = trend.map((t, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(t.total).toFixed(1)}`).join(" ")
  const area = `${line} L${x(trend.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`
  const peak = trend.reduce((m, t) => (t.total > m.total ? t : m), trend[0])

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none" role="img" aria-label="Daily downloads trend">
        <defs>
          <linearGradient id="dlgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#dlgrad)" />
        <path d={line} fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex items-center justify-between text-[0.7rem] text-white/35">
        <span>{trend[0]?.day}</span>
        <span>Peak {peak.total.toLocaleString()} on {peak.day}</span>
        <span>{trend[trend.length - 1]?.day}</span>
      </div>
    </div>
  )
}

function BarList({ rows }: { rows: PresetRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total))
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.presetId} className="flex items-center gap-3">
          <span className="text-[0.8125rem] text-white/70 truncate w-40 shrink-0">{r.name || r.slug}</span>
          <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold" style={{ width: `${(r.total / max) * 100}%` }} />
          </div>
          <span className="text-[0.8125rem] text-white/90 font-medium tabular-nums w-16 text-right shrink-0">{r.total.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}
