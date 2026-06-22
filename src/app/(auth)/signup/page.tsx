"use client"

import { useState, useEffect } from "react"
import Link                     from "next/link"
import { useRouter }            from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth }              from "@/contexts/AuthContext"
import { getFirebaseErrorMessage, getPasswordStrength } from "@/lib/firebase/auth"
import { GoogleSignInButton }   from "@/components/auth/GoogleSignInButton"
import { PasswordStrengthBar }  from "@/components/auth/PasswordStrengthBar"
import { cn }                   from "@/lib/utils"

const AUTH_EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]

export default function SignupPage() {
  const { user, signUp, signInWithGoogle } = useAuth()
  const router = useRouter()

  /* Redirect if already logged in */
  useEffect(() => {
    if (user) router.replace("/account")
  }, [user, router])

  const [name,        setName]        = useState("")
  const [email,       setEmail]       = useState("")
  const [password,    setPassword]    = useState("")
  const [confirm,     setConfirm]     = useState("")
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [loading,     setLoading]     = useState(false)
  const [showPass,    setShowPass]    = useState(false)
  const [showConf,    setShowConf]    = useState(false)

  /* â”€â”€ Field validation â”€â”€ */
  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim())    errs.name = "Name is required."
    if (!email.trim())   errs.email = "Email is required."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email."

    const { score } = getPasswordStrength(password)
    if (!password)       errs.password = "Password is required."
    else if (score < 3)  errs.password = "Password is too weak. Meet all requirements."

    if (!confirm)        errs.confirm = "Please confirm your password."
    else if (confirm !== password) errs.confirm = "Passwords do not match."

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError("")
    if (!validate()) return

    setLoading(true)
    try {
      await signUp(email.trim(), password, name.trim())
      router.replace("/account")
    } catch (err: unknown) {
      const code    = (err as { code?: string }).code ?? ""
      const message = getFirebaseErrorMessage(code)
      console.error("[Auth] Email sign-up failed:", { code, message, raw: err })
      setServerError(
        process.env.NODE_ENV === "development" && code
          ? `${message} [${code}]`
          : message
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setServerError("")
    console.log("[Auth] Google sign-up initiated")
    try {
      await signInWithGoogle()
      console.log("[Auth] Google sign-up succeeded")
      router.replace("/account")
    } catch (err: unknown) {
      const code    = (err as { code?: string }).code ?? ""
      const message = getFirebaseErrorMessage(code)
      console.error("[Auth] Google sign-up failed:", { code, message, raw: err })
      setServerError(
        process.env.NODE_ENV === "development" && code
          ? `${message} [${code}]`
          : message
      )
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

        {/* â”€â”€ Brand + heading â”€â”€ */}
        <div className="flex flex-col items-center gap-6 mb-8">
          <Link href="/" className="flex items-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
            <span className="font-display text-[1.1rem] font-bold tracking-widest text-foreground/90 uppercase">PXL</span>
            <span className="font-display text-[1.1rem] font-bold tracking-widest text-gold logo-glow uppercase">&nbsp;CREATOR</span>
          </Link>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="font-display font-bold text-[1.5rem] text-foreground tracking-tight">Create your account</h1>
            <p className="text-[0.875rem] text-muted/60">Join the PXL Creator ecosystem</p>
          </div>
        </div>

        {/* â”€â”€ Google â”€â”€ */}
        <GoogleSignInButton onClick={handleGoogle} label="Sign up with Google" />

        {/* â”€â”€ OR divider â”€â”€ */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[0.75rem] text-muted/40 font-medium tracking-wider">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* â”€â”€ Form â”€â”€ */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

          {/* Server error */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                key="signup-error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y:  0  }}
                exit={{    opacity: 0, y: -8  }}
                transition={{ duration: 0.22, ease: AUTH_EASE }}
                className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3"
              >
                <ErrorIcon />
                <p className="text-[0.8125rem] text-red-400 leading-snug">{serverError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Name */}
          <FormField
            id="name" label="Full name" type="text"
            value={name} onChange={setName}
            placeholder="Alex Rivera"
            autoComplete="name"
            error={errors.name}
          />

          {/* Email */}
          <FormField
            id="email" label="Email address" type="email"
            value={email} onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email}
          />

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[0.8125rem] font-medium text-muted/70">
              Password
            </label>
            <PasswordInput
              id="password" value={password} onChange={setPassword}
              show={showPass} onToggle={() => setShowPass((v) => !v)}
              placeholder="Create a strong password"
              autoComplete="new-password"
              error={errors.password}
            />
            <PasswordStrengthBar password={password} />
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className="text-[0.8125rem] font-medium text-muted/70">
              Confirm password
            </label>
            <PasswordInput
              id="confirm" value={confirm} onChange={setConfirm}
              show={showConf} onToggle={() => setShowConf((v) => !v)}
              placeholder="Repeat your password"
              autoComplete="new-password"
              error={errors.confirm}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            suppressHydrationWarning
            className={cn(
              "flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 mt-1",
              "text-[0.9375rem] font-semibold transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              loading
                ? "bg-gold/60 text-background/70 cursor-not-allowed"
                : "bg-gold text-background hover:bg-gold-dim active:scale-[0.98] shadow-[0_0_32px_rgba(255,214,10,0.15)]"
            )}
          >
            {loading && <div className="h-4 w-4 rounded-full border-2 border-background/40 border-t-background animate-spin" />}
            {loading ? "Creating accountâ€¦" : "Create account"}
          </button>

        </form>

        <p className="mt-6 text-center text-[0.8125rem] text-muted/50">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-gold hover:text-gold-dim transition-colors">
            Sign in
          </Link>
        </p>

      </motion.div>
    </div>
  )
}

/* â”€â”€ Reusable field â”€â”€ */
function FormField({
  id, label, type, value, onChange, placeholder, autoComplete, error,
}: {
  id: string; label: string; type: string; value: string; onChange: (v: string) => void
  placeholder?: string; autoComplete?: string; error?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.8125rem] font-medium text-muted/70">{label}</label>
      <input
        id={id} type={type} value={value} placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        suppressHydrationWarning
        className={cn(
          "w-full rounded-xl border bg-background px-4 py-3 text-[0.9375rem] text-foreground",
          "placeholder:text-muted/35 transition-colors duration-150",
          "focus:outline-none focus:border-gold/50",
          error ? "border-red-500/50 bg-red-500/[0.03]" : "border-border"
        )}
      />
      {error && <p className="text-[0.75rem] text-red-400 mt-0.5">{error}</p>}
    </div>
  )
}

/* â”€â”€ Password field with toggle â”€â”€ */
function PasswordInput({
  id, value, onChange, show, onToggle, placeholder, autoComplete, error,
}: {
  id: string; value: string; onChange: (v: string) => void
  show: boolean; onToggle: () => void; placeholder?: string
  autoComplete?: string; error?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <input
          id={id} type={show ? "text" : "password"} value={value}
          placeholder={placeholder} autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          suppressHydrationWarning
          className={cn(
            "w-full rounded-xl border bg-background px-4 py-3 pr-11 text-[0.9375rem] text-foreground",
            "placeholder:text-muted/35 transition-colors duration-150",
            "focus:outline-none focus:border-gold/50",
            error ? "border-red-500/50 bg-red-500/[0.03]" : "border-border"
          )}
        />
        <button
          type="button" onClick={onToggle} suppressHydrationWarning
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted/40 hover:text-muted transition-colors focus-visible:outline-none"
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error && <p className="text-[0.75rem] text-red-400">{error}</p>}
    </div>
  )
}

/* â”€â”€ Icons â”€â”€ */
function ErrorIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
}
function EyeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}
function EyeOffIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
}

