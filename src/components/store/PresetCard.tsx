"use client"

import Link         from "next/link"
import Image        from "next/image"
import { useState, useEffect } from "react"
import type { Preset }         from "@/types/product"
import { useCurrencyStore }    from "@/store/currency"
import { formatPrice }         from "@/lib/currency/format"
import { cn }                  from "@/lib/utils"
import { Tilt3D }              from "@/components/ui/Tilt3D"
/*
 * GSAP is intentionally NOT imported at the module level.
 * It's only used in the add-to-cart particle burst — a user-initiated
 * action. Lazy-importing inside the callback keeps GSAP (~100 KB) out
 * of the initial PresetCard bundle completely.
 */

interface PresetCardProps {
  preset:     Preset
  className?: string
}

/* ── Category gradient map ─────────────────────────────── */
const categoryGradients: Record<string, string> = {
  "Cinematic":      "from-[#3d2b00] via-[#1a1200] to-[#0a0800]",
  "Film Emulation": "from-[#2b1f0f] via-[#1a1208] to-[#0d0a05]",
  "Portrait":       "from-[#2b1a0a] via-[#1a1010] to-[#0a0808]",
  "Landscape":      "from-[#0a1a2b] via-[#081018] to-[#050810]",
  "Street":         "from-[#111111] via-[#1a1a1a] to-[#0a0a0a]",
  "Bundle":         "from-[#1a1500] via-[#12100a] to-[#080700]",
}

/* ── Conversion tag colour map ─────────────────────────── */
const CONV_TAG_STYLES: Record<string, string> = {
  "MOST POPULAR":      "bg-gold/15 text-gold border-gold/25",
  "BEST VALUE":        "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "CREATOR FAVORITE":  "bg-pink-500/15 text-pink-400 border-pink-500/25",
  "PRO EDITOR PICK":   "bg-violet-500/15 text-violet-400 border-violet-500/25",
  "BEGINNER FRIENDLY": "bg-sky-500/15 text-sky-400 border-sky-500/25",
  "COMMUNITY FAVORITE":"bg-amber-500/15 text-amber-400 border-amber-500/25",
  "FREE STARTER":      "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "TRENDING":          "bg-rose-500/15 text-rose-400 border-rose-500/25",
}

export function PresetCard({ preset, className }: PresetCardProps) {
  /* Hydration-safe currency */
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])
  const currency        = useCurrencyStore((s) => s.currency)
  const displayCurrency = mounted ? currency : "INR"
  const altCurrency     = displayCurrency === "INR" ? "USD" : "INR"

  const gradient = categoryGradients[preset.category] ?? categoryGradients["Street"]
  const discount  = preset.originalPrice
    ? Math.round((1 - preset.price / preset.originalPrice) * 100)
    : null

  const convTagStyle = preset.conversionTag
    ? (CONV_TAG_STYLES[preset.conversionTag] ?? "bg-surface-2 text-muted border-border")
    : null

  return (
    <Tilt3D maxDeg={6} className={className}>
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl overflow-hidden",
        "bg-surface border border-border",
        "transition-all duration-300",
        "hover:border-gold/40",
        "hover:shadow-[0_8px_48px_rgba(255,214,10,0.16),0_0_0_1px_rgba(255,214,10,0.07)]",
      )}
    >
      {/* ── Thumbnail ── */}
      <Link
        href={`/presets/${preset.slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2 block"
      >
        {preset.thumbnailUrl ? (
          <Image
            src={preset.thumbnailUrl}
            alt={preset.name}
            fill
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br transition-transform duration-500 group-hover:scale-[1.04]",
            gradient
          )}>
            <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center opacity-15 gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-px bg-gold" style={{ height: `${40 + i * 12}%` }} />
              ))}
            </div>
          </div>
        )}

        {/* Letterbox scrim on hover */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[8%] bg-gradient-to-b from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[8%] bg-gradient-to-t from-black/60 to-transparent"
        />

        {/* Category label */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <span className="text-[0.65rem] font-semibold tracking-widest uppercase text-white/70 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/10">
            ( {preset.category} )
          </span>
        </div>

        {/* Product badge */}
        {preset.badge && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className={cn(
              "text-[0.65rem] font-bold tracking-widest uppercase rounded-full px-2.5 py-1",
              preset.badge === "Best Seller" && "bg-gold text-background",
              preset.badge === "New"         && "bg-surface-2/90 backdrop-blur-sm text-foreground border border-border",
              preset.badge === "Sale"        && "bg-red-500/20 backdrop-blur-sm text-red-400 border border-red-500/30",
              preset.badge === "Free"        && "bg-emerald-500/20 backdrop-blur-sm text-emerald-400 border border-emerald-500/30",
              preset.badge === "Popular"     && "bg-gold/20 backdrop-blur-sm text-gold border border-gold/30",
              preset.badge === "Trending"    && "bg-rose-500/20 backdrop-blur-sm text-rose-400 border border-rose-500/30",
              preset.badge === "Creator Pick"&& "bg-pink-500/20 backdrop-blur-sm text-pink-300 border border-pink-500/30",
            )}>
              {preset.badge === "Sale" && discount ? `−${discount}%` : preset.badge}
            </span>
          </div>
        )}
      </Link>

      {/* ── Card body ── */}
      <div className="flex flex-col gap-2.5 p-5 flex-1">

        {/* Conversion tag chip */}
        {preset.conversionTag && convTagStyle && (
          <span className={cn(
            "self-start text-[0.6rem] font-black tracking-widest uppercase rounded-full px-2.5 py-[4px] border",
            convTagStyle
          )}>
            {preset.conversionTag}
          </span>
        )}

        {/* Name */}
        <Link
          href={`/presets/${preset.slug}`}
          className="font-semibold text-[0.9375rem] leading-snug tracking-[-0.01em] text-foreground group-hover:text-gold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          {preset.name}
        </Link>

        {/* Tagline */}
        <p className="text-[0.8125rem] text-muted/65 leading-[1.55] tracking-[-0.005em] line-clamp-2 flex-1">
          {preset.tagline}
        </p>

        {/* Meta row */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60 mt-auto">
          {/* Rating — only shown when real reviews exist */}
          {preset.reviewCount && preset.reviewCount > 0 ? (
            <div className="flex items-center gap-1.5 text-[0.75rem] text-muted/50">
              <StarIcon />
              <span className="text-foreground/70 font-medium">{preset.rating?.toFixed(1)}</span>
              <span>( {preset.reviewCount.toLocaleString()} )</span>
            </div>
          ) : (
            <div />
          )}

          {/* Price stack */}
          <div className="flex flex-col items-end gap-0.5">
            {preset.isFree ? (
              <span className="font-bold text-[0.9375rem] text-emerald-400 tracking-tight">
                Free
              </span>
            ) : (
              <>
                {/* Strikethrough original if on sale */}
                {preset.originalPrice && (
                  <span className="text-[0.7rem] text-muted/35 line-through leading-none">
                    {formatPrice(preset.originalPrice, displayCurrency)}
                  </span>
                )}
                {/* Primary price — user's chosen currency */}
                <span
                  className="font-bold text-[1rem] text-gold leading-none tracking-tight"
                  suppressHydrationWarning
                >
                  {formatPrice(preset.price, displayCurrency)}
                </span>
                {/* Alt currency — secondary, smaller */}
                <span
                  className="text-[0.68rem] text-muted/35 leading-none"
                  suppressHydrationWarning
                >
                  {formatPrice(preset.price, altCurrency)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Hover CTA ── */}
      <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out px-4 pb-4 pt-8 bg-gradient-to-t from-surface via-surface/98 to-transparent">
        {preset.isFree ? (
          <Link
            href={`/presets/${preset.slug}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-[0.8125rem] font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20"
          >
            <DownloadIcon />
            Download Free
          </Link>
        ) : (
          <Link
            href={`/presets/${preset.slug}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-2.5 text-[0.8125rem] font-semibold text-background transition-all hover:bg-gold/90 active:scale-[0.98]"
          >
            <UnlockIcon />
            View &amp; Unlock — {formatPrice(preset.price, displayCurrency)}
          </Link>
        )}
      </div>
    </div>
    </Tilt3D>
  )
}

/* ── Icons ── */
function StarIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="#FFD60A" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
}
function DownloadIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}
function UnlockIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
}

