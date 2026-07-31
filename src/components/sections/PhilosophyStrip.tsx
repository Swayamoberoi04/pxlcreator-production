"use client"

/**
 * PhilosophyStrip.tsx — Why PXL Creator + Vision Closer
 *
 * Cinematic upgrade:
 *   • Pillar cards enter with CinematicStagger depth reveal
 *   • Vision headline uses CinematicReveal
 *   • Pills enter with staggered rise
 *   • depth-card CSS on pillar cards for hover depth
 *   • depth-section pseudo-borders on both halves
 * Content unchanged.
 */

import Link                         from "next/link"
import { Container }                from "@/components/layout/Container"
import { CinematicBackground }      from "@/components/ui/CinematicBackground"
import { GrainOverlay }             from "@/components/ui/GrainOverlay"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

/* ── Three core brand pillars ── */
const PILLARS = [
  {
    icon:  "◈",
    title: "Creative Identity",
    line:  "Build a signature look that's recognisably, undeniably you.",
    glow:  "rgba(255,214,10,0.10)",
    border: "rgba(255,214,10,0.15)",
    iconColor: "text-gold",
  },
  {
    icon:  "✦",
    title: "AI-Powered Editing",
    line:  "Upload a photo. Describe the vibe. Watch your vision come alive in seconds.",
    glow:  "rgba(61,122,138,0.10)",
    border: "rgba(61,122,138,0.18)",
    iconColor: "text-[#a5b4fc]",
  },
  {
    icon:  "▸",
    title: "Cinematic Systems",
    line:  "A cohesive visual language for every shoot — not just random filters.",
    glow:  "rgba(255,214,10,0.06)",
    border: "rgba(255,255,255,0.07)",
    iconColor: "text-gold/70",
  },
] as const

export function PhilosophyStrip() {
  return (
    <section className="relative w-full bg-background" aria-label="Why PXL Creator">

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          PART A — 3 Pillars
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="relative w-full overflow-hidden border-y border-border bg-background depth-section">

        <CinematicBackground variant="mission" />
        <GrainOverlay opacity={0.018} animated zIndex={1} />

        <Container className="relative z-10 py-24 sm:py-32">
          <div className="flex flex-col items-center text-center gap-14">

            {/* Header */}
            <CinematicReveal variant="rise">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-px w-8 bg-gold/50" aria-hidden="true" />
                  <span className="text-label text-gold/70 tracking-[0.2em]">Why PXL Creator</span>
                  <span className="h-px w-8 bg-gold/50" aria-hidden="true" />
                </div>
                <h2 className="font-display font-bold text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05] tracking-tight text-foreground">
                  Not tools.{" "}
                  <span
                    style={{
                      background: "linear-gradient(135deg, #FFD60A 0%, #E0A800 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    An ecosystem.
                  </span>
                </h2>
              </div>
            </CinematicReveal>

            {/* Pillar cards — 3D stagger depth reveal */}
            <CinematicStagger
              stagger={0.13}
              baseDelay={0.05}
              itemVariant="depth"
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl"
            >
              {PILLARS.map((p) => (
                <CinematicItem key={p.title} variant="depth">
                  <div
                    className="depth-card relative flex flex-col gap-5 rounded-2xl border p-8 overflow-hidden text-left h-full cursor-default"
                    style={{
                      borderColor:     p.border,
                      backgroundColor: p.glow,
                      backdropFilter:  "blur(12px)",
                    }}
                  >
                    {/* Top glow line */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-px"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${
                          p.glow.replace("0.10)", "0.60)").replace("0.06)", "0.30)")
                        }, transparent)`
                      }}
                    />

                    {/* Corner accent */}
                    <div aria-hidden="true" className="absolute top-3 right-3 w-6 h-6 opacity-20">
                      <div className="w-full h-px bg-current" style={{ color: p.border }} />
                      <div className="w-px h-full bg-current absolute top-0 right-0" style={{ color: p.border }} />
                    </div>

                    {/* Icon */}
                    <span className={`text-[1.5rem] leading-none ${p.iconColor}`} aria-hidden="true">
                      {p.icon}
                    </span>

                    {/* Title */}
                    <h3 className="font-display font-bold text-[1rem] text-foreground leading-snug">
                      {p.title}
                    </h3>

                    {/* One-line description */}
                    <p className="text-[0.875rem] text-muted/85 leading-relaxed">
                      {p.line}
                    </p>
                  </div>
                </CinematicItem>
              ))}
            </CinematicStagger>

            {/* Subtle "read more" philosophy link */}
            <CinematicReveal variant="rise" delay={0.2}>
              <Link
                href="/about"
                className="text-[0.8125rem] text-muted/70 hover:text-gold/70 transition-colors duration-200 tracking-wide"
              >
                Our full story & philosophy →
              </Link>
            </CinematicReveal>

          </div>
        </Container>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          PART B — Cinematic Vision Closer
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="relative w-full overflow-hidden bg-surface depth-section">

        <CinematicBackground variant="dark" />
        <GrainOverlay opacity={0.022} animated zIndex={1} />

        {/* Rising gold haze from below */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% 110%, rgba(255,214,10,0.07) 0%, transparent 65%)" }}
        />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent z-[2]" />

        <Container className="relative z-[10] py-28 sm:py-40">
          <div className="flex flex-col items-center text-center gap-10 max-w-3xl mx-auto">

            {/* Vision headline */}
            <CinematicReveal variant="depth">
              <div className="flex flex-col gap-3">
                <p className="text-[0.75rem] font-bold tracking-[0.28em] uppercase text-muted/70">
                  Where we&apos;re going
                </p>
                <h2
                  className="font-display font-bold text-[clamp(2rem,6vw,4rem)] leading-[1.02] tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #ffffff 0%, #FFD60A 50%, #E0A800 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Not a preset store.<br />
                  A creative operating<br />
                  system for your generation.
                </h2>
              </div>
            </CinematicReveal>

            {/* Pillars — staggered rise */}
            <CinematicStagger
              stagger={0.07}
              baseDelay={0.1}
              itemVariant="rise"
              className="flex flex-wrap justify-center gap-2.5"
            >
              {VISION_PILLARS.map((p) => (
                <CinematicItem key={p} variant="rise">
                  <div className="rounded-full border border-gold/15 bg-gold/[0.06] px-5 py-2 text-[0.8125rem] font-semibold text-gold/80 hover:border-gold/28 hover:bg-gold/[0.10] transition-colors cursor-default">
                    {p}
                  </div>
                </CinematicItem>
              ))}
            </CinematicStagger>

            {/* CTAs */}
            <CinematicReveal variant="rise" delay={0.15}>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/presets"
                  className="inline-flex items-center gap-2.5 rounded-full bg-gold px-8 py-3.5 text-[0.9375rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.97] shadow-[0_0_40px_rgba(255,214,10,0.2)] hover:shadow-[0_0_56px_rgba(255,214,10,0.32)]"
                >
                  Start Building Your Identity
                  <ArrowRight />
                </Link>
                <Link
                  href="/studio"
                  className="inline-flex items-center gap-2.5 rounded-full border border-border px-8 py-3.5 text-[0.9375rem] font-medium text-muted transition-all hover:border-gold/40 hover:text-foreground"
                >
                  Try AI Studio
                </Link>
              </div>
            </CinematicReveal>

          </div>
        </Container>

        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent z-[2]" />
      </div>

    </section>
  )
}

const VISION_PILLARS = [
  "Cinematic Identity",
  "Creative Ecosystem",
  "Aesthetic Education",
  "Modern Visual Culture",
]

function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}


