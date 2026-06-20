"use client"

/**
 * /admin/pricing/bundles
 *
 * Bundle pricing reference panel.
 * Shows each bundle with its real individual pack breakdown,
 * computed savings, and links to the live bundle page.
 *
 * Bundles are currently static data (src/data/bundles.ts).
 * To change a bundle price, edit that file directly.
 * Individual PRESET prices are managed via /admin/presets/[id].
 */

import { useEffect, useState } from "react"
import Link                    from "next/link"
import type { Bundle }         from "@/types/bundle"
import { cn }                  from "@/lib/utils"

export default function AdminBundlePricingPage() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/bundles")
      .then((r) => r.json())
      .then((j) => setBundles(j.bundles ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-8 p-8 max-w-4xl">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-px w-5 bg-gold/50" />
          <span className="text-[0.7rem] text-gold/60 tracking-widest">( BUNDLE PRICING )</span>
        </div>
        <h1 className="font-display font-black text-[1.75rem] text-white/90">
          Bundle Prices
        </h1>
        <p className="text-[0.875rem] text-white/30 max-w-xl">
          Read-only reference — bundles are static data.
          Edit <code className="text-gold/60 bg-gold/5 rounded px-1">src/data/bundles.ts</code> to
          change a bundle price or composition.
          Individual preset prices are set in{" "}
          <Link href="/admin/presets" className="text-gold/60 hover:text-gold transition-colors">
            Admin → Presets
          </Link>.
        </p>
      </div>

      {/* Important rule */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-5 py-4 flex gap-3">
        <span className="text-amber-400/80 mt-0.5 flex-shrink-0">⚠</span>
        <div>
          <p className="text-[0.875rem] font-semibold text-amber-400/90">Bundle pricing is independent</p>
          <p className="text-[0.8125rem] text-white/30 mt-0.5 leading-relaxed">
            Changing a bundle price never overwrites individual preset prices, and vice versa.
            Each preset&apos;s price lives in its own DB row.
            Bundle prices here reference individual values only for savings display.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {bundles.map((bundle) => {
            const savings    = bundle.individualValueUsd > 0
              ? Math.round((1 - bundle.price / bundle.individualValueUsd) * 100)
              : 0
            const savedAmt   = (bundle.individualValueUsd - bundle.price).toFixed(2)
            const hasRealPacks = bundle.includedPacks.some((p) => p.slug)

            return (
              <div
                key={bundle.id}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
              >
                {/* Bundle header */}
                <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn(
                      "text-[0.6rem] font-black tracking-widest uppercase rounded-full px-2.5 py-[5px] flex-shrink-0",
                      "bg-gold/15 text-gold border border-gold/25"
                    )}>
                      {bundle.bundleBadge}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.9375rem] font-bold text-white/80 truncate">{bundle.name}</p>
                      <p className="text-[0.75rem] text-white/30 truncate mt-0.5">{bundle.tagline}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {!hasRealPacks && (
                      <span className="text-[0.65rem] font-bold text-red-400/70 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1">
                        ⚠ No real preset slugs
                      </span>
                    )}
                    <Link
                      href={`/bundles/${bundle.slug}`}
                      target="_blank"
                      className="text-[0.75rem] text-white/30 hover:text-gold transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-gold/30"
                    >
                      View ↗
                    </Link>
                  </div>
                </div>

                {/* Pack breakdown */}
                <div className="px-6 py-4">
                  <p className="text-[0.65rem] font-bold tracking-widest uppercase text-white/25 mb-3">
                    Included Packs
                  </p>
                  <div className="space-y-2">
                    {bundle.includedPacks.map((pack) => (
                      <div
                        key={pack.name}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base leading-none flex-shrink-0">{pack.icon}</span>
                          <div className="min-w-0">
                            {pack.slug ? (
                              <Link
                                href={`/presets/${pack.slug}`}
                                target="_blank"
                                className="text-[0.8125rem] text-white/60 hover:text-gold transition-colors truncate block"
                              >
                                {pack.name} ↗
                              </Link>
                            ) : (
                              <span className="text-[0.8125rem] text-red-400/60 truncate block">
                                {pack.name} ⚠ no slug
                              </span>
                            )}
                            <p className="text-[0.7rem] text-white/25">{pack.presetCount} presets · {pack.category}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {pack.priceUsd !== undefined ? (
                            <span className={cn(
                              "text-[0.875rem] font-bold",
                              pack.priceUsd === 0 ? "text-emerald-400/60" : "text-white/60"
                            )}>
                              {pack.priceUsd === 0 ? "Free" : `$${pack.priceUsd.toFixed(2)}`}
                            </span>
                          ) : (
                            <span className="text-[0.75rem] text-white/20">— no price</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing summary row */}
                <div className="border-t border-white/[0.05] px-6 py-4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[0.65rem] text-white/25 uppercase tracking-wide mb-0.5">Individual Value</p>
                    <p className="text-[1rem] font-bold text-white/40 line-through">
                      ${bundle.individualValueUsd.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] text-white/25 uppercase tracking-wide mb-0.5">Bundle Price</p>
                    <p className="text-[1rem] font-bold text-gold">
                      ${bundle.price.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] text-white/25 uppercase tracking-wide mb-0.5">Customer Saves</p>
                    <p className="text-[1rem] font-bold text-emerald-400">
                      ${savedAmt} ({savings}%)
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Note about preset pricing */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
        <p className="text-[0.8125rem] font-semibold text-white/50 mb-2">Per-Preset Pricing</p>
        <p className="text-[0.775rem] text-white/30 leading-relaxed mb-3">
          Each preset has its own <strong className="text-white/50">Price</strong> (current/sale price) and{" "}
          <strong className="text-white/50">Original Price</strong> (shown struck-through).
          Edit individual preset prices from the preset editor.
        </p>
        <Link
          href="/admin/presets"
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-gold/70 hover:text-gold transition-colors"
        >
          Go to Presets →
        </Link>
      </div>

    </div>
  )
}
