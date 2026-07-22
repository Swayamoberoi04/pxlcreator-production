/**
 * GET /api/admin/downloads — download analytics (admin-guarded).
 *
 * Composes the migration-021 rollup RPCs into one dashboard payload:
 *   • overall totals (all-time / today / week / month, free vs paid)
 *   • per-preset table (downloads, free/paid split, revenue, paid share)
 *   • top 10 + least downloaded
 *   • 30-day daily trend (for charts)
 *   • revenue (purchase_count × price) alongside downloads
 *
 * ?format=csv → streams a spreadsheet-ready CSV (opens in Excel) of the
 * per-preset table instead of JSON.
 *
 * Guarded twice: the /api/admin/* proxy matcher + requireAdmin here.
 */

import type { NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface PresetRow {
  presetId:   string
  slug:       string
  name:       string
  price:      number
  isFree:     boolean
  total:      number
  free:       number
  paid:       number
  today:      number
  week:       number
  month:      number
  purchases:  number
  revenue:    number
  paidShare:  number   // paid / total, 0–1
}

export async function GET(request: NextRequest): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const supabase = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient

  /* Per-preset windowed download rollup (RPC) + preset facts */
  const [statsRes, presetsRes, trendRes] = await Promise.all([
    supabase.rpc("preset_download_stats"),
    supabase.from("presets").select("id, slug, title, price, is_free, purchase_count"),
    supabase.rpc("download_daily_trend", { p_days: 30 }),
  ])

  if (statsRes.error || presetsRes.error) {
    return Response.json(
      { success: false, error: "Analytics unavailable. Ensure migration 021 is applied.", detail: statsRes.error?.message ?? presetsRes.error?.message },
      { status: 503 }
    )
  }

  const presetFacts = new Map<string, { slug: string; name: string; price: number; isFree: boolean; purchases: number }>()
  for (const p of (presetsRes.data ?? []) as Array<Record<string, unknown>>) {
    presetFacts.set(p.id as string, {
      slug:      (p.slug as string) ?? "",
      name:      (p.title as string) ?? "",
      price:     Number(p.price ?? 0),
      isFree:    Boolean(p.is_free),
      purchases: Number(p.purchase_count ?? 0),
    })
  }

  const rows: PresetRow[] = ((statsRes.data ?? []) as Array<Record<string, unknown>>).map((s) => {
    const id    = s.preset_id as string
    const facts = presetFacts.get(id) ?? { slug: (s.preset_slug as string) ?? "", name: "", price: 0, isFree: true, purchases: 0 }
    const total = Number(s.total ?? 0)
    const paid  = Number(s.paid ?? 0)
    return {
      presetId:  id,
      slug:      facts.slug,
      name:      facts.name,
      price:     facts.price,
      isFree:    facts.isFree,
      total,
      free:      Number(s.free ?? 0),
      paid,
      today:     Number(s.today ?? 0),
      week:      Number(s.this_week ?? 0),
      month:     Number(s.this_month ?? 0),
      purchases: facts.purchases,
      revenue:   Math.round(facts.purchases * facts.price * 100) / 100,
      paidShare: total > 0 ? Math.round((paid / total) * 1000) / 1000 : 0,
    }
  }).sort((a, b) => b.total - a.total)

  /* ── CSV / Excel export ── */
  if (request.nextUrl.searchParams.get("format") === "csv") {
    return csvResponse(rows)
  }

  /* ── Overall totals ── */
  const totals = rows.reduce(
    (acc, r) => {
      acc.total += r.total; acc.free += r.free; acc.paid += r.paid
      acc.today += r.today; acc.week += r.week; acc.month += r.month
      acc.revenue += r.revenue; acc.purchases += r.purchases
      return acc
    },
    { total: 0, free: 0, paid: 0, today: 0, week: 0, month: 0, revenue: 0, purchases: 0 }
  )

  const withDownloads = rows.filter((r) => r.total > 0)

  return Response.json(
    {
      success: true,
      totals: {
        ...totals,
        revenue:   Math.round(totals.revenue * 100) / 100,
        paidShare: totals.total > 0 ? Math.round((totals.paid / totals.total) * 1000) / 1000 : 0,
        presetsWithDownloads: withDownloads.length,
        presetCount: rows.length,
      },
      top10:    rows.slice(0, 10),
      least:    [...withDownloads].sort((a, b) => a.total - b.total).slice(0, 10),
      trend:    ((trendRes.data ?? []) as Array<Record<string, unknown>>).map((d) => ({
        day:   d.day as string,
        total: Number(d.total ?? 0),
        free:  Number(d.free ?? 0),
        paid:  Number(d.paid ?? 0),
      })),
      presets:  rows,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}

/* ─────────────────────────────────────────────────────────────
   CSV export (Excel-compatible)
───────────────────────────────────────────────────────────── */

function csvResponse(rows: PresetRow[]): Response {
  const header = [
    "Preset", "Slug", "Type", "Price", "Total Downloads", "Free", "Paid",
    "Today", "This Week", "This Month", "Purchases", "Revenue", "Paid Share %",
  ]
  const lines = rows.map((r) => [
    r.name, r.slug, r.isFree ? "Free" : "Paid", r.price,
    r.total, r.free, r.paid, r.today, r.week, r.month,
    r.purchases, r.revenue, Math.round(r.paidShare * 100),
  ])
  const csv = [header, ...lines]
    .map((cols) => cols.map(csvCell).join(","))
    .join("\r\n")

  const stamp = new Date().toISOString().slice(0, 10)
  return new Response("﻿" + csv, {   // BOM → Excel opens UTF-8 correctly
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pxl-downloads-${stamp}.csv"`,
      "Cache-Control":       "no-store",
    },
  })
}

function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
