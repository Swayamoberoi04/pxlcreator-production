"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Container } from "@/components/layout/Container"
import { cn }        from "@/lib/utils"
import type { DownloadTokenResult } from "@/types/commerce"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"
import { CinematicReveal }     from "@/components/ui/CinematicReveal"

interface SuccessData {
  order_id: string
  items:    DownloadTokenResult[]
  email:    string
}

export function CheckoutSuccessClient() {
  const [data,    setData]    = useState<SuccessData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = sessionStorage.getItem("pxl_checkout_success")
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setData(JSON.parse(raw) as SuccessData)
      } catch { /* malformed */ }
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="w-full bg-background min-h-[70vh] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
      </div>
    )
  }

  /* No session data â€” user navigated here directly */
  if (!data) {
    return (
      <div className="w-full bg-background min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-5 text-center px-6 max-w-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface border border-border">
            <LibraryIcon />
          </div>
          <div>
            <p className="font-display font-bold text-xl text-foreground">Your downloads are in your library</p>
            <p className="text-small text-muted mt-2">
              All your purchased presets are available in your account library.
            </p>
          </div>
          <Link
            href="/account"
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-background hover:bg-gold-dim transition-colors"
          >
            Go to My Library
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full bg-background overflow-hidden">

      {/* Living celebratory atmosphere */}
      <LuminousEnvironment variant="gold" intensity={1.2} />
      <GrainOverlay opacity={0.016} animated zIndex={1} />

      <Container className="relative z-10 py-16 sm:py-20">
        <div className="mx-auto max-w-xl">

          {/* â”€â”€ Success header â”€â”€ */}
          <CinematicReveal variant="depth">
            <div className="flex flex-col items-center text-center gap-5 mb-10">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gold/10 border border-gold/25 shadow-[0_0_48px_rgba(255,214,10,0.18)]">
                <CheckCircleIcon />
              </div>
              <div>
                <h1 className="font-display font-bold text-3xl text-foreground">Payment Confirmed!</h1>
                <p className="text-muted mt-2 text-base">
                  Download links sent to <span className="text-foreground font-medium">{data.email}</span>
                </p>
              </div>
            </div>
          </CinematicReveal>

          {/* â”€â”€ Download cards â”€â”€ */}
          <CinematicReveal variant="rise" delay={0.1}>
            <div className="flex flex-col gap-3 mb-8">
              <p className="text-label text-muted/60 tracking-widest">YOUR DOWNLOADS</p>

            {data.items.map((item) => (
              <div
                key={item.token}
                className="depth-card flex items-center gap-4 rounded-2xl border border-gold/15 bg-surface/80 backdrop-blur-sm p-4"
              >
                {/* Preset icon */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 border border-gold/20">
                  <PresetIcon />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{item.preset_title}</p>
                  <p className="text-xs text-muted mt-0.5">Lightroom Preset Pack</p>
                </div>

                {/* Download button */}
                <a
                  href={`/api/downloads/${item.token}`}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5",
                    "bg-gold text-background text-sm font-semibold",
                    "hover:bg-gold-dim transition-colors active:scale-95"
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <DownloadIcon />
                  Download
                </a>
              </div>
            ))}
            </div>
          </CinematicReveal>

          {/* â”€â”€ Notice â”€â”€ */}
          <CinematicReveal variant="rise" delay={0.18}>
            <div className="rounded-xl border border-border/60 bg-surface/40 backdrop-blur-sm px-4 py-3 mb-8">
              <p className="text-small text-muted text-center leading-relaxed">
                Download links are valid for <span className="text-foreground">30 days</span> from today.
                You can always find your purchases in{" "}
                <Link href="/account" className="text-gold hover:underline">My Library</Link>.
              </p>
            </div>
          </CinematicReveal>

          {/* â”€â”€ Actions â”€â”€ */}
          <CinematicReveal variant="rise" delay={0.24}>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/store"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-semibold text-background hover:bg-gold-dim transition-colors"
            >
              Continue Shopping
            </Link>
            <Link
              href="/account"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3.5 text-sm font-medium text-muted hover:text-foreground hover:border-border/80 transition-colors"
            >
              <LibraryIcon size={15} />
              My Library
            </Link>
          </div>
          </CinematicReveal>

        </div>
      </Container>
    </div>
  )
}

/* â”€â”€ Icons â”€â”€ */
function CheckCircleIcon() {
  return <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
}
function DownloadIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}
function LibraryIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
}
function PresetIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
}

