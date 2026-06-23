"use client"

/**
 * OnboardingSetupCTA.tsx
 *
 * • Not signed in → nothing
 * • Signed in, onboarding incomplete → pulsing "Complete Setup" chip
 * • Signed in, onboarding complete   → "My Profile" link
 */

import { motion }             from "framer-motion"
import Link                   from "next/link"
import { useOnboardingStore } from "@/store/onboarding"
import { useAuth }            from "@/contexts/AuthContext"

export function OnboardingSetupCTA() {
  const { user }                     = useAuth()
  const { isComplete, isOpen, open } = useOnboardingStore()

  if (!user) return null

  /* Onboarding complete — show "My Profile" link */
  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="hidden sm:block"
      >
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[0.72rem] font-semibold text-muted/60 transition-all hover:text-foreground hover:border-gold/30 hover:bg-gold/5"
          title="Manage your creative preferences"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          My Profile
        </Link>
      </motion.div>
    )
  }

  /* Onboarding incomplete — pulsing "Complete Setup" chip */
  if (isOpen) return null

  return (
    <motion.button
      type="button"
      onClick={open}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/8 px-3 py-1 text-[0.72rem] font-semibold text-gold/90 transition-all hover:bg-gold/15 hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title="Complete your creator setup"
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold/60" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gold" />
      </span>
      Complete Setup
    </motion.button>
  )
}
