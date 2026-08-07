/**
 * src/components/sections/FeaturedBundlesSection.tsx
 *
 * Real bundle data — pulls from the existing getFeaturedBundles()
 * repository (already DB-backed with static fallback), same as
 * FeaturedSection does for presets. Title/subtitle are DB-driven via the
 * "featured_bundles" homepage_sections row; renders nothing if there are
 * no featured bundles, so an empty state doesn't leave a blank block.
 */

import Link  from "next/link"
import Image from "next/image"
import { Container } from "@/components/layout/Container"
import { Heading }    from "@/components/ui/typography"
import { getFeaturedBundles } from "@/lib/bundles/repository"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

interface FeaturedBundlesSectionProps {
  title?:    string | null
  subtitle?: string | null
}

export async function FeaturedBundlesSection({ title, subtitle }: FeaturedBundlesSectionProps = {}) {
  const bundles = await getFeaturedBundles(3)
  if (bundles.length === 0) return null

  return (
    <section className="relative w-full overflow-hidden bg-background border-t border-border py-24 sm:py-32 depth-section">
      <Container className="relative z-10">
        <CinematicReveal variant="depth" margin="-80px">
          <div className="flex flex-col items-center text-center gap-5 mb-14">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
              <span className="text-label text-gold/80">Featured Bundles</span>
              <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
            </div>
            <Heading level={2}>
              {title || "Save more, shoot more"}
            </Heading>
            <p className="text-lead max-w-md">
              {subtitle || "Curated preset collections at a fraction of the individual price."}
            </p>
          </div>
        </CinematicReveal>

        <CinematicStagger stagger={0.1} baseDelay={0.05} itemVariant="depth" className="grid grid-cols-1 sm:grid-cols-3 gap-7">
          {bundles.map((b) => (
            <CinematicItem key={b.id} variant="depth">
              <Link
                href={`/bundles/${b.slug}`}
                className="group flex flex-col rounded-2xl overflow-hidden border border-border bg-surface hover:border-gold/30 transition-all duration-300"
              >
                <div className="relative aspect-video bg-surface-2">
                  {b.thumbnailUrl && (
                    <Image src={b.thumbnailUrl} alt={b.name} fill className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" sizes="(max-width:640px) 100vw, 33vw" />
                  )}
                  {b.badge && (
                    <span className="absolute top-3 left-3 text-label rounded-md px-2.5 py-1 bg-gold text-background">{b.badge}</span>
                  )}
                </div>
                <div className="flex flex-col gap-2 p-5">
                  <h3 className="font-display font-bold text-base text-foreground group-hover:text-gold transition-colors">{b.name}</h3>
                  {b.tagline && <p className="text-small text-muted line-clamp-2">{b.tagline}</p>}
                  <div className="flex items-baseline gap-2 pt-2 border-t border-border mt-2">
                    <span className="font-display font-bold text-lg text-gold">${b.bundlePriceUsd}</span>
                    {b.compareAtPriceUsd && (
                      <span className="text-small text-muted line-through">${b.compareAtPriceUsd}</span>
                    )}
                    <span className="text-small text-muted ml-auto">{b.presetCount} presets</span>
                  </div>
                </div>
              </Link>
            </CinematicItem>
          ))}
        </CinematicStagger>
      </Container>
    </section>
  )
}
