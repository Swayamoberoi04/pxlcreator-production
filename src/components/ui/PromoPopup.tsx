"use client"

/**
 * src/components/ui/PromoPopup.tsx
 *
 * PXL Creator â€” Premium promotional popup component.
 *
 * Pure display: receives config + onClose, renders the modal.
 * All trigger/gating logic lives in PopupManager.tsx.
 *
 * Design principles (HCI):
 *   â€¢ Instant close â€” X button, backdrop click, Escape key all work immediately.
 *   â€¢ Focus trap â€” Tab stays inside the modal while it's open.
 *   â€¢ Spring entry animation â€” scale + fade feels alive, not mechanical.
 *   â€¢ Fast exit â€” 300ms so the user never waits for it to leave.
 *   â€¢ Gold aesthetic â€” radial glow, gradient border, grain overlay â€” matches PXL brand.
 *   â€¢ Responsive â€” full-width on mobile with safe padding; max-w-[480px] on desktop.
 *
 * Animation phases:
 *   'entering' â†’ CSS popup-modal-in (550ms spring)
 *   'visible'  â†’ idle
 *   'exiting'  â†’ CSS popup-modal-out (300ms), then onClose() called
 */

import { useEffect, useCallback, useRef, useState } from "react"
import Link                from "next/link"
import { cn }              from "@/lib/utils"
import type { PopupConfig } from "@/types/popup"

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Props
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface PromoPopupProps {
  config:  PopupConfig
  onClose: () => void
}

type Phase = "entering" | "visible" | "exiting"

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Component
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function PromoPopup({ config, onClose }: PromoPopupProps) {
  const [phase, setPhase] = useState<Phase>("entering")
  const firstFocusRef     = useRef<HTMLButtonElement>(null)
  const lastFocusRef      = useRef<HTMLButtonElement>(null)

  /* â”€â”€ Auto-transition entering â†’ visible â”€â”€ */
  useEffect(() => {
    if (phase !== "entering") return
    const t = setTimeout(() => setPhase("visible"), 560)
    return () => clearTimeout(t)
  }, [phase])

  /* â”€â”€ Close handler â€” plays exit animation, then unmounts â”€â”€ */
  const handleClose = useCallback(() => {
    if (phase === "exiting") return
    setPhase("exiting")
    setTimeout(onClose, 310)
  }, [phase, onClose])

  /* â”€â”€ Escape key â”€â”€ */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleClose])

  /* â”€â”€ Focus trap: Tab cycles inside modal â”€â”€ */
  useEffect(() => {
    firstFocusRef.current?.focus()
    function onTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return
      const first = firstFocusRef.current
      const last  = lastFocusRef.current
      if (!first || !last) return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener("keydown", onTab)
    return () => window.removeEventListener("keydown", onTab)
  }, [])

  const isExiting = phase === "exiting"

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     Styles
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€*/

  /* Gradient border wrapper (padding trick â€” 1px coloured layer) */
  const borderWrapperStyle: React.CSSProperties = {
    padding:         "1px",
    background:      "linear-gradient(145deg, rgba(255,214,10,0.60) 0%, rgba(255,255,255,0.04) 45%, rgba(255,214,10,0.28) 80%, rgba(255,214,10,0.50) 100%)",
    borderRadius:    "1.25rem",
    boxShadow: [
      "0 0 0 1px rgba(255,214,10,0.07)",
      `0 0 80px ${config.accentGlow}`,
      "0 0 160px rgba(255,214,10,0.08)",
      "0 40px 100px rgba(0,0,0,0.80)",
      "0 8px 32px rgba(0,0,0,0.60)",
    ].join(", "),
    animation: isExiting
      ? "popup-modal-out 0.31s cubic-bezier(0.4,0,1,1) forwards"
      : "popup-modal-in  0.56s cubic-bezier(0.16,1,0.3,1) forwards",
    willChange: "transform, opacity",
  }

  /* Inner dark body with dual radial glow */
  const innerBodyStyle: React.CSSProperties = {
    background: [
      /* Top-centre gold burst */
      "radial-gradient(ellipse 130% 60% at 50% -8%, rgba(255,214,10,0.12) 0%, transparent 62%)",
      /* Bottom-right accent glow */
      `radial-gradient(ellipse 80% 50% at 90% 110%, ${config.accentGlow} 0%, transparent 65%)`,
      /* Base */
      "#08090f",
    ].join(", "),
    borderRadius: "calc(1.25rem - 1px)",
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     Render
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€*/
  return (
    /* â”€â”€ Full-screen overlay â”€â”€ */
    <div
      role="dialog"
      aria-modal="true"
      aria-label={config.headline}
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6"
    >

      {/* â”€â”€ Backdrop â”€â”€ */}
      <div
        aria-hidden="true"
        onClick={handleClose}
        className="popup-backdrop absolute inset-0 cursor-pointer"
        style={{
          background:         "rgba(4,4,10,0.80)",
          backdropFilter:     "blur(8px) saturate(140%)",
          WebkitBackdropFilter: "blur(8px) saturate(140%)",
          animation: isExiting
            ? "popup-backdrop-out 0.32s ease-out forwards"
            : "popup-backdrop-in  0.40s ease-out forwards",
        }}
      />

      {/* â”€â”€ Modal â”€â”€ */}
      <div
        className="popup-modal relative z-10 w-full max-w-[480px]"
        style={borderWrapperStyle}
      >
        <div className="relative overflow-hidden" style={innerBodyStyle}>

          {/* â”€â”€ Noise grain texture â”€â”€ */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.028]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: "220px 220px",
            }}
          />

          {/* â”€â”€ Shimmer line across top â”€â”€ */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px overflow-hidden"
          >
            <div
              style={{
                height:     "100%",
                background: "linear-gradient(90deg, transparent 0%, rgba(255,214,10,0.70) 30%, rgba(255,255,255,0.45) 50%, rgba(255,214,10,0.70) 70%, transparent 100%)",
                animation:  "popup-shimmer 3.5s ease-in-out infinite",
              }}
            />
          </div>

          {/* â”€â”€ Scanlines overlay â”€â”€ */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.018] scanlines" />

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              CONTENT
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <div className="relative px-7 py-8 sm:px-8 sm:py-9">

            {/* â”€â”€ Close button (top-right) â”€â”€ */}
            <button
              ref={firstFocusRef}
              type="button"
              onClick={handleClose}
              aria-label="Close promotional offer"
              className={cn(
                "absolute top-4 right-4",
                "flex h-8 w-8 items-center justify-center rounded-full",
                "text-muted/40 transition-all duration-200",
                "hover:bg-white/[0.07] hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
              )}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* â”€â”€ Badge row â”€â”€ */}
            <div className="flex items-center gap-3 mb-5">
              {/* Category badge */}
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1",
                "text-[0.62rem] font-black tracking-[0.14em] uppercase",
                config.badgeStyle,
              )}>
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-75"
                  style={{ boxShadow: "0 0 4px currentColor" }}
                />
                {config.badge}
              </span>

              {/* Highlight pill */}
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.62rem] font-black tracking-[0.12em] uppercase text-background"
                style={{
                  background:  "linear-gradient(135deg, #FFD60A 0%, #E0A800 100%)",
                  boxShadow:   "0 0 12px rgba(255,214,10,0.45), 0 2px 8px rgba(0,0,0,0.40)",
                }}
              >
                {config.highlight}
              </span>
            </div>

            {/* â”€â”€ Headline â”€â”€ */}
            <h2
              className="font-display font-black tracking-tight text-foreground mb-2 leading-[1.05]"
              style={{ fontSize: "clamp(1.5rem, 5vw, 1.9rem)" }}
            >
              {config.headline}
            </h2>

            {/* â”€â”€ Subheadline â”€â”€ */}
            <p
              className="text-[0.875rem] font-semibold mb-3.5 leading-snug"
              style={{
                background:         "linear-gradient(135deg, #FFD60A 0%, #E0A800 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip:     "text",
              }}
            >
              {config.subheadline}
            </p>

            {/* â”€â”€ Value proposition â”€â”€ */}
            <p className="text-[0.875rem] leading-relaxed text-muted/65 mb-7">
              {config.valueProp}
            </p>

            {/* â”€â”€ CTA button â”€â”€ */}
            <Link
              href={config.ctaHref}
              onClick={handleClose}
              className={cn(
                "flex w-full items-center justify-center gap-2.5",
                "rounded-xl py-3.5 px-5",
                "text-[0.9375rem] font-black tracking-wide text-background",
                "transition-all duration-200 active:scale-[0.97]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gold focus-visible:ring-offset-background",
              )}
              style={{
                background:  "linear-gradient(135deg, #FFD60A 0%, #E0A800 55%, #FFD60A 100%)",
                backgroundSize: "200% 200%",
                boxShadow:   "0 0 28px rgba(255,214,10,0.30), 0 4px 16px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.25)",
                transition:  "box-shadow 0.2s ease, transform 0.1s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 0 48px rgba(255,214,10,0.55), 0 8px 24px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.30)"
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 0 28px rgba(255,214,10,0.30), 0 4px 16px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.25)"
              }}
            >
              {config.ctaLabel}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
              </svg>
            </Link>

            {/* â”€â”€ Dismiss link â”€â”€ */}
            <button
              ref={lastFocusRef}
              type="button"
              onClick={handleClose}
              className={cn(
                "mt-3.5 flex w-full items-center justify-center",
                "text-[0.78rem] text-muted/30 transition-colors duration-200",
                "hover:text-muted/55",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-muted/30 rounded-sm",
              )}
            >
              No thanks, I&apos;ll pass
            </button>

          </div>
          {/* /CONTENT */}

        </div>
      </div>
      {/* /Modal */}

    </div>
  )
}

