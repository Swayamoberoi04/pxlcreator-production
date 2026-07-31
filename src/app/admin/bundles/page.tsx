"use client"

/**
 * src/app/admin/bundles/page.tsx
 *
 * Admin panel — bundle management overview.
 *
 * Shows:
 *   - Summary metrics (total, published, featured)
 *   - Full bundle table: badge, name, presets, price, savings, status
 *   - Quick-action links (view on store, edit — edit not wired yet)
 *
 * Data comes from the same repository that powers the public store.
 * Client component so it can fetch fresh data on mount without
 * breaking the admin session cookie flow.
 */

import { useEffect, useState } from "react"
import Link                    from "next/link"
import type { Bundle }         from "@/types/bundle"
import { cn }                  from "@/lib/utils"

/* ── Badge colours (matching BundleCard) ──────────────── */

const BADGE_STYLES: Record<string, string> = {
  "BESTSELLER":       "bg-gold/20 text-gold",
  "MOST POPULAR":     "bg-amber-500/15 text-amber-400",
  "CREATOR FAVORITE": "bg-pink-500/15 text-pink-400",
  "PRO LEVEL":        "bg-violet-500/15 text-violet-400",
  "TRENDING":         "bg-sky-500/15 text-sky-400",
  "BEST VALUE":       "bg-emerald-500/15 text-emerald-400",
  "LIMITED":          "bg-red-500/15 text-red-400",
  "NEW":              "bg-white/5 text-white/85",
}

/* ── Component ─────────────────────────────────────────── */

export default function AdminBundlesPage() {
  const [bundles, setBundles]   = useState<Bundle[]>([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/bundles")
      .then((r) => r.json())
      .then((json: { bundles?: Bundle[] }) => {
        setBundles(json.bundles ?? [])
        setLoading(false)
      })
      .catch((e) => {
        setError(String(e))
        setLoading(false)
      })
  }, [])

  /* ── Derived metrics ── */
  const published = bundles.filter((b) => !b.isFree).length
  const featured  = bundles.filter((b) => b.isFeatured).length
  const totalPresets = bundles.reduce(
    (sum, b) => sum + (b.includeCount ?? b.includedPacks.reduce((s, p) => s + p.presetCount, 0)),
    0
  )

  return (
    <div className="space-y-8">

      {/* ── Page header ─────────────────────────────── */}
      <div>
        <h1 className="text-[1.375rem] font-bold text-foreground">Bundles</h1>
        <p className="text-[0.8125rem] text-muted/70 mt-0.5">
          Manage premium preset bundles. Bundles are curated from existing presets.
        </p>
      </div>

      {/* ── Metrics ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Bundles",   value: loading ? "…" : bundles.length },
          { label: "Published",       value: loading ? "…" : published },
          { label: "Featured",        value: loading ? "…" : featured },
          { label: "Total Presets",   value: loading ? "…" : totalPresets + "+" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-border/50 bg-surface px-4 py-4"
          >
            <p className="text-[1.5rem] font-bold text-foreground leading-none">{value}</p>
            <p className="text-[0.75rem] text-muted/70 mt-1 tracking-wide uppercase">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Table ───────────────────────────────────── */}
      <div className="rounded-xl border border-border/50 bg-surface overflow-hidden">

        {/* Table header */}
        <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
          <h2 className="text-[0.875rem] font-bold text-foreground/92">All Bundles</h2>
          <span className="text-[0.75rem] text-muted/70">
            Sorted by value (highest savings first)
          </span>
        </div>

        {/* Loading / error states */}
        {loading && (
          <div className="px-5 py-12 text-center">
            <p className="text-muted/70 text-sm">Loading bundles…</p>
          </div>
        )}
        {!loading && error && (
          <div className="px-5 py-12 text-center">
            <p className="text-red-400/70 text-sm">Failed to load bundles: {error}</p>
          </div>
        )}

        {/* Bundle rows */}
        {!loading && !error && bundles.length > 0 && (
          <div className="divide-y divide-border/30">
            {[...bundles]
              .sort((a, b) => {
                const savA = Math.round((1 - a.price / a.individualValueUsd) * 100)
                const savB = Math.round((1 - b.price / b.individualValueUsd) * 100)
                return savB - savA
              })
              .map((bundle) => {
                const totalCount = bundle.includeCount
                  ?? bundle.includedPacks.reduce((s, p) => s + p.presetCount, 0)
                const savings = Math.round((1 - bundle.price / bundle.individualValueUsd) * 100)
                const badgeStyle = BADGE_STYLES[bundle.bundleBadge] ?? BADGE_STYLES["NEW"]

                return (
                  <div
                    key={bundle.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Badge */}
                    <div className="w-[140px] flex-shrink-0">
                      <span className={cn(
                        "text-[0.625rem] font-bold tracking-widest uppercase rounded-full px-2.5 py-1",
                        badgeStyle
                      )}>
                        {bundle.bundleBadge}
                      </span>
                    </div>

                    {/* Name & tagline */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.875rem] font-semibold text-foreground truncate">
                        {bundle.name}
                      </p>
                      <p className="text-[0.75rem] text-muted/70 truncate mt-0.5">
                        {bundle.tagline}
                      </p>
                    </div>

                    {/* Preset count */}
                    <div className="w-[80px] flex-shrink-0 text-center hidden sm:block">
                      <p className="text-[0.875rem] font-bold text-foreground/92">{totalCount}</p>
                      <p className="text-[0.625rem] text-muted/70 uppercase tracking-wide">presets</p>
                    </div>

                    {/* Pricing */}
                    <div className="w-[120px] flex-shrink-0 text-right hidden md:block">
                      <p className="text-[0.875rem] font-bold text-gold">${bundle.price}</p>
                      <p className="text-[0.7rem] text-muted/70 line-through">${bundle.individualValueUsd}</p>
                    </div>

                    {/* Savings badge */}
                    <div className="w-[70px] flex-shrink-0 text-center hidden md:block">
                      <span className="text-[0.75rem] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1">
                        −{savings}%
                      </span>
                    </div>

                    {/* Status */}
                    <div className="w-[80px] flex-shrink-0 text-center hidden sm:block">
                      <span className={cn(
                        "text-[0.65rem] font-semibold rounded-full px-2 py-0.5",
                        bundle.isFeatured
                          ? "bg-gold/15 text-gold/80"
                          : "bg-white/5 text-white/70"
                      )}>
                        {bundle.isFeatured ? "Featured" : "Active"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <Link
                        href={`/bundles/${bundle.slug}`}
                        target="_blank"
                        className="text-[0.75rem] font-medium text-muted/70 hover:text-muted/92 transition-colors px-2 py-1 rounded"
                        aria-label={`View ${bundle.name} on store`}
                      >
                        View ↗
                      </Link>
                    </div>
                  </div>
                )
              })
            }
          </div>
        )}

        {!loading && !error && bundles.length === 0 && (
          <div className="px-5 py-14 text-center">
            <p className="text-muted/70 text-sm">No bundles found.</p>
            <p className="text-muted/70 text-xs mt-1">
              Run migration 005_bundles_schema.sql and populate the bundles table.
            </p>
          </div>
        )}
      </div>

      {/* ── Setup note ──────────────────────────────── */}
      <div className="rounded-xl border border-border/40 bg-surface-2/30 px-5 py-4">
        <p className="text-[0.8125rem] font-semibold text-foreground/85 mb-1">
          Bundle management
        </p>
        <p className="text-[0.8125rem] text-muted/70 leading-relaxed">
          Bundles are currently served from{" "}
          <code className="text-gold/60 bg-gold/5 rounded px-1">src/data/bundles.ts</code>{" "}
          (static fallback). To manage bundles from the database, populate the{" "}
          <code className="text-gold/60 bg-gold/5 rounded px-1">bundles</code> and{" "}
          <code className="text-gold/60 bg-gold/5 rounded px-1">bundle_included_packs</code>{" "}
          tables (migration 005_bundles_schema.sql already applied).
        </p>
      </div>

    </div>
  )
}
