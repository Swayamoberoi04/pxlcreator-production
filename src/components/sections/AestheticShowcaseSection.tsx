/**
 * src/components/sections/AestheticShowcaseSection.tsx
 *
 * Visual-heavy "see what's possible" editorial moment.
 * Sits after the product grid, before the manifesto statement.
 *
 * Uses real before/after image pairs for immediate, credible
 * visual proof of the preset's impact — no placeholder gradients.
 *
 * Static split (not interactive drag — that lives in BeforeAfterSection
 * further down the page). This section is purely atmospheric and fast:
 * visitors scroll through and immediately feel the transformation.
 */
import Link                from "next/link"
import Image               from "next/image"
import { Container }       from "@/components/layout/Container"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"
import { GrainOverlay }    from "@/components/ui/GrainOverlay"
import { CinematicBackground } from "@/components/ui/CinematicBackground"

/* ── Aesthetic card data ────────────────────────────────────── */
interface AestheticPreset {
  id:          string
  name:        string
  mood:        string
  category:    string
  beforeSrc:   string
  afterSrc:    string
  accentColor: string
}

const AESTHETICS: AestheticPreset[] = [
  {
    id:          "tropical",
    name:        "Tropical",
    mood:        "Vivid · Lush",
    category:    "Landscape",
    beforeSrc:   "/assets/tropical_before.webp",
    afterSrc:    "/assets/tropical_after.webp",
    accentColor: "#10b981",
  },
  {
    id:          "noir",
    name:        "HDR B&W",
    mood:        "High Contrast · Drama",
    category:    "Portrait",
    beforeSrc:   "/assets/hdrbw_before.webp",
    afterSrc:    "/assets/hdrbw_after.webp",
    accentColor: "#e2e8f0",
  },
  {
    id:          "garage",
    name:        "Garage",
    mood:        "Gritty · Urban",
    category:    "Street",
    beforeSrc:   "/assets/garage_before.webp",
    afterSrc:    "/assets/garage_after.webp",
    accentColor: "#f97316",
  },
  {
    id:          "documentary",
    name:        "Documentary",
    mood:        "Raw · Honest",
    category:    "Film",
    beforeSrc:   "/assets/documentary_before.webp",
    afterSrc:    "/assets/documentary_after.webp",
    accentColor: "#94a3b8",
  },
]

/* ── Component ──────────────────────────────────────────────── */
export function AestheticShowcaseSection() {
  return (
    <section className="relative w-full overflow-hidden bg-background border-b border-border depth-section">

      {/* Atmospheric layer */}
      <CinematicBackground variant="default" />
      <GrainOverlay opacity={0.020} animated zIndex={1} />

      <Container className="relative z-10 py-24 sm:py-32">

        {/* ── Section header ── */}
        <CinematicReveal variant="rise">
          <div className="flex flex-col items-center text-center gap-4 mb-14 sm:mb-16">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/50 animate-gold-flicker" aria-hidden="true" />
              <span className="text-label text-gold/70 tracking-[0.2em] animate-gold-flicker">The Transformation</span>
              <span className="h-px w-8 bg-gold/50 animate-gold-flicker" aria-hidden="true" />
            </div>
            <h2
              className="font-display font-black text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight text-foreground"
            >
              Before meets{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #FFD60A 0%, #E0A800 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                after.
              </span>
            </h2>
          </div>
        </CinematicReveal>

        {/* ── Showcase grid: 2×2 on desktop, 1-col on mobile ── */}
        <CinematicStagger
          stagger={0.12}
          baseDelay={0.05}
          itemVariant="depth"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5"
        >
          {AESTHETICS.map((a) => (
            <CinematicItem key={a.id} variant="depth">
              <AestheticCard preset={a} />
            </CinematicItem>
          ))}
        </CinematicStagger>

        {/* ── Browse CTA ── */}
        <CinematicReveal variant="rise" delay={0.25}>
          <div className="flex justify-center mt-12">
            <Link
              href="/store"
              className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-surface px-7 py-3 text-[0.9375rem] font-semibold text-muted/92 hover:border-gold/30 hover:text-foreground transition-all duration-200"
            >
              Explore all aesthetics
              <span className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">→</span>
            </Link>
          </div>
        </CinematicReveal>

      </Container>
    </section>
  )
}

/* ── Static Before / After card ─────────────────────────────── */
function AestheticCard({ preset }: { preset: AestheticPreset }) {
  return (
    <div className="relative rounded-2xl overflow-hidden group depth-card" style={{ height: "340px" }}>

      {/* ── Before half (left 48%) ── */}
      <div className="absolute left-0 top-0 bottom-0 w-[48%] overflow-hidden">
        <Image
          src={preset.beforeSrc}
          alt={`${preset.name} — before`}
          fill
          sizes="25vw"
          className="object-cover object-center"
        />
        {/* "Unedited" desaturated feel */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(190,200,215,0.08) 0%, transparent 70%)" }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(10,14,20,0.25)" }} />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%)" }} />
        {/* Before label */}
        <div className="absolute top-3 left-3 z-10">
          <span className="text-[0.65rem] font-semibold tracking-widest uppercase text-white/70 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1">
            Before
          </span>
        </div>
      </div>

      {/* ── After half (right 52%) ── */}
      <div className="absolute right-0 top-0 bottom-0 w-[52%] overflow-hidden">
        <Image
          src={preset.afterSrc}
          alt={`${preset.name} — after`}
          fill
          sizes="25vw"
          className="object-cover object-center"
        />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(0,0,0,0.55) 100%)" }} />
        {/* After label */}
        <div className="absolute top-3 right-3 z-10">
          <span
            className="text-[0.65rem] font-bold tracking-widest uppercase rounded-full px-2.5 py-1 border backdrop-blur-sm"
            style={{
              color:           preset.accentColor,
              borderColor:     `${preset.accentColor}40`,
              backgroundColor: `${preset.accentColor}18`,
            }}
          >
            After
          </span>
        </div>
      </div>

      {/* ── Divider line ── */}
      <div
        className="absolute top-0 bottom-0 z-10 w-[2px]"
        style={{
          left:       "calc(48% - 1px)",
          background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.35) 20%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.35) 80%, transparent 100%)",
        }}
      />
      {/* Divider handle */}
      <div
        className="absolute z-10 w-7 h-7 rounded-full bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center"
        style={{ left: "calc(48% - 14px)", top: "50%", transform: "translateY(-50%)" }}
        aria-hidden="true"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M3 2L1 5L3 8M7 2L9 5L7 8" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* ── Bottom info bar ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 px-4 py-4"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.40) 70%, transparent 100%)" }}
      >
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="font-display font-bold text-[1rem] text-white leading-none">{preset.name}</h3>
            <span className="text-[0.72rem] text-white/85">{preset.mood}</span>
          </div>
          <span
            className="text-[0.65rem] font-bold tracking-widest uppercase rounded-full px-2.5 py-1 border shrink-0"
            style={{
              color:           preset.accentColor,
              borderColor:     `${preset.accentColor}35`,
              backgroundColor: `${preset.accentColor}15`,
            }}
          >
            {preset.category}
          </span>
        </div>
      </div>

      {/* ── Hover glow ── */}
      <div
        className="absolute inset-0 z-[5] pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${preset.accentColor}10 0%, transparent 70%)`,
        }}
      />
    </div>
  )
}


