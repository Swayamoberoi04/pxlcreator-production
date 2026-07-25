/**
 * src/components/sections/ShotUsingPXLSection.tsx
 *
 * "Shot Using PXL" — cinematic creator gallery.
 *
 * Purpose: social-proof through visual excellence.
 * Visitors see finished work and think "I want my photos to look like that."
 *
 * Layout (masonry-inspired, pure CSS grid):
 *   Desktop — 3-column asymmetric grid: tall / short / tall alternating
 *   Mobile  — 2-column even grid
 *
 * Each card shows:
 *   - Full-bleed image with cinematic tint overlay
 *   - Bottom hover reveal: preset name + category badge
 *   - Subtle hover scale + glow
 */
import Link                from "next/link"
import Image               from "next/image"
import { Container }       from "@/components/layout/Container"
import { GrainOverlay }    from "@/components/ui/GrainOverlay"
import { CinematicBackground }  from "@/components/ui/CinematicBackground"
import { LuminousEnvironment }  from "@/components/ui/LuminousEnvironment"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

/* ── Gallery images ─────────────────────────────────────────── */
interface GalleryImage {
  src:      string
  alt:      string
  preset:   string
  category: string
  accent:   string
  tall?:    boolean   // if true → taller card in the desktop grid
}

const GALLERY: GalleryImage[] = [
  {
    src:      "/assets/moody_city.webp",
    alt:      "Moody city street at night",
    preset:   "Noir Night",
    category: "Urban",
    accent:   "#818cf8",
    tall:     true,
  },
  {
    src:      "/assets/portrait_bw.webp",
    alt:      "Black and white portrait",
    preset:   "HDR B&W",
    category: "Portrait",
    accent:   "#e2e8f0",
  },
  {
    src:      "/assets/magical_sunset.webp",
    alt:      "Magical cinematic sunset",
    preset:   "Film Rich",
    category: "Landscape",
    accent:   "#FFD60A",
    tall:     true,
  },
  {
    src:      "/assets/dramatic_city.webp",
    alt:      "Dramatic cityscape",
    preset:   "Dramatic City",
    category: "Cinematic",
    accent:   "#f97316",
  },
  {
    src:      "/assets/campfire.webp",
    alt:      "Campfire in forest at dusk",
    preset:   "Timber Warmth",
    category: "Lifestyle",
    accent:   "#f59e0b",
    tall:     true,
  },
  {
    src:      "/assets/film_green.webp",
    alt:      "Film green analog grade",
    preset:   "Film Green",
    category: "Film",
    accent:   "#10b981",
  },
  {
    src:      "/assets/dark_blue.webp",
    alt:      "Deep blue cinematic grade",
    preset:   "Cinematic Blue",
    category: "Cinematic",
    accent:   "#60a5fa",
  },
  {
    src:      "/assets/moody_brown.webp",
    alt:      "Moody warm brown tones",
    preset:   "Moody Brown",
    category: "Portrait",
    accent:   "#b45309",
    tall:     true,
  },
  {
    src:      "/assets/urban.webp",
    alt:      "Urban street photography",
    preset:   "Urban Fade",
    category: "Street",
    accent:   "#94a3b8",
  },
  {
    src:      "/assets/motography.webp",
    alt:      "Motion photography",
    preset:   "Motion Blur",
    category: "Creative",
    accent:   "#a78bfa",
    tall:     true,
  },
  {
    src:      "/assets/cinematic.webp",
    alt:      "Cinematic grade landscape",
    preset:   "Cinematic Gold",
    category: "Landscape",
    accent:   "#fbbf24",
  },
  {
    src:      "/assets/ic.webp",
    alt:      "Iconic cinematic shot",
    preset:   "Iconic",
    category: "Cinematic",
    accent:   "#f43f5e",
  },
]

export function ShotUsingPXLSection() {
  return (
    <section
      className="relative w-full overflow-hidden border-y border-border depth-section"
      aria-label="Gallery — shot using PXL Creator presets"
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
            <h2 className="font-display font-black text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight text-foreground">
              Real results.{" "}
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
            </h2>
            <p className="text-[0.9375rem] text-muted/85 max-w-sm leading-relaxed">
              Every image shot and graded by PXL Creator users worldwide.
            </p>
          </div>
        </CinematicReveal>

        {/* ── Masonry-inspired grid — each card depth-enters ── */}
        <CinematicStagger
          stagger={0.055}
          baseDelay={0.02}
          itemVariant="depth"
          className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"
          style={{ gridAutoRows: "200px" } as React.CSSProperties}
        >
          {GALLERY.map((img) => (
            <CinematicItem
              key={img.src}
              variant="depth"
              className={img.tall ? "row-span-2" : ""}
            >
              <GalleryCard img={img} />
            </CinematicItem>
          ))}
        </CinematicStagger>

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
              className="group inline-flex items-center gap-2 text-[0.9rem] text-muted/85 hover:text-foreground transition-colors"
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

/* ── Gallery card ───────────────────────────────────────────── */
function GalleryCard({ img }: { img: GalleryImage }) {
  return (
    <div className="relative overflow-hidden rounded-xl h-full group cursor-pointer depth-card">

      {/* Image */}
      <Image
        src={img.src}
        alt={img.alt}
        fill
        sizes="(max-width: 640px) 50vw, 33vw"
        className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />

      {/* Base tint for cinematic feel */}
      <div className="absolute inset-0 bg-black/20 transition-opacity duration-300 group-hover:bg-black/10" />

      {/* Hover reveal — bottom info */}
      <div
        className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.30) 50%, transparent 100%)" }}
      >
        <div className="px-3 pb-3 flex items-end justify-between gap-2">
          <p className="font-display font-bold text-[0.8125rem] text-white leading-none truncate">{img.preset}</p>
          <span
            className="text-[0.6rem] font-bold tracking-widest uppercase rounded-full px-2 py-0.5 border shrink-0 backdrop-blur-sm"
            style={{
              color:           img.accent,
              borderColor:     `${img.accent}45`,
              backgroundColor: `${img.accent}18`,
            }}
          >
            {img.category}
          </span>
        </div>
      </div>

      {/* Hover accent glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${img.accent}18 0%, transparent 70%)`,
          mixBlendMode: "screen",
        }}
      />
    </div>
  )
}


