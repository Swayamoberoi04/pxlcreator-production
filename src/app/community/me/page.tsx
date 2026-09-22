"use client"

/**
 * /community/me — "My Profile" shortcut.
 *
 * Phase 5.7 audit: CommunityNav has linked here from both the desktop
 * sidebar and the mobile tab bar for every signed-in user since the nav was
 * written, but the route never existed — it 404'd. This resolves the
 * viewer's own username and forwards to their real profile page, so there is
 * one canonical profile route (/community/[username]) rather than a second
 * parallel "my profile" page to keep in sync.
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"

export default function MyCommunityProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace("/login?from=/community/me")
      return
    }

    let cancelled = false
    async function resolveProfile() {
      try {
        const token = await user!.getIdToken()
        // Also creates the profile if this is their first visit, so a brand
        // new account lands on a real page rather than a 404.
        const res = await fetch("/api/community/profile", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error("Could not load your profile.")
        const { profile } = await res.json()
        if (cancelled) return
        if (profile?.username) {
          router.replace(`/community/${profile.username}`)
        } else {
          setError("Your community profile isn't set up yet.")
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load your profile.")
      }
    }
    void resolveProfile()
    return () => { cancelled = true }
  }, [user, authLoading, router])

  if (error) {
    return (
      <div className="max-w-md mx-auto w-full text-center py-20 flex flex-col items-center gap-3">
        <span className="text-4xl">👤</span>
        <p className="font-display font-bold text-lg text-foreground">{error}</p>
        <Link
          href="/community/setup"
          className="mt-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-black hover:bg-gold/90 transition-colors"
        >
          Set up your creator profile
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto w-full py-20 flex flex-col items-center gap-3" aria-live="polite">
      <div className="size-6 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />
      <p className="text-sm text-muted/85">Opening your profile…</p>
    </div>
  )
}
