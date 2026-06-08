"use client"

import Link         from "next/link"
import Image        from "next/image"
import { useState, useEffect, useRef, useCallback } from "react"
import type { Preset }         from "@/types/product"
import { useCartStore }        from "@/store/cart"
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

  /* Cart */
  const addItem    = useCartStore((s) => s.addItem)
  const [added, setAdded] = useState(false)
  const btnRef     = useRef<HTMLButtonElement>(null)

  const gradient = categoryGradients[preset.category] ?? categoryGradients["Street"]
  const discount  = preset.originalPrice
    ? Math.round((1 - preset.price / preset.originalPrice) * 100)
    : null

  /* ── GSAP particle burst — fired on add-to-cart ── */
  const fireParticleBurst = useCallback(async () => {
    const btn = btnRef.current
    if (!btn) return

    /* Lazy-load GSAP on first click — keeps it out of the initial bundle */
    const { default: gsap } = await import("gsap")

    const rect   = btn.getBoundingClientRect()
    const cx     = rect.left + rect.width  / 2
    const cy     = rect.top  + rect.height / 2

    /* Create 14 particle divs, append to body, GSAP them outward */
    const PARTICLE_COUNT = 14
    const container      = document.body

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = document.createElement("div")
      p.style.cssText = `
        position: fixed;
        left: ${cx}px;
        top:  ${cy}px;
        width:  6px;
        height: 6px;
        border-radius: 50%;
        background: ${i % 3 === 0 ? "#ffd700" : i % 3 === 1 ? "#ffffff" : "#e5a227"};
        pointer-events: none;
        z-index: 9998;
        transform: translate(-50%, -50%);
      `
      container.appendChild(p)

      const angle  = (i / PARTICLE_COUNT) * Math.PI * 2
      const radius = 55 + Math.random() * 55
      const tx     = Math.cos(angle) * radius
      const ty     = Math.sin(angle) * radius

      gsap.fromTo(p,
        { x: 0, y: 0, scale: 1, opacity: 1 },
        {
          x:        tx,
          y:        ty,
          scale:    0,
          opacity:  0,
          duration: 0.65 + Math.random() * 0.3,
          ease:     "power3.out",
          delay:    i * 0.018,
          onComplete() { p.remove() },
        }
      )
    }

    /* Button flash */
    gsap.fromTo(btn,
      { boxShadow: "0 0 0px rgba(255,215,0,0)" },
      { boxShadow: "0 0 48px rgba(255,215,0,0.65)", duration: 0.15, yoyo: true, repeat: 1, ease: "power2.out" }
    )
  }, [])

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    fireParticleBurst()
    addItem(preset)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

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
        "hover:border-gold/30",
        "hover:shadow-[0_16px_60px_rgba(255,215,0,0.09)]",
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
          className="font-display font-bold text-[0.9375rem] leading-snug text-foreground group-hover:text-gold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          {preset.name}
        </Link>

        {/* Tagline */}
        <p className="text-[0.8125rem] text-muted/70 leading-relaxed line-clamp-2 flex-1">
          {preset.tagline}
        </p>

        {/* Meta row */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60 mt-auto">
          {/* Rating */}
          <div className="flex items-center gap-1.5 text-[0.75rem] text-muted/50">
            <StarIcon />
            <span className="text-foreground/70 font-medium">{preset.rating.toFixed(1)}</span>
            <span>( {preset.reviewCount.toLocaleString()} )</span>
          </div>

          {/* Price stack */}
          <div className="flex flex-col items-end gap-0.5">
            {preset.isFree ? (
              <span className="font-display font-black text-[1rem] text-emerald-400">
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
                  className="font-display font-black text-[1rem] text-gold leading-none"
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
          <button
            ref={btnRef}
            type="button"
            onClick={handleAddToCart}
            suppressHydrationWarning
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[0.8125rem] font-semibold transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              added
                ? "bg-emerald-600 text-white"
                : "bg-gold text-background hover:bg-gold-dim"
            )}
          >
            {added ? <CheckIcon /> : <BagIcon />}
            {added
              ? "Added!"
              : `Add to Cart — ${formatPrice(preset.price, displayCurrency)}`}
          </button>
        )}
      </div>
    </div>
    </Tilt3D>
  )
}

/* ── Icons ── */
function StarIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="#ffd700" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
}
function BagIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
}
function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}
function DownloadIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}
