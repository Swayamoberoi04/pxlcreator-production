import type { Metadata }   from "next"
import Image               from "next/image"
import Link                from "next/link"
import { Container }       from "@/components/layout/Container"
import { PresetCard }      from "@/components/store/PresetCard"
import { getPresets }      from "@/lib/presets/repository"
import type { Preset, PresetCategory } from "@/types/product"
import { LuminousEnvironment }  from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }         from "@/components/ui/GrainOverlay"
import { CinematicBackground }  from "@/components/ui/CinematicBackground"
import { CinematicReveal } from "@/components/ui/CinematicReveal"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Presets — Full Collection",
  description:
    "Explore every PXL Creator preset pack organised by style. Cinematic, film emulation, portrait, landscape, street and bundle collections.",
}

/* ── Category metadata ── */
const CATEGORY_META: Record<PresetCategory, { description: string; order: number }> = {
  Bundle:          { description: "The best value way to start. Bundles combine multiple styles at a discounted price — perfect if you shoot across genres.",                                              order: 1 },
  Cinematic:       { description: "Rich, intentional colour grading inspired by film directors. High contrast, warm shadows, and a look that feels finished from the first click.",                        order: 2 },
  "Film Emulation":{ description: "Authentic recreations of legendary film stocks — Kodak, Fuji, Ilford and more. Real grain structure, real colour casts, real character.",                              order: 3 },
  Portrait:        { description: "Built around skin. Every preset here has been tested across multiple skin tones to ensure it lifts and warms without going orange.",                                   order: 4 },
  Landscape:       { description: "Made for wide open spaces. Whether you shoot arctic tundra or dense forest, these presets handle natural light with precision.",                                       order: 5 },
  Street:          { description: "Gritty, high-contrast, cinematic. For photographers who shoot cities, architecture, and people in motion.",                                                           order: 6 },
}

function groupByCategory(presets: Preset[]) {
  const map = new Map<PresetCategory, Preset[]>()
  for (const p of presets) {
    const existing = map.get(p.category) ?? []
    map.set(p.category, [...existing, p])
  }
  return Array.from(map.entries())
    .map(([cat, ps]) => ({
      category:    cat,
      description: CATEGORY_META[cat]?.description ?? "",
      presets:     ps,
    }))
    .sort((a, b) =>
      (CATEGORY_META[a.category]?.order ?? 99) -
      (CATEGORY_META[b.category]?.order ?? 99)
    )
}

/* ── Hero background images — one per category in order ── */
const CATEGORY_HERO_IMAGES: Partial<Record<PresetCategory, string>> = {
  Bundle:           "/presets/cinematic.webp",
  Cinematic:        "/presets/cg.webp",
  "Film Emulation": "/presets/documentary1.webp",
  Portrait:         "/presets/magical_sunset.webp",
  Landscape:        "/presets/dark_blue.webp",
  Street:           "/presets/dramatic_city.webp",
}

export default async function PresetsPage() {
  const allPresets = await getPresets({ orderBy: "order_index" })
  const groups     = groupByCategory(allPresets)
  const totalCount = allPresets.length
  const freeCount  = allPresets.filter((p) => p.isFree).length

  return (
    <div className="w-full bg-background">

      {/* ── Page hero ── */}
      <div className="relative w-full border-b border-border overflow-hidden depth-section">
        <LuminousEnvironment variant="gold" intensity={1.0} />
        <CinematicBackground variant="mission" />
        <GrainOverlay opacity={0.019} animated zIndex={2} />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/35 to-transparent z-[3]" />

        <Container className="relative z-10 py-16 sm:py-24">
          <div className="flex flex-col items-center text-center gap-5 max-w-2xl mx-auto">

            <CinematicReveal variant="rise">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
                <span className="text-label text-gold/80 tracking-widest animate-gold-flicker">( Collections )</span>
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
              </div>
            </CinematicReveal>

            <CinematicReveal variant="depth" delay={0.07}>
              <h1 className="font-display font-black text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] tracking-tight text-foreground">
                Every preset.<br />
                <span
                  style={{
                    background: "linear-gradient(135deg, #ffd700 0%, #e5a227 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Every style.
                </span>
              </h1>
            </CinematicReveal>

            <CinematicReveal variant="rise" delay={0.13}>
              <p className="text-lead max-w-lg text-muted/65">
                {totalCount} handcrafted packs organised by style.
                Find the look that matches how you shoot — then own it forever.
              </p>
            </CinematicReveal>

            {/* Stat strip */}
            <div className="flex items-center pt-2">
              {[
                { v: `${totalCount}`,     l: "Preset Packs"     },
                { v: `${groups.length}`,  l: "Style Categories" },
                { v: `${freeCount}`,      l: "Free Packs"       },
                { v: "4.9★",             l: "Avg Rating"        },
              ].map(({ v, l }, i, arr) => (
                <div key={l} className="flex items-center">
                  <div className="flex flex-col items-center px-5 sm:px-8 gap-0.5">
                    <span className="font-display font-black text-[1.25rem] sm:text-[1.5rem] text-gold leading-none">
                      {v}
                    </span>
                    <span className="text-[0.7rem] text-muted/50 whitespace-nowrap font-medium">
                      ( {l} )
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <span className="h-7 w-px bg-border shrink-0" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>

          </div>
        </Container>
      </div>

      {/* ── Category sections ── */}
      <Container className="py-14 sm:py-20">
        <div className="flex flex-col gap-20 sm:gap-28">

          {groups.map(({ category, description, presets }, index) => {
            const heroImg = CATEGORY_HERO_IMAGES[category]
            return (
              <div key={category} className="flex flex-col gap-7">

                {/* Category header */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div className="flex flex-col gap-3">

                    {/* Counter + category image + title */}
                    <div className="flex items-center gap-4">
                      <span className="font-display font-black text-[3rem] sm:text-[4rem] leading-none text-muted/8 select-none">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {heroImg && (
                        <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-border shrink-0">
                          <Image
                            src={heroImg}
                            alt={category}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <h2 className="font-display font-black text-[1.5rem] sm:text-[1.875rem] text-foreground leading-tight">
                        ( {category} )
                      </h2>
                    </div>

                    <p className="text-[0.9375rem] text-muted/60 leading-relaxed max-w-lg">
                      {description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-[0.75rem] font-medium text-muted/60 whitespace-nowrap">
                      ( {presets.length} {presets.length === 1 ? "pack" : "packs"} )
                    </span>
                  </div>
                </div>

                {/* Gold rule */}
                <div className="h-px bg-gradient-to-r from-gold/20 via-border to-transparent" aria-hidden="true" />

                {/* Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {presets.map((preset) => (
                    <PresetCard key={preset.id} preset={preset} />
                  ))}
                </div>

              </div>
            )
          })}

        </div>

        {/* ── Bottom CTA ── */}
        <div className="mt-20 relative rounded-2xl border border-gold/15 bg-gold/[0.04] px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent"
          />
          <div className="flex flex-col gap-1.5">
            <p className="font-display font-bold text-[1.125rem] text-foreground">
              ( Can&apos;t decide? Start with a bundle. )
            </p>
            <p className="text-[0.875rem] text-muted/60 max-w-sm">
              Bundles give you multiple styles at a reduced price — perfect
              for photographers who shoot across genres.
            </p>
          </div>
          <Link
            href="/store"
            className="shrink-0 inline-flex items-center gap-2.5 rounded-full bg-gold px-7 py-3 text-[0.9375rem] font-semibold text-background hover:bg-gold-dim transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap"
          >
            Browse the Store
            <ArrowRightIcon />
          </Link>
        </div>

      </Container>
    </div>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  )
}
