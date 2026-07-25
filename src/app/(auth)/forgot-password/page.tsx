"use client"

import { useState } from "react"
import Link          from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth }   from "@/contexts/AuthContext"
import { getFirebaseErrorMessage } from "@/lib/firebase/auth"
import { cn }        from "@/lib/utils"

const AUTH_EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()

  const [email,   setEmail]   = useState("")
  const [error,   setError]   = useState("")
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!email.trim()) { setError("Please enter your email address."); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.")
      return
    }

    setLoading(true)
    try {
      await resetPassword(email.trim())
      setSent(true)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ""
      setError(getFirebaseErrorMessage(code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1     }}
        transition={{ duration: 0.45, ease: AUTH_EASE }}
        className="relative rounded-2xl border border-[#6366f1]/20 bg-surface/70 backdrop-blur-xl p-8 sm:p-10 shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_60px_rgba(61,122,138,0.08)]"
      >

        {/* Top gold rule */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

        {/* Brand */}
        <div className="flex flex-col items-center gap-6 mb-8">
          <Link href="/" className="flex items-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
            <span className="font-display text-[1.1rem] font-bold tracking-widest text-foreground/90 uppercase">PXL</span>
            <span className="font-display text-[1.1rem] font-bold tracking-widest text-gold logo-glow uppercase">&nbsp;CREATOR</span>
          </Link>
        </div>

        {/* ── Sent success state ── */}
        {sent ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: AUTH_EASE }}
            className="flex flex-col items-center gap-5 text-center py-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
              <CheckIcon />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="font-display font-bold text-[1.25rem] text-foreground">Check your inbox</h2>
              <p className="text-[0.875rem] text-muted/85 leading-relaxed max-w-xs">
                We sent a reset link to <span className="text-foreground font-medium">{email}</span>.
                It expires in 1 hour.
              </p>
            </div>
            <Link
              href="/login"
              className="mt-2 inline-flex items-center gap-2 text-[0.875rem] font-medium text-gold hover:text-gold-dim transition-colors"
            >
              <BackArrow />
              Back to sign in
            </Link>
          </motion.div>
        ) : (
          <>
            <div className="flex flex-col gap-1 mb-6">
              <h1 className="font-display font-bold text-[1.5rem] text-foreground tracking-tight">Reset password</h1>
              <p className="text-[0.875rem] text-muted/85">
                Enter your email and we&apos;ll send a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

              <AnimatePresence>
                {error && (
                  <motion.div
                    key="fp-error"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y:  0  }}
                    exit={{    opacity: 0, y: -8  }}
                    transition={{ duration: 0.22, ease: AUTH_EASE }}
                    className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3"
                  >
                    <ErrorIcon />
                    <p className="text-[0.8125rem] text-red-400">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[0.8125rem] font-medium text-muted/92">Email address</label>
                <input
                  id="email" type="email" autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  suppressHydrationWarning
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[0.9375rem] text-foreground placeholder:text-muted/70 transition-colors focus:outline-none focus:border-gold/50"
                />
              </div>

              <button
                type="submit" disabled={loading} suppressHydrationWarning
                className={cn(
                  "flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5",
                  "text-[0.9375rem] font-semibold transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  loading
                    ? "bg-gold/60 text-background/70 cursor-not-allowed"
                    : "bg-gold text-background hover:bg-gold-dim active:scale-[0.98]"
                )}
              >
                {loading && <div className="h-4 w-4 rounded-full border-2 border-background/40 border-t-background animate-spin" />}
                {loading ? "Sending…" : "Send reset link"}
              </button>

            </form>

            <p className="mt-6 text-center text-[0.8125rem] text-muted/85">
              Remembered it?{" "}
              <Link href="/login" className="font-medium text-gold hover:text-gold-dim transition-colors">
                Sign in
              </Link>
            </p>
          </>
        )}

      </motion.div>
    </div>
  )
}

function CheckIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}
function ErrorIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
}
function BackArrow() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
}
