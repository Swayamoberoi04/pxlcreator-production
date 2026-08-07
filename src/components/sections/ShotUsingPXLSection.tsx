"use client"

/**
 * src/components/sections/ShotUsingPXLSection.tsx
 *
 * Section 9 — "Real Results. Real Creators."
 *
 * A cinematic 3-image showcase triptych:
 *   left portrait  →  large center feature  →  right portrait
 *
 * ── Architecture (built for future admin / Supabase control) ──────────────
 * This component is intentionally split into three independent layers so that
 * ONLY the data source has to change later — the rendering and styling stay
 * exactly as-is when the images come from the database instead of local files:
 *
 *   1. DATA      → `SHOWCASE_IMAGES` (the `showcaseImages` config array below).
 *                  Later, an admin panel will fetch featured creators from
 *                  Supabase and pass them in via the `images` prop — no UI
 *                  changes required.
 *   2. RENDERING → `<ShowcaseCard />` renders a single card from one data item.
 *   3. STYLING   → all visual styling lives in Tailwind classes on the card /
 *                  layout; the data carries no styling decisions except an
 *                  optional accent colour for the hover glow.
 *
 * Every card already supports: creatorName, presetName, optional location and
 * optional profileLink. These may be empty — the UI degrades gracefully.
 */

import Link                       from "next/link"
import Image                      from "next/image"
import { Container }              from "@/components/layout/Container"
import { GrainOverlay }           from "@/components/ui/GrainOverlay"
import { CinematicBackground }    from "@/components/ui/CinematicBackground"
import { LuminousEnvironment }    from "@/components/ui/LuminousEnvironment"
import { CinematicReveal }        from "@/components/ui/CinematicReveal"

/* ── DATA LAYER ───────────────────────────────────────────────────────────── */

/**
 * One featured-creator showcase entry.
 * This is the exact shape a future Supabase row / admin form will map to,
 * so swapping the data source needs no change to the rendering below.
 */
export interface ShowcaseImage {
  /** Short scene / mood label shown above the creator line. */
  title:        string
  /** Public path or remote URL to the image. */
  image:        string
  /** Accessible description of the image. */
  alt:          string
  /** Name/handle of the creator who shot it (may be empty for now). */
  creatorName:  string
  /** Preset / grade used (may be empty for now). */
  presetName:   string
  /** Optional shoot location. */
  location?:    string
  /** Optional link to the creator's profile. */
  profileLink?: string
  /** Optional hover-glow accent colour (falls back to gold). */
  accent?:      string
}

// TEMP DEMO IMAGES
// Replace with featured creator images later.
//
// Hand-picked cinematic frames from /public/assets that match the premium,
// luxury PXL Creator aesthetic. Order = [ left portrait, center feature,
// right portrait ]. creatorName / location / profileLink are placeholders
// until real featured creators are chosen manually.
const SHOWCASE_IMAGES: ShowcaseImage[] = [
  {
    title:       "Golden Hour",
    image:       "/assets/bg7.webp",
    alt:         "Portrait of a creator bathed in warm golden-hour light",
    creatorName: "@demo.creator",
    presetName:  "Warm Portrait",
    location:    "",
    profileLink: "",
    accent:      "#f59e0b",
  },
  {
    title:       "Midnight Transit",
    image:       "/assets/bg10.webp",
    alt:         "Teal and orange cinematic night scene through a misted window",
    creatorName: "@demo.creator",
    presetName:  "Teal & Orange",
    location:    "",
    profileLink: "",
    accent:      "#38bdf8",
  },
  {
    title:       "Sunset Streets",
    image:       "/assets/bg9.webp",
    alt:         "Golden sunset light spilling across a busy street",
    creatorName: "@demo.creator",
    presetName:  "Sundown",
    location:    "",
    profileLink: "",
    accent:      "#fbbf24",
  },
]

/* ── SECTION ──────────────────────────────────────────────────────────────── */

interface ShotUsingPXLSectionProps {
  /**
   * Showcase entries to render. Defaults to the temporary demo images.
   * Future: an admin page passes DB-backed featured creators here — the
   * rendering and styling below stay untouched.
   */
  images?: ShowcaseImage[]
  title?:    string | null
  subtitle?: string | null
}

export function ShotUsingPXLSection({ images = SHOWCASE_IMAGES, title, subtitle }: ShotUsingPXLSectionProps) {
  /* Triptych roles: first = left portrait, middle = center feature, last = right portrait. */
  const [leftImage, centerImage, rightImage] = images

  return (
    <section
      className="relative w-full overflow-hidden border-y border-border depth-section"
      aria-label="Real results, real creators — shot using PXL Creator presets"
    >
      {/* ── Living luminous atmosphere ── */}
      <LuminousEnvironment variant="teal" intensity={1.1} />
      <CinematicBackground variant="mission" />
      <GrainOverlay opacity={0.018} animated zIndex={2} />

      <Container className="relative z-10 py-24 sm:py-32">

        {/* ── Header ── */}
        <CinematicReveal variant="rise">
          <div className="flex flex-col items-center text-center gap-4 mb-14 sm:mb-16">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/50 animate-gold-flicker" aria-hidden="true" />
              <span className="text-label text-gold/70 tracking-[0.2em] animate-gold-flicker">Shot Using PXL</span>
              <span className="h-px w-8 bg-gold/50 animate-gold-flicker" aria-hidden="true" />
            </div>
            <h2 className="font-display font-bold text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight text-foreground">
              {title ? title : (
                <>Real results.{" "}
                  <span
                    style={{
                      background: "linear-gradient(135deg, #FFD60A 0%, #E0A800 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Real creators.
                  </span>
                </>
              )}
            </h2>
            <p className="text-[0.9375rem] text-muted/85 max-w-sm leading-relaxed">
              {subtitle || "Every image shot and graded by PXL Creator users worldwide."}
            </p>
          </div>
        </CinematicReveal>

        {/* ── Triptych: left portrait · center feature · right portrait ──
             Desktop: center column is wider (1.35fr) and its card is taller,
             so it reads as the dominant "feature". `items-center` lets the
             shorter side portraits float centred against the taller middle,
             giving the classic cinematic triptych depth.
             Mobile: stacks into a single column, center feature first. ── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.35fr_1fr] gap-4 sm:gap-5 md:items-center">

          {/* Left portrait — DOM order maps directly to grid column 1 */}
          {leftImage && (
            <CinematicReveal variant="depth" delay={0.05}>
              <ShowcaseCard item={leftImage} className="aspect-[4/5] md:aspect-[3/4]" />
            </CinematicReveal>
          )}

          {/* Center feature — column 2 (wider), larger + emphasised */}
          {centerImage && (
            <CinematicReveal variant="rise" delay={0}>
              <ShowcaseCard item={centerImage} featured className="aspect-[4/5]" />
            </CinematicReveal>
          )}

          {/* Right portrait — column 3 */}
          {rightImage && (
            <CinematicReveal variant="depth" delay={0.1}>
              <ShowcaseCard item={rightImage} className="aspect-[4/5] md:aspect-[3/4]" />
            </CinematicReveal>
          )}
        </div>

        {/* ── CTA ── */}
        <CinematicReveal variant="rise" delay={0.2}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-14">
            <Link
              href="/store"
              className="inline-flex items-center gap-2.5 rounded-full bg-gold px-8 py-3.5 text-[0.9375rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.97] shadow-[0_0_40px_rgba(255,214,10,0.18)] hover:shadow-[0_0_60px_rgba(255,214,10,0.32)]"
            >
              Get These Looks
            </Link>
            <Link
              href="/store"
              className="group inline-flex items-center gap-2 text-[0.875rem] text-muted/85 hover:text-foreground transition-colors"
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

/* ── RENDERING LAYER ──────────────────────────────────────────────────────── */

interface ShowcaseCardProps {
  item:       ShowcaseImage
  /** Larger, emphasised center card (gold ring + stronger glow). */
  featured?:  boolean
  /** Aspect-ratio / sizing utilities supplied by the layout. */
  className?: string
}

/**
 * Renders a single showcase image with a hover-revealed creator caption.
 * Purely presentational — it knows nothing about where the data came from.
 */
function ShowcaseCard({ item, featured = false, className = "" }: ShowcaseCardProps) {
  const accent = item.accent ?? "#FFD60A"

  const card = (
    <div
      className={[
        "group relative w-full overflow-hidden rounded-2xl depth-card cursor-pointer",
        "border transition-all duration-300 ease-out",
        featured
          ? "border-gold/30 shadow-[0_0_50px_rgba(255,214,10,0.10)] hover:shadow-[0_0_70px_rgba(255,214,10,0.22)]"
          : "border-border hover:border-gold/25 shadow-[0_0_0_rgba(0,0,0,0)] hover:shadow-[0_0_45px_rgba(255,214,10,0.14)]",
        className,
      ].join(" ")}
    >
      {/* Image — fills container, object-cover, lazy-loaded, optimized, never stretched */}
      <Image
        src={item.image}
        alt={item.alt}
        fill
        loading="lazy"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 40vw, 460px"
        className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.05]"
      />

      {/* Cinematic base tint */}
      <div className="absolute inset-0 bg-black/20 transition-opacity duration-300 group-hover:bg-black/10" />

      {/* Gold / accent glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 55%, ${accent}20 0%, transparent 70%)`,
          mixBlendMode: "screen",
        }}
      />

      {/* Caption — creator + preset, revealed on hover */}
      <div
        className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.30) 55%, transparent 100%)" }}
      >
        <div className="p-4 sm:p-5 flex flex-col gap-1.5">
          {item.title && (
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-gold/90">
              {item.title}
            </span>
          )}

          <div className="flex items-end justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              {item.creatorName && (
                <span className="font-display font-bold text-[0.9375rem] text-white leading-tight truncate">
                  {item.creatorName}
                </span>
              )}
              {item.location && (
                <span className="text-[0.75rem] text-white/60 leading-none truncate">
                  {item.location}
                </span>
              )}
            </div>

            {item.presetName && (
              <span
                className="shrink-0 text-[0.625rem] font-bold tracking-widest uppercase rounded-full px-2.5 py-1 border backdrop-blur-sm"
                style={{
                  color:           accent,
                  borderColor:     `${accent}45`,
                  backgroundColor: `${accent}18`,
                }}
              >
                {item.presetName}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  /* Optional profile link wrapper — only when a link is provided. */
  if (item.profileLink) {
    return (
      <Link
        href={item.profileLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={item.creatorName ? `View ${item.creatorName}'s profile` : "View creator profile"}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 rounded-2xl"
      >
        {card}
      </Link>
    )
  }

  return card
}
