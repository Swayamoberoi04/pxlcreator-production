"use client"

/**
 * OnboardingGate.tsx
 *
 * Mounted once at the root layout (inside <AuthProvider>).
 * Watches the Firebase user state — when a user signs in and
 * has NOT completed onboarding, it opens the OnboardingModal
 * after a short delay so the auth animation settles first.
 *
 * Guards:
 *  - Only runs once per session (tracks with useRef)
 *  - Skips if already marked complete in Zustand
 *  - Skips if API says onboarding is already done
 *  - No-ops on sign-out
 */

import { useEffect, useRef } from "react"
import { useAuth }           from "@/contexts/AuthContext"
import { useOnboardingStore } from "@/store/onboarding"

export function OnboardingGate() {
  const { user, loading } = useAuth()
  const { isComplete, open } = useOnboardingStore()

  /* Track which UID we've already checked this session */
  const checkedUid = useRef<string | null>(null)

  useEffect(() => {
    /* Wait until Firebase auth is resolved */
    if (loading) return

    /* No user signed in */
    if (!user) {
      checkedUid.current = null
      return
    }

    /* Already checked this user in the current session */
    if (checkedUid.current === user.uid) return

    /* Already completed onboarding (Zustand state) */
    if (isComplete) {
      checkedUid.current = user.uid
      return
    }

    /* Mark as checked immediately so a re-render doesn't double-fire */
    checkedUid.current = user.uid

    /* Short delay — let the post-login animation/redirect settle */
    const timer = setTimeout(async () => {
      try {
        const token = await user.getIdToken()
        const res   = await fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) return

        const data = await res.json() as { completed: boolean }

        if (!data.completed) {
          open()
        }
      } catch (err) {
        /* Non-critical — if the check fails, don't block the user */
        console.error("[OnboardingGate]", err)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [user, loading, isComplete, open])

  /* This component renders nothing — it's a behaviour-only hook wrapper */
  return null
}
