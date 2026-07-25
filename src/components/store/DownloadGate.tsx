"use client"

import { useState } from "react"
import Link         from "next/link"
import { useAuth }  from "@/contexts/AuthContext"
import { cn }       from "@/lib/utils"

interface DownloadGateProps {
  preset: {
    slug:             string
    name:             string
    downloadFileName?: string
    isFree?:          boolean
    price:            number
  }
}

/**
 * DownloadGate — sits on product pages.
 *
 * Free preset:
 *   → Not logged in: "Create a free account to download"
 *   → Logged in:     Download button (stubs a real file delivery URL)
 *
 * Paid preset:
 *   → Not logged in: "Log in to purchase"
 *   → Logged in:     "Add to Cart" / "Buy Now" (handled by AddToCartButton)
 */
export function DownloadGate({ preset }: DownloadGateProps) {
  const { user } = useAuth()
  const [downloading, setDownloading] = useState(false)
  const [done,        setDone]        = useState(false)

  async function handleDownload() {
    if (!user) return
    setDownloading(true)

    /* ── Stub: in production this hits a signed-URL endpoint ── */
    await new Promise((r) => setTimeout(r, 1200))

    /* Create a fake download — replace href with real signed URL */
    const a     = document.createElement("a")
    a.href      = "#"   // → replace with: await fetch(`/api/download/${preset.slug}`)
    a.download  = preset.downloadFileName ?? `${preset.slug}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    setDownloading(false)
    setDone(true)
    setTimeout(() => setDone(false), 4000)
  }

  /* ── FREE but not logged in ── */
  if (preset.isFree && !user) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <GiftIcon />
          </span>
          <div>
            <p className="text-[0.875rem] font-semibold text-foreground">This preset is free</p>
            <p className="text-[0.75rem] text-muted/85">Create an account to download instantly</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Link
            href={`/signup?from=/presets/${preset.slug}`}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-[0.875rem] font-semibold text-white transition-all hover:bg-emerald-400 active:scale-[0.98]"
          >
            <DownloadIcon />
            Create free account
          </Link>
          <Link
            href={`/login?from=/presets/${preset.slug}`}
            className="flex-1 flex items-center justify-center rounded-xl border border-border py-3 text-[0.875rem] font-medium text-muted transition-all hover:text-foreground hover:border-border/80"
          >
            Log in
          </Link>
        </div>
      </div>
    )
  }

  /* ── FREE and logged in ── */
  if (preset.isFree && user) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading || done}
          suppressHydrationWarning
          className={cn(
            "flex w-full items-center justify-center gap-2.5 rounded-xl py-4",
            "text-[0.9375rem] font-semibold transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            done
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : downloading
                ? "bg-emerald-500/60 text-white cursor-wait"
                : "bg-emerald-500 text-white hover:bg-emerald-400 active:scale-[0.98]"
          )}
        >
          {downloading && <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
          {!downloading && (done ? <CheckIcon /> : <DownloadIcon />)}
          {downloading ? "Preparing download…" : done ? "Download started!" : "Download Free Pack"}
        </button>
        <p className="text-center text-[0.75rem] text-muted/70">
          Logged in as <span className="text-muted/85">{user.email}</span>
        </p>
      </div>
    )
  }

  /* ── PAID (handled by AddToCartButton — this is just a gate banner) ── */
  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-surface/60 p-4 flex items-center justify-between gap-4">
        <p className="text-[0.8125rem] text-muted/85 leading-snug">
          <span className="text-foreground font-medium">Sign in</span> to purchase and access your downloads
        </p>
        <Link
          href={`/login?from=/presets/${preset.slug}`}
          className="shrink-0 rounded-xl bg-gold px-4 py-2 text-[0.8125rem] font-semibold text-background transition-all hover:bg-gold-dim"
        >
          Log in
        </Link>
      </div>
    )
  }

  return null /* logged in + paid → AddToCartButton handles it */
}

/* ── Icons ── */
function GiftIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
}
function DownloadIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}
function CheckIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}
