"use client"

/**
 * /onboarding — Fallback route.
 *
 * Opens the onboarding modal immediately on mount.
 * Useful when you want a dedicated URL for the onboarding flow
 * (e.g. post-signup redirect, email links, etc.).
 *
 * After completion → redirects to /dashboard.
 * If user skips → redirects to / (homepage).
 */

import { useEffect }        from "react"
import { useRouter }        from "next/navigation"
import { useAuth }          from "@/contexts/AuthContext"
import { useOnboardingStore } from "@/store/onboarding"

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const { open, isComplete, isOpen } = useOnboardingStore()

  /* Redirect unauthenticated visitors to sign-up */
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/signup?next=/onboarding")
    }
  }, [user, loading, router])

  /* Open the modal once auth is resolved */
  useEffect(() => {
    if (!loading && user && !isOpen && !isComplete) {
      open()
    }
  }, [user, loading, isOpen, isComplete, open])

  /* Redirect after completion */
  useEffect(() => {
    if (isComplete) {
      router.replace("/dashboard")
    }
  }, [isComplete, router])

  /* ── Loading / waiting UI ── */
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Cinematic loader */}
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border border-gold/15" />
          <div className="absolute inset-0 rounded-full border border-transparent border-t-gold/60 animate-spin" />
          <div className="absolute inset-3 rounded-full border border-transparent border-t-gold/30 animate-spin [animation-duration:1.5s]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[1rem] text-gold/60">✦</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-display font-black text-[1.125rem] text-foreground">
            Preparing your creative universe…
          </p>
          <p className="text-[0.875rem] text-muted/50">
            This takes just a moment.
          </p>
        </div>
      </div>
    </div>
  )
}
