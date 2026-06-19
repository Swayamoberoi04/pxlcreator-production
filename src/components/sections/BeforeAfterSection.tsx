/**
 * src/components/sections/BeforeAfterSection.tsx
 *
 * "See The Difference" interactive section — real before/after image pairs
 * with drag-to-compare sliders.
 *
 * Five pairs available:
 *   fr, garage, tropical, documentary, hdrbw
 *
 * Layout:
 *   - One large hero slider (fr / "Golden Hour") spans full width at top
 *   - 2×2 grid of smaller sliders below
 *   - Browse CTA at the bottom
 *
 * Replaces the pure CSS-gradient AestheticShowcaseSection as the
 * primary "transformation proof" moment in the scroll journey.
 */
import Link                from "next/link"
import { Container }       from "@/components/layout/Container"
import { GrainOverlay }    from "@/components/ui/GrainOverlay"
import { CinematicBackground }  from "@/components/ui/CinematicBackground"
import { LuminousEnvironment }  from "@/components/ui/LuminousEnvironment"
import { BeforeAfterSlider }    from "@/components/ui/BeforeAfterSlider"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

/* ── Preset pairs config ─────────────────────────────────────── */
const HERO_PAIR = {
  beforeSrc:   "/assets/fr_before.webp",
  afterSrc:    "/assets/fr_after.webp",
  alt:         "Film Rich preset",
  label:       "Film Rich — Warm Analog Grade",
  accentColor: "#C9A84C",
}

const GRID_PAIRS = [
  {
    beforeSrc:   "/assets/garage_before.webp",
    afterSrc:    "/assets/garage_after.webp",
    alt:         "Garage preset",
    label:       "Garage — Gritty Urban",
    accentColor: "#f97316",
  },
  {
    beforeSrc:   "/assets/tropical_before.webp",
    afterSrc:    "/assets/tropical_after.webp",
    alt:         "Tropical preset",
    label:       "Tropical — Vivid & Lush",
    accentColor: "#10b981",
  },
  {
    beforeSrc:   "/assets/documentary_before.webp",
    afterSrc:    "/assets/documentary_after.webp",
    alt:         "Documentary preset",
    label:       "Documentary — Raw Realism",
    accentColor: "#94a3b8",
  },
  {
    beforeSrc:   "/assets/hdrbw_before.webp",
    afterSrc:    "/assets/hdrbw_after.webp",
    alt:         "HDR B&W preset",
    label:       "HDR B&W — High Contrast",
    accentColor: "#e2e8f0",
  },
]

export function BeforeAfterSection() {
  return (
    <section
      className="relative w-full overflow-hidden bg-background border-y border-border depth-section"
      aria-label="Before and after preset comparisons"
    >
      {/* Atmosphere */}
      <LuminousEnvironment variant="gold" intensity={0.85} />
      <CinematicBackground variant="default" />
      <GrainOverlay opacity={0.020} animated zIndex={1} />

      <Container className="relative z-10 py-24 sm:py-32">

        {/* ── Section header ── */}
        <CinematicReveal variant="rise">
          <div className="flex flex-col items-center text-center gap-4 mb-14 sm:mb-16">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/50 animate-gold-flicker" aria-hidden="true" />
              <span className="text-label text-gold/70 tracking-[0.2em] animate-gold-flicker">See The Difference</span>
              <span className="h-px w-8 bg-gold/50 animate-gold-flicker" aria-hidden="true" />
            </div>
            <h2 className="font-display font-black text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight text-foreground">
              Every mood.{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #C9A84C 0%, #A8893A 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                One click.
              </span>
            </h2>
            <p className="text-[0.9375rem] text-muted/55 max-w-md leading-relaxed">
              Drag the handle on any card to reveal the cinematic grade.
            </p>
          </div>
        </CinematicReveal>

        {/* ── Hero slider ── */}
        <CinematicReveal variant="depth" className="mb-4 sm:mb-5">
          <BeforeAfterSlider
            {...HERO_PAIR}
            height={460}
            className="w-full"
          />
        </CinematicReveal>

        {/* ── 2×2 grid ── */}
        <CinematicStagger
          stagger={0.1}
          baseDelay={0.05}
          itemVariant="depth"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5"
        >
          {GRID_PAIRS.map((pair) => (
            <CinematicItem key={pair.alt} variant="depth">
              <BeforeAfterSlider
                {...pair}
                height={320}
                className="w-full"
              />
            </CinematicItem>
          ))}
        </CinematicStagger>

        {/* ── Browse CTA ── */}
        <CinematicReveal variant="rise" delay={0.25}>
          <div className="flex justify-center mt-12">
            <Link
              href="/store"
              className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-surface px-7 py-3 text-[0.9375rem] font-semibold text-muted/70 hover:border-gold/30 hover:text-foreground transition-all duration-200"
            >
              Browse all presets
              <span className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">→</span>
            </Link>
          </div>
        </CinematicReveal>

      </Container>
    </section>
  )
}
