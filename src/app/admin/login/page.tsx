"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminLoginPage() {
  const router    = useRouter()
  const [pw,      setPw]      = useState("")
  const [error,   setError]   = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pw.trim()) return

    setLoading(true)
    setError("")

    try {
      const res  = await fetch("/api/admin/auth", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password: pw }),
      })
      const json = await res.json()

      if (json.success) {
        router.push("/admin")
        router.refresh()
      } else {
        setError(json.error ?? "Incorrect password.")
        setPw("")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    /* Fills the layout's content column and centers the form */
    <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">

      {/* Atmospheric gold glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full"
        style={{
          background: "radial-gradient(ellipse at center, rgba(255,214,10,0.07) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-1/4 h-[300px] w-[400px] rounded-full"
        style={{
          background: "radial-gradient(ellipse at center, rgba(61,122,138,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-[380px]">

        {/* Logo mark */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gold/10 border border-gold/25 flex items-center justify-center shadow-[0_0_40px_rgba(255,214,10,0.12)]">
            <span className="text-gold text-[0.95rem] font-black tracking-wider">PXL</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="font-display font-black text-[1.375rem] text-white/90 tracking-tight">
              Admin Access
            </h1>
            <p className="text-[0.8125rem] text-white/70">PXL Creator dashboard</p>
          </div>
        </div>

        {/* Glassmorphism card */}
        <div className="relative rounded-2xl border border-white/[0.09] bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,214,10,0.04)]">

          {/* Top accent line */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px rounded-full"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,214,10,0.25), transparent)",
            }}
          />

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.7rem] text-white/70 tracking-[0.18em] uppercase">
                Password
              </label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[0.9375rem] text-white placeholder:text-white/70 focus:outline-none focus:border-gold/35 focus:bg-white/[0.06] transition-all duration-200"
              />
            </div>

            {error && (
              <p className="text-[0.8125rem] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !pw.trim()}
              className="rounded-xl bg-gold text-[#080808] font-bold py-3.5 text-[0.9375rem] tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold-dim active:scale-[0.97] shadow-[0_4px_20px_rgba(255,214,10,0.20)]"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>

          </form>
        </div>

        <p className="text-center text-[0.7rem] text-white/70 mt-5 tracking-wide">
          Set <code className="text-white/70">ADMIN_PASSWORD</code> in .env.local
        </p>

      </div>
    </div>
  )
}

