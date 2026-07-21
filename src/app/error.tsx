"use client"

/**
 * src/app/error.tsx — App Router route-segment error boundary (Phase 5 §7).
 *
 * Catches uncaught render/data errors in any route segment and shows a
 * calm, on-brand recovery UI instead of a white screen. The digest is
 * surfaced for support correlation; the raw error is logged (dev) but
 * never shown to users. reset() re-renders the segment.
 */

import { useEffect } from "react"

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(`[app:error] ${JSON.stringify({ event: "route_error", digest: error.digest, message: error.message })}`)
  }, [error])

  return (
    <div
      role="alert"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-muted/60" aria-hidden="true">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[1.5rem] font-bold text-foreground">Something went wrong</h1>
        <p className="max-w-md text-[0.9375rem] leading-relaxed text-muted/70">
          An unexpected error interrupted this page. Your work and account are safe — try again, or head back home.
        </p>
        {error.digest && (
          <p className="mt-1 text-[0.75rem] text-muted/40">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-gold px-6 py-2.5 text-[0.875rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-full border border-border px-6 py-2.5 text-[0.875rem] font-medium text-foreground transition-colors hover:border-gold/40 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Go home
        </a>
      </div>
    </div>
  )
}
