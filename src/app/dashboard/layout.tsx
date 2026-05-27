"use client"

/**
 * Dashboard layout — auth-gated.
 *
 * Redirects unauthenticated users to /sign-in with a `next=/dashboard`
 * query param so they return here after signing in.
 * Shows a cinematic loading state while Firebase auth resolves.
 */

import { useEffect }       from "react"
import { useRouter }       from "next/navigation"
import { useAuth }         from "@/contexts/AuthContext"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router            = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/sign-in?next=/dashboard")
    }
  }, [user, loading, router])

  /* ── Auth loading state ── */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border-2 border-gold/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" />
          </div>
          <p className="text-[0.875rem] text-muted/40 tracking-wide">
            Loading your creative universe…
          </p>
        </div>
      </div>
    )
  }

  /* ── Not authenticated — redirect fires above, show nothing ── */
  if (!user) return null

  return <>{children}</>
}
