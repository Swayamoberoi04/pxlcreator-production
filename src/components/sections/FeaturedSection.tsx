/**
 * FeaturedSection.tsx
 *
 * Async Server Component — fetches featured presets from Supabase at request
 * time. Falls back to static data automatically if Supabase is not yet
 * configured (repository.ts handles this transparently).
 *
 * Cinematic upgrade:
 *   • Section header uses CinematicReveal (client wrapper)
 *   • Grid uses CinematicStagger / CinematicItem (client wrappers)
 *   • depth-section CSS pseudo-borders
 *   • Atmosphere: CinematicBackground + GrainOverlay
 * Content unchanged. No async boundary touched.
 */

import Link                    from "next/link"
import { Container }           from "@/components/layout/Container"
import { Heading }             from "@/components/ui/typography"
import { PresetCard }          from "@/components/store/PresetCard"
import { getFeaturedPresets }  from "@/lib/presets/repository"
import { CinematicBackground } from "@/components/ui/CinematicBackground"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

export interface FeaturedSectionProps {
  title?:    string | null
  subtitle?: string | null
}

export async function FeaturedSection({ title, subtitle }: FeaturedSectionProps = {}) {
  const featured = await getFeaturedPresets(6)

  if (featured.length === 0) return null

  return (
    <section className="relative w-full overflow-hidden bg-surface border-t border-border py-24 sm:py-32 depth-section">

      {/* ── Cinematic atmosphere ── */}
      <CinematicBackground variant="mission" />
      <GrainOverlay opacity={0.016} animated zIndex={1} />

      <Container className="relative z-10">

        {/* ── Section header — 3D depth reveal ── */}
        <CinematicReveal variant="depth" margin="-80px">
          <div className="flex flex-col items-center text-center gap-5 mb-16">

            {/* Eyebrow */}
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
              <span className="text-label text-gold/80 animate-gold-flicker">Featured Presets</span>
              <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
            </div>

            <Heading level={2}>
              {title ? title : (
                <>Handpicked for <span className="text-gold-gradient">Creators</span></>
              )}
            </Heading>

            <p className="text-lead max-w-md">
              {subtitle || "Every pack is tested on real shoots. No filters that look good on the thumbnail but fall apart in practice."}
            </p>

          </div>
        </CinematicReveal>

        {/* ── Preset grid — staggered depth entrance ── */}
        <CinematicStagger
          stagger={0.10}
          baseDelay={0.05}
          itemVariant="depth"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7"
        >
          {featured.map((preset) => (
            <CinematicItem key={preset.id} variant="depth">
              <PresetCard preset={preset} />
            </CinematicItem>
          ))}
        </CinematicStagger>

        {/* ── Browse CTA below grid ── */}
        <CinematicReveal variant="rise" delay={0.1} margin="-20px">
          <div className="flex justify-center mt-12">
            <Link
              href="/store"
              className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-surface-2 px-7 py-3 text-[0.9375rem] font-semibold text-muted/92 hover:border-gold/30 hover:text-foreground transition-all duration-200"
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
