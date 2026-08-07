/**
 * src/components/sections/FeaturedYouTubeVideosSection.tsx
 *
 * Fully DB-driven — a row of YouTube video cards from the
 * "featured_youtube_videos" row's `items` (title, image_url = thumbnail,
 * link_href = YouTube URL). Renders nothing without items.
 */

import Image from "next/image"
import { Container } from "@/components/layout/Container"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

interface VideoItem {
  title?: string
  image_url?: string
  link_href?: string
}

interface FeaturedYouTubeVideosSectionProps {
  title?:    string | null
  subtitle?: string | null
  items: VideoItem[]
}

export function FeaturedYouTubeVideosSection({ title, subtitle, items }: FeaturedYouTubeVideosSectionProps) {
  if (items.length === 0) return null

  return (
    <section className="relative w-full bg-background border-y border-border py-24 sm:py-32 depth-section">
      <Container className="relative z-10">
        <CinematicReveal variant="rise">
          <div className="flex flex-col items-center text-center gap-4 mb-14">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/50" aria-hidden="true" />
              <span className="text-label text-gold/70 tracking-widest">Watch</span>
              <span className="h-px w-8 bg-gold/50" aria-hidden="true" />
            </div>
            <h2 className="font-display font-bold text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05] tracking-tight text-foreground">
              {title || "Featured Videos"}
            </h2>
            {subtitle && <p className="text-[0.9375rem] text-muted/85 max-w-md">{subtitle}</p>}
          </div>
        </CinematicReveal>

        <CinematicStagger stagger={0.08} baseDelay={0.03} itemVariant="rise" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((v, i) => (
            <CinematicItem key={i} variant="rise">
              <a
                href={v.link_href || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col rounded-2xl overflow-hidden border border-border bg-surface hover:border-gold/30 transition-colors"
              >
                <div className="relative aspect-video bg-black">
                  {v.image_url && (
                    <Image src={v.image_url} alt={v.title ?? ""} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" sizes="(max-width:640px) 100vw, 33vw" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 group-hover:bg-gold transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="black" className="translate-x-0.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </div>
                  </div>
                </div>
                {v.title && <p className="p-4 text-[0.875rem] font-medium text-foreground line-clamp-2">{v.title}</p>}
              </a>
            </CinematicItem>
          ))}
        </CinematicStagger>
      </Container>
    </section>
  )
}
