"use client"

import { useState, useEffect } from "react"
import { useRouter }           from "next/navigation"

export default function AdminLoginPage() {
  const router   = useRouter()
  const [pw,     setPw]     = useState("")
  const [error,  setError]  = useState("")
  const [loading,setLoading]= useState(false)

  // If already has a valid session, redirect to admin
  useEffect(() => {
    // Just attempt a protected fetch — middleware will redirect if invalid
  }, [])

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#080808]">

      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-gold opacity-[0.04] blur-[120px]"
      />

      <div className="relative w-full max-w-[360px] mx-4">

        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center">
            <span className="text-gold text-[0.875rem] font-black">PXL</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="font-display font-black text-[1.25rem] text-white">
              ( Admin Access )
            </h1>
            <p className="text-[0.8125rem] text-white/30">PXL Creator dashboard</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.75rem] text-white/40 tracking-widest">
                ( Password )
              </label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[0.9375rem] text-white placeholder:text-white/20 focus:outline-none focus:border-gold/40 transition-colors"
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
              className="rounded-xl bg-gold text-background font-semibold py-3 text-[0.9375rem] transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold-dim active:scale-[0.97]"
            >
              {loading ? "Signing in…" : "( Sign In )"}
            </button>

          </form>
        </div>

        <p className="text-center text-[0.75rem] text-white/20 mt-5">
          Set ADMIN_PASSWORD in .env.local
        </p>

      </div>
    </div>
  )
}
