"use client"

import { Suspense }  from "react"
import { useSearchParams } from "next/navigation"
import Link          from "next/link"
import { Container } from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"
import { CinematicReveal }     from "@/components/ui/CinematicReveal"

/* ── Inner component — uses useSearchParams so needs Suspense ── */
function SuccessContent() {
  const params    = useSearchParams()
  const plan      = params.get("plan")    ?? "creator"
  const cycle     = params.get("cycle")   ?? "monthly"
  const untilRaw  = params.get("until")   ?? ""

  const planName  = plan.charAt(0).toUpperCase() + plan.slice(1)
  const cycleLabel = cycle === "yearly" ? "Annual" : "Monthly"

  let untilLabel = ""
  if (untilRaw) {
    try {
      untilLabel = new Date(untilRaw).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    } catch { /* ignore */ }
  }

  const unlocked = plan === "pro"
    ? [
        "All preset packs — unlimited downloads",
        "Full course library",
        "Early access to new drops",
        "Creator Discord community",
        "Monthly 1:1 feedback sessions",
        "Custom preset requests",
        "Priority support",
      ]
    : [
        "All preset packs — unlimited downloads",
        "Full course library",
        "Early access to new drops",
        "Creator Discord community",
      ]

  return (
    <div className="relative w-full bg-background overflow-hidden min-h-[80vh] flex items-center justify-center px-4">
      <LuminousEnvironment variant="gold" intensity={1.2} />
      <GrainOverlay opacity={0.015} animated zIndex={1} />

      <Container size="narrow" className="relative z-10 py-16 text-center">

        {/* Animated checkmark ring */}
        <CinematicReveal variant="depth">
          <div className="flex justify-center mb-8">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gold/10 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gold/15 border border-gold/30 shadow-[0_0_40px_rgba(255,214,10,0.20)]">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
          </div>
        </CinematicReveal>

        {/* Heading */}
        <CinematicReveal variant="depth" delay={0.08}>
          <h1 className="font-display font-black text-[clamp(1.75rem,4vw,2.75rem)] text-foreground tracking-tight mb-3">
            You&apos;re a{" "}
            <span className="text-gold">{planName}</span>
            {" "}member!
          </h1>

          <p className="text-[1rem] text-muted/92 leading-relaxed mb-2">
            Your <strong className="text-foreground">{planName} {cycleLabel}</strong> plan is now active.
          </p>
          {untilLabel && (
            <p className="text-[0.875rem] text-muted/85 mb-10">
              Access valid until{" "}
              <span className="text-foreground font-medium">{untilLabel}</span>
            </p>
          )}
        </CinematicReveal>

        {/* Unlocked features */}
        <CinematicReveal variant="rise" delay={0.16}>
          <div className="depth-card rounded-2xl border border-gold/20 bg-surface/70 backdrop-blur-sm p-6 text-left mb-10 max-w-md mx-auto shadow-[0_0_60px_rgba(255,214,10,0.06)]">
            <p className="text-[0.7rem] font-bold tracking-[0.2em] uppercase text-gold/70 mb-4">
              Unlocked for you
            </p>
            <ul className="flex flex-col gap-2.5">
              {unlocked.map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-[0.875rem] text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </CinematicReveal>

        {/* CTAs */}
        <CinematicReveal variant="rise" delay={0.24}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/presets"
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 text-sm font-semibold text-background hover:bg-gold-dim transition-colors shadow-[0_0_24px_rgba(255,214,10,0.20)]"
            >
              Browse Premium Presets
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-7 py-3.5 text-sm font-medium text-muted hover:text-foreground hover:border-border/60 transition-colors"
            >
              Manage Billing
            </Link>
          </div>

          <p className="mt-8 text-[0.8125rem] text-muted/85">
            A confirmation will be sent to your registered email address.
          </p>
        </CinematicReveal>

      </Container>
    </div>
  )
}

export default function PremiumSuccessPage() {
  return (
    <Suspense fallback={
      <div className="relative w-full min-h-[80vh] flex items-center justify-center overflow-hidden">
        <LuminousEnvironment variant="gold" intensity={1.2} />
        <div className="relative z-10 h-10 w-10 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}


