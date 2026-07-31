"use client"

/**
 * /community/setup — One-click community setup for new users.
 * Joins default spaces, creates sample showcase items,
 * and populates the user's profile with demo content.
 */

import { useState }    from "react"
import { motion }      from "framer-motion"
import Link            from "next/link"
import { useAuth }     from "@/contexts/AuthContext"
import { useRouter }   from "next/navigation"

const SETUP_STEPS = [
  { icon: "💬", label: "Join 2 Creator Spaces",   desc: "Photography + Lightroom & Editing"      },
  { icon: "🖼", label: "Add sample showcase items", desc: "3 demo works added to your portfolio"  },
  { icon: "✦",  label: "Activate your profile",    desc: "Profile marked as active in the network" },
]

export default function CommunitySetupPage() {
  const { user }  = useAuth()
  const router    = useRouter()
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState("")

  async function runSetup() {
    if (!user) return
    setLoading(true)
    setError("")

    try {
      const token = await user.getIdToken()
      const res   = await fetch("/api/community/seed", {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const d = await res.json() as { error: string }
        throw new Error(d.error ?? "Setup failed.")
      }

      setDone(true)
      setTimeout(() => router.push("/community"), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <p className="text-[1.125rem] text-foreground">Sign in to set up your community profile.</p>
        <Link href="/sign-in?next=/community/setup"
          className="rounded-full bg-gold px-8 py-3 font-semibold text-background hover:bg-gold/90 transition-colors">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg flex flex-col items-center gap-8 py-16 text-center">
      {/* Icon */}
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full bg-gold/10 animate-pulse" />
        <div className="absolute inset-3 rounded-full bg-gold/15 animate-pulse [animation-delay:200ms]" />
        <div className="absolute inset-6 rounded-full bg-gold/25 flex items-center justify-center text-[1.75rem]">
          ✦
        </div>
      </div>

      {done ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <p className="text-[2rem]">🎉</p>
          <h2 className="font-display font-bold text-[1.5rem] text-foreground">You&apos;re all set!</h2>
          <p className="text-muted/85">Redirecting you to the community…</p>
          <div className="h-1 w-48 rounded-full bg-surface overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.5, ease: "linear" }}
              className="h-full bg-gold rounded-full"
            />
          </div>
        </motion.div>
      ) : (
        <>
          <div>
            <h1 className="font-display font-bold text-[2rem] text-foreground">
              Join the Community
            </h1>
            <p className="text-muted/85 mt-2 text-[0.9375rem] leading-relaxed">
              Get started with a single click. We&apos;ll set up your community presence
              and get you into the right spaces.
            </p>
          </div>

          {/* Steps */}
          <div className="w-full flex flex-col gap-3">
            {SETUP_STEPS.map((step, i) => (
              <div key={i}
                className="flex items-center gap-4 rounded-2xl border border-border bg-surface px-5 py-3.5 text-left">
                <span className="text-[1.5rem] shrink-0">{step.icon}</span>
                <div>
                  <p className="font-semibold text-[0.9375rem] text-foreground">{step.label}</p>
                  <p className="text-[0.8125rem] text-muted/85">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-[0.875rem] text-red-400 bg-red-400/10 rounded-xl px-4 py-3 w-full text-center">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={runSetup}
            disabled={loading}
            className="w-full rounded-full bg-gold py-3.5 text-[1rem] font-semibold text-background hover:bg-gold/90 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Setting up…
              </span>
            ) : "Set Up My Community Profile →"}
          </button>

          <Link href="/community" className="text-[0.875rem] text-muted/70 hover:text-muted transition-colors">
            Skip for now
          </Link>
        </>
      )}
    </div>
  )
}
