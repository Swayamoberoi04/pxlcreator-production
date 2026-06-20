/**
 * src/components/bundles/BundlePresetsList.tsx
 *
 * "What's Inside" section rendered on bundle detail pages.
 * Shows each included pack with: icon · name · category chip ·
 * preset count · description · individual price · link to preset page.
 */

import Link from "next/link"
import type { BundleIncludedPack } from "@/types/bundle"
import { cn } from "@/lib/utils"

/* ── Category accent colours ──────────────────────────── */

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  "Cinematic":      { bg: "bg-amber-500/10",   text: "text-amber-400/80" },
  "Film Emulation": { bg: "bg-orange-500/10",  text: "text-orange-400/80" },
  "Portrait":       { bg: "bg-pink-500/10",    text: "text-pink-400/80" },
  "Landscape":      { bg: "bg-emerald-500/10", text: "text-emerald-400/80" },
  "Street":         { bg: "bg-violet-500/10",  text: "text-violet-400/80" },
}

function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category] ?? { bg: "bg-white/5", text: "text-white/40" }
}

/* ── Props ─────────────────────────────────────────────── */

interface BundlePresetsListProps {
  packs:      BundleIncludedPack[]
  className?: string
}

/* ── Component ─────────────────────────────────────────── */

export function BundlePresetsList({ packs, className }: BundlePresetsListProps) {
  if (packs.length === 0) return null

  const totalIndividual = packs.reduce((sum, p) => sum + (p.priceUsd ?? 0), 0)

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {packs.map((pack) => {
        const style = getCategoryStyle(pack.category)
        const isFreeBonus = pack.priceUsd === 0

        const card = (
          <div
            className={cn(
              "flex items-center gap-4 rounded-xl p-4",
              "bg-surface-2/50 border border-border/50",
              "transition-colors",
              pack.slug && "hover:border-gold/20 hover:bg-surface-2/80 cursor-pointer"
            )}
          >
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-xl">
              {pack.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[0.875rem] font-semibold text-foreground/90">
                  {pack.name}
                </span>
                {/* Category chip */}
                <span className={cn(
                  "text-[0.6rem] font-bold tracking-widest uppercase rounded-full px-2 py-0.5 border border-current/20",
                  style.bg,
                  style.text
                )}>
                  {pack.category}
                </span>
                {isFreeBonus && (
                  <span className="text-[0.6rem] font-bold tracking-widest uppercase rounded-full px-2 py-0.5 bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20">
                    FREE BONUS
                  </span>
                )}
              </div>
              <p className="text-[0.8rem] text-muted/45 mt-0.5 leading-relaxed">
                {pack.description}
              </p>
            </div>

            {/* Right: count + price */}
            <div className="flex-shrink-0 text-right">
              <p className="text-[1.1rem] font-black text-gold leading-none">
                {pack.presetCount}
              </p>
              <p className="text-[0.6rem] font-medium text-muted/35 mt-0.5 tracking-wide">
                presets
              </p>
              {pack.priceUsd !== undefined && (
                <p className={cn(
                  "text-[0.75rem] font-semibold mt-1.5",
                  isFreeBonus ? "text-emerald-400/70" : "text-muted/50"
                )}>
                  {isFreeBonus ? "Free" : `$${pack.priceUsd.toFixed(2)}`}
                </p>
              )}
            </div>
          </div>
        )

        return pack.slug
          ? (
            <Link key={pack.name} href={`/presets/${pack.slug}`} className="block">
              {card}
            </Link>
          )
          : <div key={pack.name}>{card}</div>
      })}

      {/* Total individual value row */}
      {totalIndividual > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border/30 bg-surface/30 mt-1">
          <span className="text-[0.8rem] text-muted/45 font-medium">
            Total if bought separately
          </span>
          <span className="text-[0.875rem] font-bold text-muted/60 line-through">
            ${totalIndividual.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}
