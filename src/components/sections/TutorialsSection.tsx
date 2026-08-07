/**
 * src/components/sections/TutorialsSection.tsx
 *
 * Fully DB-driven tutorial card grid — used on /studio, content comes from
 * ai_studio_settings.tutorial_items (see src/lib/ai-studio/settings.ts).
 * Renders nothing when there are no tutorials, so an empty admin-managed
 * list doesn't leave a blank block.
 */

import Link from "next/link"
import Image from "next/image"
import { Container } from "@/components/layout/Container"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

interface TutorialItem {
  title?: string
  subtitle?: string
  image_url?: string
  link_href?: string
}

export function TutorialsSection({ items }: { items: TutorialItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="w-full border-t border-border">
      <Container className="py-16 sm:py-20">
        <CinematicReveal variant="rise">
          <div className="flex items-center gap-2 mb-8">
            <span className="h-px w-6 bg-gold" />
            <span className="text-label text-gold">Tutorials</span>
          </div>
        </CinematicReveal>

        <CinematicStagger stagger={0.08} baseDelay={0.02} itemVariant="rise" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((t, i) => {
            const card = (
              <div className="group flex flex-col rounded-xl overflow-hidden border border-border bg-surface hover:border-gold/30 transition-all duration-300 h-full">
                {t.image_url && (
                  <div className="relative aspect-video w-full overflow-hidden">
                    <Image src={t.image_url} alt={t.title ?? ""} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" sizes="(max-width:640px) 100vw, 33vw" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5 p-4 flex-1">
                  <p className="font-display font-bold text-[0.9375rem] text-foreground group-hover:text-gold transition-colors leading-snug">
                    {t.title}
                  </p>
                  {t.subtitle && <p className="text-[0.8125rem] text-muted leading-relaxed">{t.subtitle}</p>}
                </div>
              </div>
            )
            return (
              <CinematicItem key={i} variant="rise">
                {t.link_href ? (
                  <Link href={t.link_href} target={t.link_href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
                    {card}
                  </Link>
                ) : card}
              </CinematicItem>
            )
          })}
        </CinematicStagger>
      </Container>
    </div>
  )
}
