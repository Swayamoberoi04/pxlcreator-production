"use client"

import { Suspense, useState, useEffect } from "react"
import Link                      from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth }               from "@/contexts/AuthContext"
import { getFirebaseErrorMessage } from "@/lib/firebase/auth"
import { GoogleSignInButton }    from "@/components/auth/GoogleSignInButton"
import { cn }                    from "@/lib/utils"

const AUTH_EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]

/* â”€â”€ LoginForm â€” uses useSearchParams, must be inside Suspense â”€â”€ */
function LoginForm() {
  const { user, signIn, signInWithGoogle } = useAuth()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const from         = searchParams.get("from") ?? "/"

  /* Redirect already-authed users */
  useEffect(() => {
    if (user) router.replace(from)
  }, [user, router, from])

  const [email,     setEmail]     = useState("")
  const [password,  setPassword]  = useState("")
  const [error,     setError]     = useState("")
  const [loading,   setLoading]   = useState(false)
  const [showPass,  setShowPass]  = useState(false)

  /* â”€â”€ Validation â”€â”€ */
  function validate(): string | null {
    if (!email.trim())    return "Email is required."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address."
    if (!password)        return "Password is required."
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const err = validate()
    if (err) { setError(err); return }

    setLoading(true)
    try {
      await signIn(email.trim(), password)
      router.replace(from)
    } catch (err: unknown) {
      const code    = (err as { code?: string }).code ?? ""
      const message = getFirebaseErrorMessage(code)
      console.error("[Auth] Email sign-in failed:", { code, message, raw: err })
      setError(
        process.env.NODE_ENV === "development" && code
          ? `${message} [${code}]`
          : message
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError("")
    console.log("[Auth] Google sign-in initiated")
    try {
      await signInWithGoogle()
      console.log("[Auth] Google sign-in succeeded")
      router.replace(from)
    } catch (err: unknown) {
      const code    = (err as { code?: string }).code ?? ""
      const message = getFirebaseErrorMessage(code)
      console.error("[Auth] Google sign-in failed:", { code, message, raw: err })
      setError(
        process.env.NODE_ENV === "development" && code
          ? `${message} [${code}]`
          : message
      )
    }
  }

  return (
    <div className="w-full max-w-md">

      {/* â”€â”€ Card â€” entrance animation â”€â”€ */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1     }}
        transition={{ duration: 0.45, ease: AUTH_EASE }}
        className="relative rounded-2xl border border-[#6366f1]/20 bg-surface/70 backdrop-blur-xl p-8 sm:p-10 shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_60px_rgba(61,122,138,0.08)]"
      >

        {/* Top gold rule */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

        {/* â”€â”€ Brand mark â”€â”€ */}
        <div className="flex flex-col items-center gap-6 mb-8">
          <Link href="/" className="flex items-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
            <span className="font-display text-[1.1rem] font-bold tracking-widest text-foreground/90 uppercase">PXL</span>
            <span className="font-display text-[1.1rem] font-bold tracking-widest text-gold logo-glow uppercase">&nbsp;CREATOR</span>
          </Link>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="font-display font-bold text-[1.5rem] text-foreground tracking-tight">Welcome back</h1>
            <p className="text-[0.875rem] text-muted/60">Sign in to your creator account</p>
          </div>
        </div>

        {/* â”€â”€ Google â”€â”€ */}
        <GoogleSignInButton onClick={handleGoogle} />

        {/* â”€â”€ Divider â”€â”€ */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[0.75rem] text-muted/40 font-medium tracking-wider">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* â”€â”€ Form â”€â”€ */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="login-error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y:  0  }}
                exit={{    opacity: 0, y: -8  }}
                transition={{ duration: 0.22, ease: AUTH_EASE }}
                className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3"
              >
                <span className="text-red-400 shrink-0" aria-hidden="true">
                  <ErrorIcon />
                </span>
                <p className="text-[0.8125rem] text-red-400 leading-snug">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[0.8125rem] font-medium text-muted/70">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              suppressHydrationWarning
              className={cn(
                "w-full rounded-xl border bg-background px-4 py-3 text-[0.9375rem] text-foreground",
                "placeholder:text-muted/35 transition-colors duration-150",
                "focus:outline-none focus:border-gold/50",
                "border-border"
              )}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-[0.8125rem] font-medium text-muted/70">Password</label>
              <Link href="/forgot-password" className="text-[0.75rem] text-muted/50 hover:text-gold transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                suppressHydrationWarning
                className={cn(
                  "w-full rounded-xl border bg-background px-4 py-3 pr-11 text-[0.9375rem] text-foreground",
                  "placeholder:text-muted/35 transition-colors duration-150",
                  "focus:outline-none focus:border-gold/50",
                  "border-border"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                suppressHydrationWarning
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted/40 hover:text-muted transition-colors focus-visible:outline-none"
              >
                {showPass ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            suppressHydrationWarning
            className={cn(
              "flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5",
              "text-[0.9375rem] font-semibold transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              loading
                ? "bg-gold/60 text-background/70 cursor-not-allowed"
                : "bg-gold text-background hover:bg-gold-dim active:scale-[0.98] shadow-[0_0_32px_rgba(255,214,10,0.15)]"
            )}
          >
            {loading && <div className="h-4 w-4 rounded-full border-2 border-background/40 border-t-background animate-spin" />}
            {loading ? "Signing inâ€¦" : "Sign in"}
          </button>

        </form>

        {/* â”€â”€ Footer link â”€â”€ */}
        <p className="mt-6 text-center text-[0.8125rem] text-muted/50">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-gold hover:text-gold-dim transition-colors">
            Create one
          </Link>
        </p>

      </motion.div>
    </div>
  )
}

/* â”€â”€ Page â€” wraps LoginForm in Suspense (required by useSearchParams) â”€â”€ */
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-surface p-8 sm:p-10 animate-pulse">
          <div className="h-8 w-32 bg-surface-2 rounded mx-auto mb-8" />
          <div className="h-12 bg-surface-2 rounded-xl mb-4" />
          <div className="h-12 bg-surface-2 rounded-xl mb-4" />
          <div className="h-12 bg-gold/20 rounded-xl" />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

/* â”€â”€ Micro icons â”€â”€ */
function ErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

