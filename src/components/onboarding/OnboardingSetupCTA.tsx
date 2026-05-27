"use client"

/**
 * OnboardingSetupCTA.tsx
 *
 * Pulsing "Complete Your Setup" chip shown in the navbar
 * for signed-in users who haven't completed onboarding.
 *
 * Mounted inside NavAuthButtons, invisible to non-authenticated users
 * and to users who have already completed onboarding.
 */

import { motion }             from "framer-motion"
import { useOnboardingStore } from "@/store/onboarding"
import { useAuth }            from "@/contexts/AuthContext"

export function OnboardingSetupCTA() {
  const { user }          = useAuth()
  const { isComplete, isOpen, open } = useOnboardingStore()

  /* Only show if signed in + not completed + modal not already open */
  if (!user || isComplete || isOpen) return null

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
      {/* Pulsing live dot */}
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold/60" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gold" />
      </span>
      Complete Setup
    </motion.button>
  )
}
