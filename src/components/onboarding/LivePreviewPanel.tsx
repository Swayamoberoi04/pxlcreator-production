"use client"

/**
 * LivePreviewPanel.tsx
 *
 * Real-time recommendation preview shown inside the OnboardingModal
 * as the user makes selections. Runs the recommendation engine
 * inline (pure functions, microsecond execution) and shows the top 3
 * matched items with animated transitions.
 *
 * Shows: "You might love..." with scored catalogue items.
 * Updates instantly on every selection change via useMemo.
 */

import { useMemo }                     from "react"
import { motion, AnimatePresence }     from "framer-motion"
import { computeAffinities, generateRecommendations } from "@/lib/recommendations/engine"
import { generateStyleDNA }            from "@/lib/recommendations/style-dna"
import type { OnboardingAnswers, RecommendationItem } from "@/types/onboarding"

/* ── Type icon map ─────────────────────────────────────────── */
const TYPE_ICON: Record<string, string> = {
  "preset-bundle": "◈",
  "lut-pack":      "◉",
  "tutorial":      "▷",
  "course":        "▶",
  "challenge":     "✦",
  "pathway":       "⬡",
  "monetization":  "⧫",
  "blog":          "✎",
  "community":     "◬",
  "tool":          "⬟",
}

interface Props {
  answers: Partial<OnboardingAnswers>
}

export function LivePreviewPanel({ answers }: Props) {
  /* ── Compute recommendations from current (partial) answers ── */
  const { items, dna, hasData } = useMemo(() => {
    const safeAnswers: OnboardingAnswers = {
      professions: answers.professions ?? [],
      goals:       answers.goals       ?? [],
      aesthetics:  answers.aesthetics  ?? [],
      skillLevel:  answers.skillLevel  ?? "intermediate",
      platforms:   answers.platforms   ?? [],
    }

    const totalSelections =
      safeAnswers.professions.length +
      safeAnswers.goals.length +
      safeAnswers.aesthetics.length +
      safeAnswers.platforms.length +
      (answers.skillLevel ? 1 : 0)

    if (totalSelections === 0) {
      return { items: [], dna: null, hasData: false }
    }

    const affinities = computeAffinities(safeAnswers)
    const { sections } = generateRecommendations(affinities, safeAnswers)
    const topItems = sections
      .flatMap((s) => s.items)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    /* Preview DNA (rough estimate with partial data) */
    const dnaCurrent = totalSelections >= 2 ? generateStyleDNA(affinities, safeAnswers) : null

    return { items: topItems, dna: dnaCurrent, hasData: true }
  }, [answers])

  if (!hasData || items.length === 0) return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="live-preview"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="mt-5 flex flex-col gap-3"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5">
          {/* Pulsing dot */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold/60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold/80" />
          </span>
          <p className="text-[0.75rem] font-semibold tracking-widest uppercase text-gold/70">
            Your Universe Is Taking Shape
          </p>
        </div>

        {/* DNA preview — shows when enough data */}
        <AnimatePresence>
          {dna && (
            <motion.div
              key={dna.title}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="flex items-center gap-2 rounded-xl border border-gold/20 bg-gold/5 px-3.5 py-2.5"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: dna.primaryColor }}
              />
              <div className="min-w-0">
                <p className="text-[0.75rem] font-bold text-foreground/90 truncate">
                  {dna.title}
                </p>
                <p className="text-[0.7rem] text-muted/85 truncate">
                  {dna.tagline}
                </p>
              </div>
              <span
                className="ml-auto shrink-0 text-[0.65rem] font-bold tracking-wider rounded-full px-2 py-0.5 border"
                style={{ color: dna.primaryColor, borderColor: `${dna.primaryColor}40` }}
              >
                {dna.badge}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recommendation items */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[0.75rem] text-muted/85">You might love…</p>
          <AnimatePresence mode="popLayout">
            {items.map((item, i) => (
              <PreviewItem key={item.id} item={item} index={i} />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ── Single preview item ─────────────────────────────────────── */
function PreviewItem({ item, index }: { item: RecommendationItem; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{
        layout:   { duration: 0.3 },
        opacity:  { duration: 0.35, delay: index * 0.06 },
        x:        { duration: 0.35, delay: index * 0.06 },
      }}
      className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface/60 px-3 py-2.5"
    >
      <span className="shrink-0 text-[0.875rem] text-muted/85">
        {TYPE_ICON[item.type] ?? "●"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[0.8125rem] font-medium text-foreground/90 leading-tight truncate">
          {item.title}
        </p>
        <p className="text-[0.7rem] text-muted/85 truncate mt-0.5">
          {item.description}
        </p>
      </div>
      {/* Match score bar */}
      <div className="shrink-0 flex items-center gap-1.5">
        <div className="w-8 h-0.5 rounded-full bg-border overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${item.score}%` }}
            transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
            className="h-full rounded-full bg-gold"
          />
        </div>
      </div>
    </motion.div>
  )
}
