"use client"

/**
 * RecommendationsV2.tsx — the Preset Intelligence Engine UI.
 *
 * Lazily fetches /api/ai/recommendations-v2 with the ImageAnalysisResult
 * the studio already holds (no image re-upload, no Gemini call) and
 * renders the top 5 matches:
 *
 *   - Hero card: ★ rating, match %, thumbnail, reason chips,
 *     lighting/mood/color/scene chips, View Preset + cart CTA
 *   - 4 compact runner-up cards with match % and top reason
 *
 * Graceful degradation: while loading → skeletons; if the request fails
 * → the Phase 1 PresetRecommendCard (v1 recommendation) renders instead,
 * so the studio never loses its recommendation section.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { AddToCartButton } from "@/components/store/AddToCartButton"
import { PresetRecommendCard } from "./PresetRecommendCard"
import type { ImageAnalysisResult } from "@/types/ai"
import type { PresetRecommendation } from "@/types/studio"
import type { ScoredRecommendation, RecommendationsV2Response } from "@/types/preset-intelligence"

interface RecommendationsV2Props {
  imageAnalysis:          ImageAnalysisResult
  /** Phase 1 recommendation — fallback UI + full Preset object for the cart CTA */
  fallbackRecommendation: PresetRecommendation
}

const EASE = [0.22, 1, 0.36, 1] as const

type FetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; data: RecommendationsV2Response }

export function RecommendationsV2({ imageAnalysis, fallbackRecommendation }: RecommendationsV2Props) {
  const [state, setState] = useState<FetchState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/ai/recommendations-v2", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ imageAnalysis, limit: 5 }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as RecommendationsV2Response
        if (!data.success || data.recommendations.length === 0) throw new Error("empty")
        if (!cancelled) setState({ status: "done", data })
      } catch {
        if (!cancelled) setState({ status: "error" })
      }
    })()
    return () => { cancelled = true }
  }, [imageAnalysis])

  /* ── Fallback: Phase 1 card, engine unavailable ── */
  if (state.status === "error") {
    return <PresetRecommendCard recommendation={fallbackRecommendation} />
  }

  /* ── Loading skeletons ── */
  if (state.status === "loading") {
    return <RecommendationsSkeleton />
  }

  const { recommendations, meta } = state.data
  const [top, ...rest] = recommendations

  return (
    <div className="flex flex-col gap-6">

      {/* Section header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="h-px w-6 bg-gold opacity-70" aria-hidden="true" />
          <span className="text-label text-gold tracking-widest">Preset Intelligence</span>
        </div>
        <span className="text-[0.7rem] text-muted/70">
          {meta.presetsEvaluated} presets scored in {meta.processingMs}ms
        </span>
      </div>

      {/* Hero — top match */}
      <HeroCard
        rec={top}
        cartPreset={
          fallbackRecommendation.preset?.slug === top.slug
            ? fallbackRecommendation.preset
            : undefined
        }
      />

      {/* Runners-up */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rest.map((rec, i) => (
            <CompactCard key={rec.slug} rec={rec} delay={0.08 * (i + 1)} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Hero card — rank 1
═══════════════════════════════════════════════════════════════ */

function HeroCard({ rec, cartPreset }: {
  rec: ScoredRecommendation
  cartPreset?: PresetRecommendation["preset"]
}) {
  const pct = Math.round(rec.confidence * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="rounded-2xl border border-gold/25 bg-surface overflow-hidden shadow-[0_0_40px_rgba(255,214,10,0.06)]"
    >
      <div className="grid sm:grid-cols-[220px_1fr] gap-0">

        {/* Thumbnail */}
        <div className="relative min-h-[160px] sm:min-h-full bg-surface-2">
          {rec.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rec.thumbnailUrl}
              alt={rec.name}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          )}
          <div className="absolute top-3 left-3 rounded-full bg-background/85 backdrop-blur px-2.5 py-1 text-[0.65rem] font-bold tracking-widest uppercase text-gold border border-gold/30">
            Top match
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 p-5">

          {/* Stars + match % */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Stars confidence={rec.confidence} />
              <span className="font-display font-black text-gold text-[1.35rem] leading-none tabular-nums">{pct}%</span>
              <span className="text-[0.7rem] text-muted/70 tracking-widest uppercase mt-1">Match</span>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-[0.72rem] text-muted/92">
              {rec.category}
            </span>
          </div>

          <div>
            <h3 className="font-display font-bold text-foreground text-[1.25rem] leading-snug">{rec.name}</h3>
            <p className="text-[0.85rem] text-muted leading-snug mt-0.5">{rec.tagline}</p>
          </div>

          {/* Reasons */}
          {rec.reasons.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.68rem] font-bold tracking-widest uppercase text-muted/70">Recommended because</span>
              <div className="flex flex-wrap gap-1.5">
                {rec.reasons.slice(0, 5).map((reason) => (
                  <span key={reason} className="inline-flex items-center gap-1 rounded-full border border-gold/20 bg-gold/5 px-2.5 py-1 text-[0.72rem] text-gold/90">
                    <CheckDot />
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attribute chips */}
          <ChipGroups chips={rec.chips} />

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-2.5 mt-auto pt-1">
            <Link
              href={`/presets/${rec.slug}`}
              className="flex flex-1 items-center justify-center rounded-xl border border-border py-3 text-[0.875rem] font-medium text-foreground/92 transition-colors hover:border-gold/40 hover:text-gold"
            >
              View Preset →
            </Link>
            {cartPreset ? (
              <div className="flex-1"><AddToCartButton preset={cartPreset} /></div>
            ) : (
              <Link
                href={`/presets/${rec.slug}`}
                className="flex flex-1 items-center justify-center rounded-xl bg-gold py-3 text-[0.875rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.98]"
              >
                {rec.isFree || rec.price === 0 ? "Download Free" : `Get it — $${rec.price}`}
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Compact runner-up card — ranks 2–5
═══════════════════════════════════════════════════════════════ */

function CompactCard({ rec, delay }: { rec: ScoredRecommendation; delay: number }) {
  const pct = Math.round(rec.confidence * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
    >
      <Link
        href={`/presets/${rec.slug}`}
        className="group flex gap-3.5 rounded-xl border border-border bg-surface p-3.5 transition-colors hover:border-gold/30"
      >
        {/* Thumb */}
        <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-surface-2">
          {rec.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rec.thumbnailUrl}
              alt={rec.name}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col min-w-0 flex-1 gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display font-bold text-foreground text-[0.9rem] truncate">{rec.name}</span>
            <span className="shrink-0 font-bold text-gold text-[0.85rem] tabular-nums">{pct}%</span>
          </div>
          <Stars confidence={rec.confidence} size={10} />
          {rec.reasons[0] && (
            <span className="text-[0.72rem] text-muted/85 truncate">{rec.reasons[0]}</span>
          )}
          <div className="flex flex-wrap gap-1 mt-0.5">
            {[...rec.chips.mood.slice(0, 1), ...rec.chips.color.slice(0, 1), ...rec.chips.scene.slice(0, 1)].map((chip) => (
              <span key={chip} className="rounded-full bg-surface-2 border border-border px-1.5 py-0.5 text-[0.62rem] text-muted/85">
                {chip}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Shared pieces
═══════════════════════════════════════════════════════════════ */

function ChipGroups({ chips }: { chips: ScoredRecommendation["chips"] }) {
  const groups: Array<{ label: string; items: string[]; tone: string }> = [
    { label: "Lighting", items: chips.lighting, tone: "text-[#fbbf24]/80 border-[#fbbf24]/20 bg-[#fbbf24]/5" },
    { label: "Mood",     items: chips.mood,     tone: "text-[#f472b6]/80 border-[#f472b6]/20 bg-[#f472b6]/5" },
    { label: "Colors",   items: chips.color,    tone: "text-[#34d399]/80 border-[#34d399]/20 bg-[#34d399]/5" },
    { label: "Scene",    items: chips.scene,    tone: "text-[#a5b4fc]/80 border-[#a5b4fc]/20 bg-[#a5b4fc]/5" },
  ]
  const visible = groups.filter((g) => g.items.length > 0)
  if (visible.length === 0) return null

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {visible.map(({ label, items, tone }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className="text-[0.62rem] font-bold tracking-widest uppercase text-muted/70">{label}</span>
          {items.map((item) => (
            <span key={item} className={cn("rounded-full border px-2 py-0.5 text-[0.68rem]", tone)}>
              {item}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function Stars({ confidence, size = 13 }: { confidence: number; size?: number }) {
  const filled = Math.round(confidence * 5)
  return (
    <div className="flex items-center gap-0.5" aria-label={`${filled} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size} height={size} viewBox="0 0 24 24"
          fill={i <= filled ? "#FFD60A" : "none"}
          stroke={i <= filled ? "#FFD60A" : "currentColor"}
          strokeWidth="2"
          className={i <= filled ? "" : "text-muted/70"}
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

function CheckDot() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function RecommendationsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading recommendations">
      <div className="flex items-center gap-2.5">
        <span className="h-px w-6 bg-gold opacity-70" aria-hidden="true" />
        <span className="text-label text-gold tracking-widest">Preset Intelligence</span>
      </div>
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="grid sm:grid-cols-[220px_1fr]">
          <div className="h-[160px] sm:h-full bg-surface-2 animate-pulse" />
          <div className="flex flex-col gap-3 p-5">
            <div className="h-6 w-32 rounded bg-surface-2 animate-pulse" />
            <div className="h-5 w-52 rounded bg-surface-2 animate-pulse" />
            <div className="h-4 w-72 max-w-full rounded bg-surface-2 animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-6 w-24 rounded-full bg-surface-2 animate-pulse" />)}
            </div>
            <div className="h-11 w-full rounded-xl bg-surface-2 animate-pulse mt-2" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-surface animate-pulse" />
        ))}
      </div>
    </div>
  )
}
