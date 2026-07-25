import Link                                      from "next/link"
import { Container }                             from "@/components/layout/Container"
import { CinematicBackground }                   from "@/components/ui/CinematicBackground"
import { GrainOverlay }                          from "@/components/ui/GrainOverlay"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"
import { AnimatedMockCard }                      from "@/components/store/AnimatedMockCard"

/* ─────────────────────────────────────────────────────────────
   AI Studio Banner — homepage section
   Sits between FeaturedSection and SocialProofSection.
   Server Component with client sub-components for animations.
───────────────────────────────────────────────────────────── */

const STEPS = [
  { icon: "↑", label: "Upload photo"      },
  { icon: "◈", label: "Describe the vibe" },
  { icon: "✦", label: "Get your edit"     },
] as const

export function AIStudioBanner() {
  return (
    <section className="relative w-full overflow-hidden bg-surface border-t border-border depth-section">

      {/* ── Cinematic AI atmosphere ── */}
      <CinematicBackground variant="ai-studio" />

      {/* ── Film grain ── */}
      <GrainOverlay opacity={0.022} animated zIndex={2} />

      {/* ── AI holographic beam — horizontal ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden z-[1]"
      >
        <div
          className="absolute anim-beam"
          style={{
            top:        "35%",
            left:       "-30%",
            width:      "55%",
            height:     "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(61,122,138,0.25) 40%, rgba(255,214,10,0.18) 60%, transparent 100%)",
            animation:  "beam-scan 7s ease-in-out infinite",
            animationDelay: "1.2s",
            willChange: "transform",
          }}
        />
        <div
          className="absolute anim-beam"
          style={{
            top:        "62%",
            left:       "-30%",
            width:      "45%",
            height:     "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(61,122,138,0.20) 50%, transparent 100%)",
            animation:  "beam-scan 9s ease-in-out infinite",
            animationDelay: "3.5s",
            willChange: "transform",
          }}
        />
      </div>

      <Container className="relative z-[10] py-24 sm:py-32">
        <div className="grid lg:grid-cols-[1fr_420px] gap-14 lg:gap-20 items-center">

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              LEFT — Content
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <div className="flex flex-col gap-7">

            {/* Badge */}
            <CinematicReveal variant="rise">
              <div className="flex items-center gap-2.5 w-fit">
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-[#6366f1]/30 bg-[#6366f1]/10 px-3.5 py-1.5 text-[0.75rem] font-semibold tracking-widest text-[#a5b4fc] uppercase"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a5b4fc] opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#a5b4fc]" />
                  </span>
                  New Feature
                </span>
                <span className="text-[0.75rem] text-muted/85 font-medium">Powered by GPT-4o Vision</span>
              </div>
            </CinematicReveal>

            {/* Headline — deep 3D entrance */}
            <CinematicReveal variant="depth" delay={0.08}>
              <div className="flex flex-col gap-3">
                <h2
                  className="font-display font-black text-foreground uppercase leading-[0.92] tracking-[-0.02em]"
                  style={{ fontSize: "clamp(2.4rem, 5.5vw, 4.5rem)" }}
                >
                  Describe{" "}
                  <span className="text-gold logo-glow">the look.</span>
                  <br />
                  AI does{" "}
                  <span
                    style={{
                      background: "linear-gradient(135deg, #a5b4fc 0%, #818cf8 40%, #FFD60A 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    the edit.
                  </span>
                </h2>
              </div>
            </CinematicReveal>

            {/* Subtitle */}
            <CinematicReveal variant="rise" delay={0.14}>
              <p className="text-[1rem] sm:text-[1.0625rem] text-muted leading-relaxed max-w-lg">
                Upload any photo, type the vibe you&apos;re going for, and PXL&apos;s AI
                applies a cinematic grade — then recommends the exact preset that
                nails that look permanently.
              </p>
            </CinematicReveal>

            {/* 3-step flow — each step depth-enters in sequence */}
            <CinematicStagger stagger={0.10} baseDelay={0.18} itemVariant="rise" className="flex items-center gap-0 flex-wrap">
              {STEPS.map((step, i) => (
                <CinematicItem key={step.label} variant="rise">
                  <div className="flex items-center gap-0">
                    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background/60 backdrop-blur-sm px-4 py-2.5 hover:border-gold/25 hover:bg-gold/[0.04] transition-colors">
                      <span className="text-gold text-[0.8125rem] font-bold w-4 text-center leading-none" aria-hidden="true">
                        {step.icon}
                      </span>
                      <span className="text-[0.8125rem] font-medium text-foreground/92 whitespace-nowrap">
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex items-center px-1.5" aria-hidden="true">
                        <div className="h-px w-5 border-t border-dashed border-muted/30" />
                        <svg width="6" height="6" viewBox="0 0 6 6" className="text-muted/70 shrink-0 -ml-px">
                          <path d="M0 3h5M3 0l3 3-3 3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </CinematicItem>
              ))}
            </CinematicStagger>

            {/* CTA row */}
            <CinematicReveal variant="rise" delay={0.22}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link
                  href="/studio"
                  className="group inline-flex items-center gap-2.5 rounded-full bg-gold px-8 py-3.5 text-[0.9375rem] font-semibold text-background transition-all duration-200 hover:bg-gold-dim active:scale-[0.97] shadow-[0_0_40px_rgba(255,214,10,0.22)] hover:shadow-[0_0_60px_rgba(255,214,10,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Try AI Studio
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
                    →
                  </span>
                </Link>

                <div className="flex items-center gap-4 text-[0.8125rem] text-muted/85">
                  {["Free to try", "~10 seconds", "No account needed"].map((item, i) => (
                    <span key={item} className="flex items-center gap-1.5">
                      {i > 0 && <span className="h-3 w-px bg-border" aria-hidden="true" />}
                      {i > 0 && item}
                      {i === 0 && item}
                    </span>
                  ))}
                </div>
              </div>
            </CinematicReveal>

          </div>

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              RIGHT — Animated mock card
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <CinematicReveal variant="depth" delay={0.1} className="hidden lg:block">
            <AnimatedMockCard />
          </CinematicReveal>

        </div>
      </Container>

      {/* ── Bottom gradient rule ── */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent z-[2]"
      />

    </section>
  )
}


