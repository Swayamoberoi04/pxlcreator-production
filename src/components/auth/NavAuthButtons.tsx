"use client"

import { useState }             from "react"
import Link                     from "next/link"
import { useRouter }             from "next/navigation"
import { useAuth }               from "@/contexts/AuthContext"
import { cn }                    from "@/lib/utils"
import { OnboardingSetupCTA }    from "@/components/onboarding/OnboardingSetupCTA"

/**
 * Renders into the navbar's right-action zone.
 * — Loading: skeleton placeholder keeps layout stable
 * — Logged out: Login text link + Sign Up gold pill
 * — Logged in: User avatar chip → /account + Logout icon button
 */
export function NavAuthButtons() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    setSigningOut(false)
    router.push("/")
  }

  /* ── Skeleton — prevents layout shift while Firebase resolves ── */
  if (loading) {
    return <div className="h-8 w-28 rounded-full bg-surface-2 animate-pulse" />
  }

  /* ── Authenticated ── */
  if (user) {
    const initials = user.displayName
      ? user.displayName.charAt(0).toUpperCase()
      : user.email?.charAt(0).toUpperCase() ?? "U"

    return (
      <div className="flex items-center gap-1.5">

        {/* Complete Setup CTA — only visible when onboarding incomplete */}
        <OnboardingSetupCTA />

        {/* Avatar → account page */}
        <Link
          href="/account"
          title={user.displayName ?? user.email ?? "Your account"}
          className={cn(
            "flex items-center gap-2 rounded-full border border-border px-2.5 py-1",
            "text-[0.8rem] font-medium text-muted transition-all duration-200",
            "hover:border-gold/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          {user.photoURL ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={user.photoURL}
              alt={user.displayName ?? "Avatar"}
              width={22}
              height={22}
              className="rounded-full object-cover"
            />
          ) : (
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gold/20 text-[0.65rem] font-bold text-gold">
              {initials}
            </span>
          )}
          <span className="hidden sm:block max-w-[80px] truncate">
            {user.displayName ?? user.email?.split("@")[0]}
          </span>
        </Link>

        {/* Logout button */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          title="Sign out"
          suppressHydrationWarning
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full border border-border",
            "text-muted transition-all duration-200",
            "hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/5",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {signingOut
            ? <div className="h-3.5 w-3.5 rounded-full border border-current border-t-transparent animate-spin" />
            : <LogOutIcon />
          }
        </button>

      </div>
    )
  }

  /* ── Not authenticated ── */
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="hidden sm:inline-flex items-center px-3.5 py-1.5 text-[0.8rem] font-medium text-muted/92 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-1.5 text-[0.8rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Sign up
      </Link>
    </div>
  )
}

function LogOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
