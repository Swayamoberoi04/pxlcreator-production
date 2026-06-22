/**
 * src/components/sections/GiveawayBanner.tsx
 *
 * Homepage giveaway CTA strip â€” sits between PhilosophyStrip and CTABanner.
 * Compact, gold-accented, drives traffic to /giveaway.
 */

import Link                    from "next/link"
import { Container }           from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export function GiveawayBanner() {
  return (
    <section
      aria-label="Giveaway"
      className="relative w-full bg-background border-t border-border overflow-hidden"
    >
      <LuminousEnvironment variant="gold" intensity={0.45} />
      <GrainOverlay opacity={0.014} zIndex={1} />

      {/* Top accent */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent z-[2]"
      />

      <Container className="relative z-10 py-10 sm:py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">

          {/* Left: copy */}
          <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left">
            <div className="flex items-center gap-2.5">
              {/* Pulsing live dot */}
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
              </span>
              <span className="text-label text-gold/80 tracking-widest">Giveaway Live</span>
            </div>

            <h2 className="font-display font-black text-[1.25rem] sm:text-[1.5rem] leading-tight text-foreground">
              Win a{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #FFD60A 0%, #E0A800 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                $256 creator bundle
              </span>
              {" "}â€” free.
            </h2>

            <p className="text-[0.9375rem] text-muted/70 max-w-md leading-relaxed">
              Preset pack, masterclass, and a live 1-on-1 edit session.
              Three simple steps to enter.
            </p>
          </div>

          {/* Right: CTA */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <Link
              href="/giveaway"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3 text-[0.9375rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap"
            >
              Enter the Giveaway
              <span aria-hidden="true">â†’</span>
            </Link>
            <p className="text-[0.78rem] text-muted/40">
              No purchase necessary Â· Closes June 27
            </p>
          </div>

        </div>
      </Container>

      {/* Bottom accent */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent z-[2]"
      />
    </section>
  )
}

