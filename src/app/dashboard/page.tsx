"use client"

/**
 * /dashboard — Personalised creator dashboard.
 *
 * Sections:
 *  1. Welcome header with greeting + Style DNA compact badge
 *  2. Style DNA card (full variant)
 *  3. Personalised recommendation feed (from /api/recommendations)
 *  4. Quick-action tiles
 *  5. Re-run onboarding CTA (if they want to refresh their DNA)
 */

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence }          from "framer-motion"
import Link                                  from "next/link"
import { useAuth }                          from "@/contexts/AuthContext"
import { useOnboardingStore }               from "@/store/onboarding"
import { StyleDNACard }                     from "@/components/personalization/StyleDNACard"
import { PersonalizedFeed }                 from "@/components/personalization/PersonalizedFeed"
import type { StyleDNA, PersonalizedSection } from "@/types/onboarding"

/* ── Quick action tile data ─────────────────────────────── */
const QUICK_ACTIONS = [
  {
    icon:  "◈",
    label: "Browse Presets",
    sub:   "Explore the full collection",
    href:  "/store",
    color: "#ffd700",
  },
  {
    icon:  "▷",
    label: "Watch Courses",
    sub:   "Learn at your own pace",
    href:  "/courses",
    color: "#FF6B35",
  },
  {
    icon:  "✦",
    label: "Enter Giveaway",
    sub:   "Free presets every month",
    href:  "/giveaway",
    color: "#10B981",
  },
  {
    icon:  "◉",
    label: "Explore Bundles",
    sub:   "Maximum value packs",
    href:  "/bundles",
    color: "#8B5CF6",
  },
] as const

/* ── Greeting by time-of-day ────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

/* ── Loading skeleton ────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-5 w-48 rounded-full bg-surface-2" />
        <div className="h-8 w-72 rounded-full bg-surface-2 opacity-70" />
      </div>
      {/* DNA card skeleton */}
      <div className="h-44 rounded-2xl bg-surface border border-border" />
      {/* Feed skeleton */}
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="h-4 w-40 rounded-full bg-surface-2" />
          {[0, 1, 2].map((j) => (
            <div key={j} className="h-16 rounded-xl bg-surface border border-border" />
          ))}
        </div>
      ))}
    </div>
  )
}

/* ── No-onboarding empty state ───────────────────────────── */
function EmptyDashboard({ onStartOnboarding }: { onStartOnboarding: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-8 py-16 text-center"
    >
      {/* Decorative orb */}
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 rounded-full bg-gold/10 animate-pulse" />
        <div className="absolute inset-3 rounded-full bg-gold/15 animate-pulse [animation-delay:150ms]" />
        <div className="absolute inset-6 rounded-full bg-gold/20 flex items-center justify-center">
          <span className="text-[1.5rem]">✦</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 max-w-md">
        <h2 className="font-display font-black text-[1.5rem] text-foreground">
          Your creative universe awaits
        </h2>
        <p className="text-[0.9375rem] text-muted/70 leading-relaxed">
          Complete the 5-minute onboarding to unlock your personalised Style DNA,
          curated preset recommendations, and a dashboard built entirely around you.
        </p>
      </div>

      <button
        type="button"
        onClick={onStartOnboarding}
        className="inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3 text-[0.9375rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Build My Style DNA
        <span aria-hidden="true">→</span>
      </button>
    </motion.div>
  )
}

/* ── Main page ───────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth()
  const { open: openOnboarding } = useOnboardingStore()

  const [dna,         setDna]         = useState<StyleDNA | null>(null)
  const [sections,    setSections]    = useState<PersonalizedSection[]>([])
  const [hasProfile,  setHasProfile]  = useState<boolean | null>(null) // null = unknown
  const [fetching,    setFetching]    = useState(true)
  const [displayName, setDisplayName] = useState("")

  const fetchProfile = useCallback(async () => {
    if (!user) return
    setFetching(true)

    try {
      const token = await user.getIdToken()

      /* Check onboarding status */
      const statusRes = await fetch("/api/onboarding/status", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!statusRes.ok) return

      const statusData = await statusRes.json() as { completed: boolean; profile: { style_dna_title?: string; style_dna_tagline?: string; style_dna_badge?: string; style_dna_color?: string; style_dna_archetypes?: string[]; style_dna_top_categories?: string[] } | null }

      setHasProfile(statusData.completed)

      if (statusData.completed && statusData.profile) {
        /* Build StyleDNA from profile */
        const p = statusData.profile
        if (p.style_dna_title && p.style_dna_tagline && p.style_dna_badge && p.style_dna_color) {
          setDna({
            title:         p.style_dna_title,
            tagline:       p.style_dna_tagline,
            badge:         p.style_dna_badge,
            primaryColor:  p.style_dna_color,
            archetypes:    p.style_dna_archetypes    ?? [],
            topCategories: p.style_dna_top_categories ?? [],
          })
        }

        /* Fetch full recommendations */
        const recRes = await fetch("/api/recommendations", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (recRes.ok) {
          const recData = await recRes.json() as { sections: PersonalizedSection[]; dna: StyleDNA }
          setSections(recData.sections)
          if (!dna && recData.dna) setDna(recData.dna)
        }
      }
    } catch (err) {
      console.error("[Dashboard]", err)
    } finally {
      setFetching(false)
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayName(user.displayName?.split(" ")[0] ?? user.email?.split("@")[0] ?? "Creator")
      void fetchProfile()
    }
  }, [user, fetchProfile])

  /* ── Loading ── */
  if (fetching) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <DashboardSkeleton />
      </div>
    )
  }

  /* ── No onboarding completed ── */
  if (hasProfile === false) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <EmptyDashboard onStartOnboarding={openOnboarding} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
      <AnimatePresence mode="wait">
        <motion.div
          key="dashboard-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-12"
        >

          {/* ── Welcome header ── */}
          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-2"
          >
            <p className="text-[0.8125rem] font-semibold tracking-widest uppercase text-gold/60">
              {getGreeting()}
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="font-display font-black text-[1.75rem] sm:text-[2rem] text-foreground leading-tight">
                {displayName}
              </h1>
              {dna && (
                <StyleDNACard dna={dna} variant="compact" />
              )}
            </div>
            <p className="text-[0.9375rem] text-muted/60 mt-1">
              Your creative universe, personalised just for you.
            </p>
          </motion.header>

          {/* ── Style DNA card ── */}
          {dna && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-black text-[0.9375rem] text-foreground/70 uppercase tracking-wider">
                  Your Style DNA
                </h2>
                <button
                  type="button"
                  onClick={openOnboarding}
                  className="text-[0.75rem] text-muted/40 hover:text-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  Retake →
                </button>
              </div>
              <StyleDNACard dna={dna} variant="full" />
            </motion.section>
          )}

          {/* ── Quick actions ── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-3"
          >
            <h2 className="font-display font-black text-[0.9375rem] text-foreground/70 uppercase tracking-wider">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {QUICK_ACTIONS.map((action, i) => (
                <motion.div
                  key={action.href}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.22 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    href={action.href}
                    className="group flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-4
                      hover:border-gold/25 hover:bg-surface-2 transition-all duration-200
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className="text-[1.5rem] leading-none transition-transform duration-200 group-hover:scale-110"
                      style={{ color: action.color }}
                    >
                      {action.icon}
                    </span>
                    <div>
                      <p className="text-[0.875rem] font-semibold text-foreground group-hover:text-white transition-colors leading-tight">
                        {action.label}
                      </p>
                      <p className="text-[0.75rem] text-muted/50 mt-0.5 leading-snug">
                        {action.sub}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* ── Personalised recommendations ── */}
          {sections.length > 0 ? (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-black text-[0.9375rem] text-foreground/70 uppercase tracking-wider">
                  Made for You
                </h2>
                {dna && (
                  <span className="text-[0.75rem] text-muted/35">
                    Based on your {dna.badge} profile
                  </span>
                )}
              </div>

              <PersonalizedFeed
                dna={dna}
                maxSections={4}
              />
            </motion.section>
          ) : null}

          {/* ── Bottom CTA strip ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40"
          >
            <Link
              href="/store"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-[0.875rem] font-medium text-muted hover:text-foreground hover:border-gold/30 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Browse All Presets
            </Link>
            <Link
              href="/giveaway"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-[0.875rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              ✦ Enter This Month&apos;s Giveaway
            </Link>
          </motion.div>

        </motion.div>
      </AnimatePresence>
    </div>
  )
}
