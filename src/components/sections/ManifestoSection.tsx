"use client"

/**
 * ManifestoSection.tsx — The PXL Distinction
 *
 * Cinematic upgrade:
 *   • 3D depth reveals on contrast rows and power headline
 *   • AmbientOrbs R3F canvas as background
 * Content unchanged.
 */

import dynamic               from "next/dynamic"
import { Container }         from "@/components/layout/Container"
import { CinematicBackground } from "@/components/ui/CinematicBackground"
import { GrainOverlay }      from "@/components/ui/GrainOverlay"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"
import { ClientOnly }        from "@/components/ui/ClientOnly"

const AmbientOrbs = dynamic(
  () => import("@/components/3d/AmbientOrbs").then((m) => m.AmbientOrbs),
  { ssr: false }
)

const CONTRASTS = [
  { faded: "A filter",  bold: "A signature."  },
  { faded: "Editing",   bold: "Expression."   },
  { faded: "A preset",  bold: "A language."   },
] as const

export function ManifestoSection() {
  return (
    <section className="relative w-full overflow-hidden border-y border-border bg-surface depth-section">

      {/* ── 3D ambient orbs canvas — ClientOnly prevents SSR tree mismatch ── */}
      <ClientOnly>
        <div aria-hidden="true" className="absolute inset-0 z-[1] pointer-events-none opacity-60">
          <AmbientOrbs />
        </div>
      </ClientOnly>

      {/* ── CSS atmosphere ── */}
      <CinematicBackground variant="manifesto" />
      <GrainOverlay opacity={0.025} animated zIndex={2} />

      {/* Thin gold rules */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0    h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent z-[2]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent z-[2]" />

      {/* Edge light leaks */}
      <div aria-hidden="true" className="absolute inset-y-0 left-0  w-px bg-gradient-to-b from-transparent via-gold/15 to-transparent z-[2]" />
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gold/10 to-transparent z-[2]" />

      <Container className="relative z-[10] py-24 sm:py-36">
        <div className="flex flex-col items-center text-center gap-14 max-w-3xl mx-auto">

          {/* ── Eyebrow ── */}
          <CinematicReveal variant="rise">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/50 animate-gold-flicker" aria-hidden="true" />
              <span className="text-label text-gold/70 tracking-[0.2em] animate-gold-flicker">The PXL Distinction</span>
              <span className="h-px w-8 bg-gold/50 animate-gold-flicker" aria-hidden="true" />
            </div>
          </CinematicReveal>

          {/* ── 3 punchy contrast lines — each enters with depth ── */}
          <CinematicStagger
            stagger={0.14}
            baseDelay={0.05}
            itemVariant="depth"
            className="flex flex-col gap-0 w-full max-w-xl"
          >
            {CONTRASTS.map(({ faded, bold }) => (
              <CinematicItem key={bold} variant="depth">
                <div className="flex items-center justify-between gap-8 py-7 border-b border-border/40 group">
                  {/* Faded / "wrong" side */}
                  <span className="text-[1.0625rem] sm:text-[1.25rem] text-muted/25 line-through font-medium leading-none">
                    {faded}
                  </span>
                  {/* Arrow separator */}
                  <span className="text-gold/30 text-[0.75rem] shrink-0" aria-hidden="true">→</span>
                  {/* Bold / "right" side */}
                  <span className="text-[1.25rem] sm:text-[1.5rem] font-display font-black text-foreground leading-none">
                    {bold}
                  </span>
                </div>
              </CinematicItem>
            ))}
          </CinematicStagger>

          {/* ── Power headline — deepest 3D entrance ── */}
          <CinematicReveal variant="depth" delay={0.15}>
            <h2
              className="font-display font-black leading-[1.05] tracking-tight text-[clamp(2rem,5.5vw,3.5rem)]"
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #ffd700 45%, #e5a227 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              One look.<br className="hidden sm:block" /> One identity.<br />
              Unmistakably yours.
            </h2>
          </CinematicReveal>

        </div>
      </Container>
    </section>
  )
}
