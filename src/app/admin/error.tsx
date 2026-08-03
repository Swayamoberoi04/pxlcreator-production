"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error("[admin error]", error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 p-8 text-center">
      <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-display font-bold text-[1.25rem] text-white/90">Something went wrong</h1>
        <p className="text-[0.875rem] text-white/50 max-w-sm">
          {error.message || "An unexpected error occurred in the admin panel."}
        </p>
        {error.digest && (
          <p className="text-[0.7rem] text-white/25 font-mono mt-1">digest: {error.digest}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-gold text-background font-semibold px-5 py-2.5 text-[0.875rem] hover:bg-gold-dim transition-all active:scale-95"
        >
          Try again
        </button>
        <Link
          href="/admin"
          className="rounded-xl border border-white/10 text-white/70 font-medium px-5 py-2.5 text-[0.875rem] hover:text-white/90 hover:bg-white/[0.04] transition-all"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
