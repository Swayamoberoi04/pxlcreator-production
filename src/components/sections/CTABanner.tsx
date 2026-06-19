"use client"

/**
 * CTABanner.tsx — Stop Spending Hours Editing. Start Creating.
 *
 * Cinematic upgrade:
 *   • Added CinematicBackground + GrainOverlay for atmosphere
 *   • Eyebrow, headline, copy, CTAs all use CinematicReveal/Stagger
 *   • Edge glow accents
 *   • depth-section pseudo-borders
 * Content unchanged.
 */

import Link                         from "next/link"
import { Container }                from "@/components/layout/Container"
import { Button }                   from "@/components/ui/button"
import { CinematicBackground }      from "@/components/ui/CinematicBackground"
import { GrainOverlay }             from "@/components/ui/GrainOverlay"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

export function CTABanner() {
  return (
    <section className="relative w-full overflow-hidden bg-background py-24 sm:py-32 depth-section">

      {/* ── Cinematic atmosphere (upgraded from bare radial div) ── */}
      <CinematicBackground variant="dark" />
      <GrainOverlay opacity={0.020} animated zIndex={1} />

      {/* ── Background: centered gold radial glow ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2]">
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold opacity-[0.04] blur-[120px]" />
      </div>

      {/* ── Left + right edge light leaks ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-gold/10 to-transparent z-[2]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-gold/10 to-transparent z-[2]" />

      <Container size="narrow" className="relative z-10">
        <div className="flex flex-col items-center text-center gap-8">

          {/* Eyebrow */}
          <CinematicReveal variant="rise">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
              <span className="text-label text-gold/80 tracking-widest animate-gold-flicker">
                Start Today
              </span>
              <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
            </div>
          </CinematicReveal>

          {/* Headline — deep 3D entrance */}
          <CinematicReveal variant="depth" delay={0.05}>
            <h2 className="heading-2 text-foreground max-w-2xl">
              Stop Spending Hours
              <br />
              <span className="text-gold-gradient">Editing. Start Creating.</span>
            </h2>
          </CinematicReveal>

          {/* Sub-copy */}
          <CinematicReveal variant="rise" delay={0.12}>
            <p className="text-lead max-w-lg">
              One-click cinematic looks that actually work. No subscriptions.
              No fluff. Just presets that make your work stand out.
            </p>
          </CinematicReveal>

          {/* CTA row */}
          <CinematicReveal variant="rise" delay={0.18}>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-gold text-background font-semibold hover:bg-gold-dim px-8 h-12 text-base
                  shadow-[0_0_32px_rgba(201,168,76,0.18)] hover:shadow-[0_0_48px_rgba(201,168,76,0.30)]
                  transition-all duration-300"
              >
                <Link href="/store">Browse All Presets</Link>
              </Button>

              <Button
                asChild
                variant="ghost"
                size="lg"
                className="text-muted hover:text-foreground px-8 h-12 text-base"
              >
                <Link href="/store?category=Free">See Free Samples</Link>
              </Button>
            </div>
          </CinematicReveal>

          {/* Trust micro-copy — staggered */}
          <CinematicStagger
            stagger={0.08}
            baseDelay={0.05}
            itemVariant="rise"
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          >
            {[
              "Instant download",
              "Works in Lightroom & ACR",
              "No subscription",
            ].map((item) => (
              <CinematicItem key={item} variant="rise">
                <div className="flex items-center gap-1.5">
                  <CheckIcon />
                  <span className="text-small text-muted">{item}</span>
                </div>
              </CinematicItem>
            ))}
          </CinematicStagger>

        </div>
      </Container>

    </section>
  )
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#C9A84C"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
