"use client"

/**
 * PersonalizedFeed.tsx
 *
 * Fetches recommendation sections from /api/recommendations and
 * renders them as animated cards.
 *
 * Usage: Drop on the dashboard or homepage for signed-in users.
 * Falls back gracefully if API fails or user is not signed in.
 */

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence }          from "framer-motion"
import Link                                  from "next/link"
import { cn }                               from "@/lib/utils"
import { useAuth }                          from "@/contexts/AuthContext"
import type { PersonalizedSection, RecommendationItem, StyleDNA } from "@/types/onboarding"

/* ── Item type icon map ─────────────────────────────────────── */
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

/* ── Single recommendation card ─────────────────────────────── */
function RecommendCard({
  item,
  index,
  accentColor,
}: {
  item:        RecommendationItem
  index:       number
  accentColor: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={item.href}
        className={cn(
          "group flex items-start gap-4 rounded-xl border border-border bg-surface",
          "px-4 py-3.5 transition-all duration-200",
          "hover:border-gold/30 hover:bg-surface-2 hover:shadow-[0_0_20px_rgba(255,214,10,0.06)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        {/* Type icon */}
        <span
          className="mt-0.5 shrink-0 text-[1.125rem] leading-none opacity-60 group-hover:opacity-100 transition-opacity"
          style={{ color: accentColor }}
        >
          {TYPE_ICON[item.type] ?? "â—"}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[0.875rem] font-semibold text-foreground leading-snug group-hover:text-white transition-colors truncate">
              {item.title}
            </p>
            {item.badge && (
              <span className="shrink-0 text-[0.65rem] font-bold tracking-wider text-gold bg-gold/10 border border-gold/20 rounded-full px-2 py-0.5">
                {item.badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[0.8125rem] text-muted/92 leading-snug line-clamp-2">
            {item.description}
          </p>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.65rem] text-muted/85 border border-border"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Score bar */}
        <div className="shrink-0 flex flex-col items-end gap-1 mt-0.5">
          <span className="text-[0.65rem] font-medium text-muted/70">
            {Math.round(item.score)}%
          </span>
          <div className="w-12 h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width:      `${item.score}%`,
                background: accentColor,
              }}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ── Section block ───────────────────────────────────────────── */
function FeedSection({
  section,
  accentColor,
  sectionIndex,
}: {
  section:      PersonalizedSection
  accentColor:  string
  sectionIndex: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: sectionIndex * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-4"
    >
      {/* Section header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display font-black text-[1.0625rem] text-foreground leading-tight">
            {section.headline}
          </h2>
          <p className="mt-0.5 text-[0.8125rem] text-muted/85">
            {section.subheadline}
          </p>
        </div>
        <span
          className="shrink-0 h-px flex-1 max-w-[80px] rounded-full"
          style={{ background: `linear-gradient(90deg, ${accentColor}60, transparent)` }}
        />
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2">
        {section.items.map((item, i) => (
          <RecommendCard
            key={item.id}
            item={item}
            index={i}
            accentColor={accentColor}
          />
        ))}
      </div>
    </motion.section>
  )
}

/* ── Skeleton loader ─────────────────────────────────────────── */
function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {[0, 1].map((s) => (
        <div key={s} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-48 rounded-full bg-surface-2 animate-pulse" />
            <div className="h-3 w-64 rounded-full bg-surface-2 animate-pulse opacity-60" />
          </div>
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[72px] rounded-xl bg-surface border border-border animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────── */
interface PersonalizedFeedProps {
  /** External DNA (e.g. from dashboard that already has profile data) */
  dna?:      StyleDNA | null
  /** Max sections to render */
  maxSections?: number
  className?: string
}

export function PersonalizedFeed({
  dna,
  maxSections = 4,
  className,
}: PersonalizedFeedProps) {
  const { user, loading: authLoading } = useAuth()

  const [sections,   setSections]   = useState<PersonalizedSection[]>([])
  const [localDna,   setLocalDna]   = useState<StyleDNA | null>(dna ?? null)
  const [fetching,   setFetching]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [fromCache,  setFromCache]  = useState(false)

  const fetchRecommendations = useCallback(async () => {
    if (!user) return
    setFetching(true)
    setError(null)

    try {
      const token = await user.getIdToken()
      const res   = await fetch("/api/recommendations", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 404) {
        /* Onboarding not yet completed — no feed to show */
        return
      }

      if (!res.ok) {
        setError("Could not load your recommendations.")
        return
      }

      const data = await res.json() as {
        sections: PersonalizedSection[]
        dna:      StyleDNA
        fromCache: boolean
      }

      setSections(data.sections)
      if (!dna) setLocalDna(data.dna)
      setFromCache(data.fromCache)
    } catch {
      setError("Something went wrong loading your feed.")
    } finally {
      setFetching(false)
    }
  }, [user, dna])

  useEffect(() => {
    if (!authLoading && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchRecommendations()
    }
  }, [user, authLoading, fetchRecommendations])

  /* Update localDna if parent passes dna prop change */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (dna) setLocalDna(dna)
  }, [dna])

  /* ── Not signed in ── */
  if (!authLoading && !user) return null

  /* ── Loading ── */
  if (fetching || authLoading) {
    return (
      <div className={cn("w-full", className)}>
        <FeedSkeleton />
      </div>
    )
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className={cn("rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-[0.875rem] text-destructive", className)}>
        {error}
        <button
          type="button"
          onClick={fetchRecommendations}
          className="ml-3 underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    )
  }

  /* ── No recommendations yet ── */
  if (sections.length === 0) return null

  const accentColor = localDna?.primaryColor ?? "#FFD60A"
  const visibleSections = sections.slice(0, maxSections)

  return (
    <div className={cn("flex flex-col gap-10", className)}>
      <AnimatePresence mode="wait">
        {visibleSections.map((section, i) => (
          <FeedSection
            key={section.id}
            section={section}
            accentColor={accentColor}
            sectionIndex={i}
          />
        ))}
      </AnimatePresence>

      {fromCache && (
        <p className="text-center text-[0.75rem] text-muted/70">
          Personalised for you · Updated today
        </p>
      )}
    </div>
  )
}


