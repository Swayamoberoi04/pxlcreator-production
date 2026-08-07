/**
 * src/components/sections/FeatureCardsSection.tsx
 *
 * Fully DB-driven — a grid of {image, title, subtitle, link} cards from the
 * "feature_cards" row's `items` (see SectionItemsEditor in the admin).
 * Renders nothing without items.
 */

import Link  from "next/link"
import Image from "next/image"
import { Container } from "@/components/layout/Container"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

interface FeatureCard {
  title?: string
  subtitle?: string
  image_url?: string
  link_href?: string
}

interface FeatureCardsSectionProps {
  title?:    string | null
  subtitle?: string | null
  items: FeatureCard[]
}

export function FeatureCardsSection({ title, subtitle, items }: FeatureCardsSectionProps) {
  if (items.length === 0) return null

  return (
    <section className="relative w-full bg-surface border-y border-border py-24 sm:py-32 depth-section">
      <Container className="relative z-10">
        <CinematicReveal variant="rise">
          <div className="flex flex-col items-center text-center gap-4 mb-14">
            {title && (
              <h2 className="font-display font-bold text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05] tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {subtitle && <p className="text-[0.9375rem] text-muted/85 max-w-md">{subtitle}</p>}
          </div>
        </CinematicReveal>

        <CinematicStagger stagger={0.08} baseDelay={0.03} itemVariant="depth" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((card, i) => {
            const content = (
              <div className="group flex flex-col rounded-2xl overflow-hidden border border-border bg-background h-full hover:border-gold/25 transition-colors">
                {card.image_url && (
                  <div className="relative aspect-video">
                    <Image src={card.image_url} alt={card.title ?? ""} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" sizes="(max-width:640px) 100vw, 33vw" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5 p-5">
                  {card.title && <h3 className="font-display font-bold text-[0.9375rem] text-foreground">{card.title}</h3>}
                  {card.subtitle && <p className="text-[0.8125rem] text-muted/80 leading-relaxed">{card.subtitle}</p>}
                </div>
              </div>
            )
            return (
              <CinematicItem key={i} variant="depth">
                {card.link_href ? <Link href={card.link_href}>{content}</Link> : content}
              </CinematicItem>
            )
          })}
        </CinematicStagger>
      </Container>
    </section>
  )
}
