"use client"

/**
 * PresetRecommendCard.tsx
 *
 * Displays the AI-recommended preset after a studio session.
 *
 * Data flow (no hardcoded static data):
 *   API route → getPresets() → recommendPreset(keywords, presets)
 *             → recommendation.preset (full Preset object)
 *             → this component receives it via recommendation.preset
 *
 * The `recommendation.preset` field is populated server-side by the
 * API route, so this component never touches static arrays.
 * If the field is absent for any reason, the card degrades gracefully
 * by hiding the AddToCartButton and showing a "View Preset" link.
 */

import Link            from "next/link"
import { AddToCartButton } from "@/components/store/AddToCartButton"
import type { PresetRecommendation } from "@/types/studio"

interface PresetRecommendCardProps {
  recommendation: PresetRecommendation
}

export function PresetRecommendCard({ recommendation }: PresetRecommendCardProps) {
  /* Full preset now comes from recommendation.preset (populated by API) */
  const preset = recommendation.preset

  /* Confidence as a readable percentage (e.g. 0.87 → "87%") */
  const confidencePct = Math.round(recommendation.confidence * 100)

  /* Bar width — clamped 40–100% so even low-confidence looks reasonable */
  const barWidth = Math.max(40, confidencePct)

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-label text-muted/50 tracking-widest">Recommended preset</p>
          <h3 className="font-display font-bold text-foreground text-[1.0625rem] leading-snug">
            {recommendation.presetName}
          </h3>
          <p className="text-[0.8125rem] text-muted leading-snug">{recommendation.tagline}</p>
        </div>

        {/* Price badge */}
        <div className="shrink-0 rounded-xl border border-border bg-background px-3.5 py-2 text-center">
          <span className="font-display font-black text-foreground text-[1.1rem] leading-none">
            {recommendation.price === 0 ? "Free" : `$${recommendation.price}`}
          </span>
        </div>
      </div>

      {/* ── Match confidence bar ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[0.75rem] text-muted/60">Match confidence</span>
          <span className="text-[0.75rem] font-bold text-gold">{confidencePct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold/80 to-gold transition-all duration-700 ease-out"
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <p className="text-[0.75rem] text-muted/50 italic">{recommendation.reason}</p>
      </div>

      {/* ── Category + view link ── */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-[0.75rem] text-muted/70">
          {recommendation.category}
        </span>
        <Link
          href={`/presets/${recommendation.slug}`}
          className="text-[0.8125rem] font-medium text-muted/60 hover:text-gold transition-colors"
        >
          View details →
        </Link>
      </div>

      {/* ── Cart / Download CTA ── */}
      {preset ? (
        <AddToCartButton preset={preset} />
      ) : (
        /*
         * Graceful fallback: full preset wasn't available.
         * Link to the preset detail page instead.
         */
        <Link
          href={`/presets/${recommendation.slug}`}
          className="flex w-full items-center justify-center rounded-xl bg-gold py-4 text-base font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.98]"
        >
          {recommendation.price === 0
            ? "Download Free"
            : `View Preset — $${recommendation.price}`}
        </Link>
      )}

    </div>
  )
}
