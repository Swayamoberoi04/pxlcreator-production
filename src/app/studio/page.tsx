import type { Metadata } from "next"
import { Container }    from "@/components/layout/Container"
import { StudioShell }  from "@/components/studio/StudioShell"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"
import { CinematicBackground } from "@/components/ui/CinematicBackground"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

/* ── SEO ── */
export const metadata: Metadata = {
  title: "AI Studio — Describe the look. AI does the edit.",
  description:
    "Upload any photo and describe the mood in plain English. PXL Vision AI analyses your image, applies a custom colour grade, and recommends the PXL preset that matches it best.",
}

export default function StudioPage() {
  return (
    <div className="w-full bg-background">

      {/* ────────────────────────────────────────────────────────
          HERO BAND
          Living luminous atmosphere: indigo + gold dual orbs.
          Mirrors the AIStudioBanner palette for visual coherence.
      ──────────────────────────────────────────────────────── */}
      <div className="relative w-full border-b border-border overflow-hidden depth-section">

        {/* Living luminous atmosphere */}
        <LuminousEnvironment variant="indigo" intensity={1.15} />
        <CinematicBackground variant="mission" />
        <GrainOverlay opacity={0.019} animated zIndex={2} />

        {/* Edge rules */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#6366f1]/30 to-transparent z-[3]" />

        <Container className="relative z-10 py-16 sm:py-24">
          <div className="flex flex-col items-center text-center gap-5 max-w-2xl mx-auto">

            {/* Label pill */}
            <CinematicReveal variant="rise">
              <div className="flex items-center gap-2 rounded-full border border-[#6366f1]/30 bg-[#6366f1]/8 px-4 py-1.5">
                <SparkIcon />
                <span className="text-[0.75rem] font-semibold tracking-widest uppercase text-[#a5b4fc]">
                  AI Studio · Beta
                </span>
              </div>
            </CinematicReveal>

            {/* Headline */}
            <CinematicReveal variant="depth" delay={0.07}>
              <h1 className="font-display font-black text-foreground text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] tracking-tight">
                Describe the look.{" "}
                <br className="hidden sm:block" />
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(90deg, #6366f1 0%, #C9A84C 100%)",
                  }}
                >
                  AI does the edit.
                </span>
              </h1>
            </CinematicReveal>

            {/* Subheadline */}
            <CinematicReveal variant="rise" delay={0.14}>
              <p className="text-lead max-w-lg">
                Upload any photo, write what mood you&apos;re after — PXL Vision AI reads your image,
                applies a custom colour grade, and recommends the preset that matches it best.
              </p>
            </CinematicReveal>

            {/* Quick step indicators */}
            <CinematicStagger stagger={0.09} baseDelay={0.18} itemVariant="rise" className="flex items-center gap-3 mt-1 flex-wrap justify-center">
              {STEPS.map((step, i) => (
                <CinematicItem key={step} variant="rise">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full border border-[#6366f1]/40 bg-[#6366f1]/10 text-[0.65rem] font-bold text-[#a5b4fc]">
                        {i + 1}
                      </span>
                      <span className="text-[0.8125rem] text-muted/60 font-medium">{step}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <span className="text-muted/25 text-[0.75rem]" aria-hidden="true">→</span>
                    )}
                  </div>
                </CinematicItem>
              ))}
            </CinematicStagger>

          </div>
        </Container>
      </div>

      {/* ────────────────────────────────────────────────────────
          STUDIO SHELL — the full interactive tool
      ──────────────────────────────────────────────────────── */}
      <div className="relative">
        <LuminousEnvironment variant="indigo" intensity={0.5} />
        <Container className="relative z-10 py-10 sm:py-14">
          <StudioShell />
        </Container>
      </div>

      {/* ────────────────────────────────────────────────────────
          FINE PRINT
      ──────────────────────────────────────────────────────── */}
      <div className="border-t border-border">
        <Container className="py-6">
          <p className="text-center text-[0.75rem] text-muted/35 leading-relaxed max-w-lg mx-auto">
            PXL Vision AI · Images are processed in-memory and never stored ·
            5 edits / hour per session · Results are approximate — real Lightroom presets
            give the full look.
          </p>
        </Container>
      </div>

    </div>
  )
}

/* ── Data ── */
const STEPS = ["Upload photo", "Describe the mood", "Download your edit"] as const

/* ── Icon ── */
function SparkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[#a5b4fc]"
      aria-hidden="true"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  )
}


