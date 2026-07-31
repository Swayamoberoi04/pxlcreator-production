"use client"

/**
 * src/components/bundles/BundleCard.tsx
 *
 * Premium bundle card for the store grid.
 *
 * Visually distinct from PresetCard:
 *   - 16:9 thumbnail with bold overlay gradient
 *   - Bundle badge (BESTSELLER, TRENDING, etc.) top-left
 *   - Included-pack icon row
 *   - Pricing comparison: ~~individual~~ vs bundle price + SAVE X%
 *   - Dual currency (USD / INR) from the Zustand currency store
 *   - Add to Cart + View Details CTAs
 *
 * Cart integration: Bundle extends Preset, so addItem works unchanged.
 */

import Link             from "next/link"
import Image            from "next/image"
import { useState, useEffect } from "react"
import type { Bundle }        from "@/types/bundle"
import { useCurrencyStore }   from "@/store/currency"
import { useCartStore }       from "@/store/cart"
import { formatPrice }        from "@/lib/currency/format"
import { cn }                 from "@/lib/utils"

/* ── Badge colour map ──────────────────────────────────── */

const BADGE_STYLES: Record<string, string> = {
  "BESTSELLER":       "bg-gold text-[#0a0800] font-bold",
  "MOST POPULAR":     "bg-amber-400/20 text-amber-300 border border-amber-400/30",
  "CREATOR FAVORITE": "bg-pink-500/20  text-pink-300  border border-pink-500/30",
  "PRO LEVEL":        "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  "TRENDING":         "bg-sky-500/20   text-sky-300   border border-sky-500/30",
  "BEST VALUE":       "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  "LIMITED":          "bg-red-500/20   text-red-300   border border-red-500/30",
  "NEW":              "bg-white/5 text-white/85 border border-white/10",
}

/* ── Props ─────────────────────────────────────────────── */

interface BundleCardProps {
  bundle:     Bundle
  className?: string
}

/* ── Component ─────────────────────────────────────────── */

export function BundleCard({ bundle, className }: BundleCardProps) {
  /* Currency toggle — hydration safe */
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])
  const currency      = useCurrencyStore((s) => s.currency)
  const displayCurrency = mounted ? currency : "USD"

  /* Cart */
  const addItem = useCartStore((s) => s.addItem)
  const [added, setAdded] = useState(false)

  const totalPresets = bundle.includeCount
    ?? bundle.includedPacks.reduce((s, p) => s + p.presetCount, 0)

  const savingsPercent = bundle.individualValueUsd > 0
    ? Math.round((1 - bundle.price / bundle.individualValueUsd) * 100)
    : 0

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    addItem(bundle)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  const badgeStyle = BADGE_STYLES[bundle.bundleBadge] ?? BADGE_STYLES["NEW"]

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-2xl overflow-hidden",
        "bg-surface border border-border",
        "transition-all duration-300",
        "hover:border-gold/25 hover:-translate-y-1",
        "hover:shadow-[0_20px_60px_rgba(255,214,10,0.08)]",
        className
      )}
    >
      {/* ── Thumbnail ─────────────────────────────────── */}
      <Link
        href={`/bundles/${bundle.slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="relative aspect-[16/9] w-full overflow-hidden bg-[#0d0c08] block"
      >
        {bundle.thumbnailUrl ? (
          <Image
            src={bundle.thumbnailUrl}
            alt={bundle.name}
            fill
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 400px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          /* Gradient fallback with animated bars */
          <div className="absolute inset-0 bg-gradient-to-br from-[#1c1600] via-[#100e06] to-[#070600]">
            <div
              aria-hidden="true"
              className="absolute inset-0 flex items-end justify-center gap-[3px] pb-3 opacity-[0.12]"
            >
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[2px] rounded-full bg-gold"
                  style={{ height: `${22 + Math.abs(4 - i) * 8}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bottom vignette */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
        />

        {/* Bundle badge — top-left */}
        <div className="absolute top-3 left-3 z-10">
          <span className={cn(
            "inline-block text-[0.625rem] font-bold tracking-widest uppercase rounded-full px-2.5 py-[5px]",
            badgeStyle
          )}>
            {bundle.bundleBadge}
          </span>
        </div>

        {/* Preset count — bottom-right */}
        <div className="absolute bottom-3 right-3 z-10">
          <span className="text-[0.65rem] font-semibold text-white/85 bg-black/55 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/[0.08]">
            {totalPresets} presets
          </span>
        </div>
      </Link>

      {/* ── Body ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 p-5 flex-1">

        {/* Title */}
        <Link
          href={`/bundles/${bundle.slug}`}
          className={cn(
            "font-display font-bold text-[0.9375rem] leading-snug text-foreground",
            "group-hover:text-gold transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          )}
        >
          {bundle.name}
        </Link>

        {/* Tagline */}
        <p className="text-[0.8125rem] text-muted/85 leading-relaxed line-clamp-1 -mt-1">
          {bundle.tagline}
        </p>

        {/* Included pack icon chips */}
        <div className="flex flex-wrap gap-1.5">
          {bundle.includedPacks.slice(0, 4).map((pack) => (
            <span
              key={pack.name}
              title={`${pack.name} — ${pack.presetCount} presets`}
              className={cn(
                "flex items-center gap-1.5 text-[0.6875rem] font-medium",
                "text-muted/85 bg-surface-2/60 rounded-lg px-2 py-1.5 border border-border/40"
              )}
            >
              <span className="text-[0.85em]">{pack.icon}</span>
              <span className="truncate max-w-[68px]">
                {pack.name.split(" ").slice(0, 2).join(" ")}
              </span>
            </span>
          ))}
          {bundle.includedPacks.length > 4 && (
            <span className="flex items-center self-center text-[0.7rem] text-muted/70 px-1">
              +{bundle.includedPacks.length - 4}
            </span>
          )}
        </div>

        {/* ── Pricing comparison — the key conversion panel ── */}
        <div className="mt-auto pt-3.5 border-t border-border/50">
          <div className="flex items-end justify-between gap-3">

            {/* Price stack */}
            <div>
              {/* Strikethrough individual value */}
              <p className="text-[0.7rem] text-muted/70 mb-1 leading-none">
                Individually:{" "}
                <span
                  className="line-through"
                  suppressHydrationWarning
                >
                  {formatPrice(bundle.individualValueUsd, displayCurrency)}
                </span>
              </p>
              {/* Bundle price — big and gold */}
              <p
                className="font-display font-bold text-[1.375rem] leading-none text-gold"
                suppressHydrationWarning
              >
                {formatPrice(bundle.price, displayCurrency)}
              </p>
            </div>

            {/* Savings badge */}
            {savingsPercent > 0 && (
              <div className="flex-shrink-0 text-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 min-w-[58px]">
                <p className="text-[0.625rem] font-bold text-emerald-400/60 leading-none mb-0.5 tracking-wider uppercase">
                  Save
                </p>
                <p className="text-[1rem] font-bold text-emerald-400 leading-none">
                  {savingsPercent}%
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── CTA buttons ───────────────────────────────── */}
        <div className="flex gap-2 mt-1">

          {/* Add to Cart — primary */}
          <button
            type="button"
            onClick={handleAddToCart}
            suppressHydrationWarning
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5",
              "text-[0.8125rem] font-semibold transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              added
                ? "bg-emerald-600 text-white"
                : "bg-gold text-[#0a0800] hover:brightness-110 active:brightness-95"
            )}
          >
            {added ? <CheckIcon /> : <BagIcon />}
            {added ? "Added!" : "Add to Cart"}
          </button>

          {/* View Details — icon-only secondary */}
          <Link
            href={`/bundles/${bundle.slug}`}
            aria-label={`View ${bundle.name} details`}
            className={cn(
              "flex items-center justify-center rounded-xl px-3.5",
              "border border-border/60 text-muted/85",
              "hover:text-foreground hover:border-gold/25",
              "transition-all duration-200"
            )}
          >
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </article>
  )
}

/* ── Icons ─────────────────────────────────────────────── */

function BagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}

