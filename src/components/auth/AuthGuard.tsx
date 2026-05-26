"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * Wraps protected content.
 * — Shows a spinner while Firebase resolves the auth state.
 * — Redirects to /login?from=<pathname> if no session exists.
 * — Renders children only when a valid user session is confirmed.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`)
    }
  }, [user, loading, router, pathname])

  /* Phase 1 — resolving Firebase session */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-gold/20 border-t-gold animate-spin" />
      </div>
    )
  }

  /* Phase 2 — not authenticated, redirect in flight */
  if (!user) return null

  /* Phase 3 — authenticated */
  return <>{children}</>
}
