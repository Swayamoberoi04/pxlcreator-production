"use client"

/**
 * Admin login — two independent factors:
 *   1. Firebase identity  (Google or email/password) — must be the
 *      configured ADMIN_EMAIL, email-verified.
 *   2. Admin key           (ADMIN_PASSWORD).
 *
 * The client obtains a Firebase ID token, then posts { idToken, password }
 * to /api/admin/auth, which verifies BOTH factors server-side. The client
 * never decides who is admin — it only forwards proofs.
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "@/lib/firebase/config"
import { signInWithEmail, signInWithGoogle, signOut, getFirebaseErrorMessage } from "@/lib/firebase/auth"

export default function AdminLoginPage() {
  const router = useRouter()

  const [user,       setUser]       = useState<User | null>(null)
  const [email,      setEmail]      = useState("")
  const [acctPw,     setAcctPw]     = useState("")
  const [adminPw,    setAdminPw]    = useState("")
  const [error,      setError]      = useState("")
  const [busy,       setBusy]       = useState(false)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  /* ── Factor 1a: email / password identity ── */
  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !acctPw) return
    setBusy(true); setError("")
    try {
      await signInWithEmail(email.trim(), acctPw)
      setAcctPw("")
    } catch (err) {
      const code = (err as { code?: string }).code ?? ""
      setError(getFirebaseErrorMessage(code))
    } finally {
      setBusy(false)
    }
  }

  /* ── Factor 1b: Google identity ── */
  async function handleGoogle() {
    setBusy(true); setError("")
    try {
      await signInWithGoogle()
    } catch (err) {
      const code = (err as { code?: string }).code ?? ""
      setError(getFirebaseErrorMessage(code))
    } finally {
      setBusy(false)
    }
  }

  /* ── Factor 2: admin key → server verifies both factors ── */
  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !adminPw) return
    setBusy(true); setError("")
    try {
      const idToken = await user.getIdToken(/* forceRefresh */ true)
      const res = await fetch("/api/admin/auth", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ idToken, password: adminPw }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success) {
        router.push("/admin")
        router.refresh()
      } else {
        setError(json.error ?? "Invalid credentials.")
        setAdminPw("")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">

      {/* Atmospheric gold glow */}
      <div aria-hidden="true" className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full"
        style={{ background: "radial-gradient(ellipse at center, rgba(255,214,10,0.07) 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-[380px]">

        {/* Logo mark */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gold/10 border border-gold/25 flex items-center justify-center shadow-[0_0_40px_rgba(255,214,10,0.12)]">
            <span className="text-gold text-[0.95rem] font-black tracking-wider">PXL</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="font-display font-black text-[1.375rem] text-white/90 tracking-tight">Admin Access</h1>
            <p className="text-[0.8125rem] text-white/30">Two-factor · verified identity + admin key</p>
          </div>
        </div>

        <div className="relative rounded-2xl border border-white/[0.09] bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,214,10,0.25), transparent)" }} />

          {/* ── Step 1: identity ── */}
          {!user && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="rounded-xl border border-white/[0.12] bg-white/[0.05] text-white/90 font-semibold py-3 text-[0.9rem] hover:bg-white/[0.08] transition-all disabled:opacity-40"
              >
                Continue with Google
              </button>

              <div className="flex items-center gap-3 text-white/20 text-[0.7rem]">
                <div className="h-px flex-1 bg-white/[0.08]" /> OR <div className="h-px flex-1 bg-white/[0.08]" />
              </div>

              <form onSubmit={handleEmailSignIn} className="flex flex-col gap-3">
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Admin email" autoComplete="username"
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[0.9rem] text-white placeholder:text-white/20 focus:outline-none focus:border-gold/35"
                />
                <input
                  type="password" value={acctPw} onChange={(e) => setAcctPw(e.target.value)}
                  placeholder="Account password" autoComplete="current-password"
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[0.9rem] text-white placeholder:text-white/20 focus:outline-none focus:border-gold/35"
                />
                <button type="submit" disabled={busy || !email.trim() || !acctPw}
                  className="rounded-xl bg-white/[0.08] text-white/90 font-semibold py-3 text-[0.9rem] hover:bg-white/[0.12] transition-all disabled:opacity-40">
                  {busy ? "Verifying…" : "Verify identity"}
                </button>
              </form>
            </div>
          )}

          {/* ── Step 2: admin key ── */}
          {user && (
            <form onSubmit={handleUnlock} className="flex flex-col gap-4">
              <div className="flex items-center justify-between text-[0.75rem]">
                <span className="text-white/40 truncate">Signed in as <span className="text-gold/80">{user.email}</span></span>
                <button type="button" onClick={() => signOut()} className="text-white/30 hover:text-white/60 shrink-0 ml-2">Switch</button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.7rem] text-white/35 tracking-[0.18em] uppercase">Admin key</label>
                <input
                  type="password" value={adminPw} onChange={(e) => setAdminPw(e.target.value)}
                  placeholder="Enter admin key" autoFocus autoComplete="off"
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[0.9375rem] text-white placeholder:text-white/20 focus:outline-none focus:border-gold/35"
                />
              </div>

              <button type="submit" disabled={busy || !adminPw}
                className="rounded-xl bg-gold text-[#080808] font-bold py-3.5 text-[0.9375rem] tracking-wide transition-all disabled:opacity-40 hover:bg-gold-dim active:scale-[0.97]">
                {busy ? "Unlocking…" : "Unlock dashboard"}
              </button>
            </form>
          )}

          {error && (
            <p className="mt-4 text-[0.8125rem] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center">
              {error}
            </p>
          )}
        </div>

        <p className="text-center text-[0.7rem] text-white/15 mt-5 tracking-wide">
          Access is restricted to the configured admin identity.
        </p>
      </div>
    </div>
  )
}
