/**
 * src/app/page.tsx — Homepage
 *
 * Every section's content, order, and on/off state comes from the
 * database (src/lib/homepage/repository.ts, managed at /admin/homepage).
 * No section content is hardcoded here — each component receives its
 * title/subtitle/CTA/items as props, falling back to its own sensible
 * defaults only when the DB has no override (so an unedited section still
 * looks exactly as designed). If Supabase isn't configured or a migration
 * hasn't run, getHomepageSections() falls back to the original 11-section
 * list, all enabled, in original order — the page never breaks during
 * cutover (same guarantee as presets/courses/blog).
 *
 * "Statistics" and "Testimonials" are intentionally ONE section
 * (social_proof / "Testimonials & Stats") rather than two — see migration
 * 034's comment for why duplicating that UI would be dishonest architecture.
 */

import type { Metadata }              from "next"
import { Suspense }                   from "react"
import { HeroSection }                from "@/components/sections/HeroSection"
import { FeaturedSection }            from "@/components/sections/FeaturedSection"
import { ManifestoSection }           from "@/components/sections/ManifestoSection"
import { BeforeAfterSection }         from "@/components/sections/BeforeAfterSection"
import { AIStudioBanner }             from "@/components/sections/AIStudioBanner"
import { ShotUsingPXLSection, type ShowcaseImage } from "@/components/sections/ShotUsingPXLSection"
import { SocialProofSection }         from "@/components/sections/SocialProofSection"
import { PhilosophyStrip }            from "@/components/sections/PhilosophyStrip"
import { GiveawayBanner }             from "@/components/sections/GiveawayBanner"
import { LeadMagnetSection }          from "@/components/sections/LeadMagnetSection"
import { CTABanner }                  from "@/components/sections/CTABanner"
import { FAQSection }                 from "@/components/sections/FAQSection"
import { AnnouncementBanner }         from "@/components/sections/AnnouncementBanner"
import { FeaturedBundlesSection }     from "@/components/sections/FeaturedBundlesSection"
import { FeatureCardsSection }        from "@/components/sections/FeatureCardsSection"
import { FeaturedYouTubeVideosSection } from "@/components/sections/FeaturedYouTubeVideosSection"
import { FooterPromoSection }         from "@/components/sections/FooterPromoSection"
import { getHomepageSections, getSection } from "@/lib/homepage/repository"
import { getSiteSeo } from "@/lib/seo/site-seo"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSiteSeo("home")
  return {
    title: seo.title ?? undefined,
    description: seo.description ?? undefined,
    keywords: seo.keywords ?? undefined,
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    openGraph: { images: seo.ogImage ? [{ url: seo.ogImage }] : undefined },
    twitter: { card: seo.twitterCard },
  }
}

/* ── Skeleton placeholder — keeps layout stable during async streaming ── */
function SectionSkeleton({ height = "h-96" }: { height?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`w-full ${height} bg-gradient-to-b from-surface/30 to-transparent animate-pulse`}
    />
  )
}

export default async function Home() {
  const sections = await getHomepageSections()
  const get = (key: string) => getSection(sections, key)

  const hero            = get("hero")
  const featured        = get("featured")
  const manifesto       = get("manifesto")
  const beforeAfter     = get("before_after")
  const aiStudio        = get("ai_studio_banner")
  const shotUsingPxl    = get("shot_using_pxl")
  const socialProof     = get("social_proof")
  const philosophy      = get("philosophy_strip")
  const giveaway        = get("giveaway_banner")
  const leadMagnet      = get("lead_magnet")
  const ctaBanner       = get("cta_banner")
  const faq             = get("faq")
  const announcement    = get("announcement_banner")
  const featuredBundles = get("featured_bundles")
  const featureCards    = get("feature_cards")
  const youtubeVideos   = get("featured_youtube_videos")
  const footerPromo     = get("footer_promo")

  /* Map the generic {title,subtitle,image_url,link_href} item shape onto
     ShotUsingPXLSection's richer ShowcaseImage shape when the admin has
     configured real items — otherwise the component's own curated demo
     defaults are used (see ShotUsingPXLSection.tsx). */
  const showcaseImages: ShowcaseImage[] | undefined = shotUsingPxl && shotUsingPxl.items.length > 0
    ? shotUsingPxl.items.map((it) => ({
        title:       it.link_label || "",
        image:       it.image_url || "",
        alt:         it.title || "",
        creatorName: it.title || "",
        presetName:  it.subtitle || "",
        profileLink: it.link_href || undefined,
      }))
    : undefined

  return (
    <>
      {announcement && (
        <AnnouncementBanner
          title={announcement.title}
          subtitle={announcement.subtitle}
          ctaLabel={announcement.ctaLabel}
          ctaHref={announcement.ctaHref}
        />
      )}

      {/* 1. ENTRY — real cinematic photos, cycling, parallax */}
      {hero && (
        <HeroSection title={hero.title} subtitle={hero.subtitle} ctaLabel={hero.ctaLabel} ctaHref={hero.ctaHref} />
      )}

      {/* 2. VISUAL — product grid */}
      {featured && (
        <Suspense fallback={<SectionSkeleton height="h-[480px]" />}>
          <FeaturedSection title={featured.title} subtitle={featured.subtitle} />
        </Suspense>
      )}

      {/* 3. SHORT TEXT — 3 punchy contrast lines, headline only */}
      {manifesto && <ManifestoSection title={manifesto.title} items={manifesto.items} />}

      {/* 6. INTERACTIVE — drag-to-compare sliders, 5 real image pairs */}
      {beforeAfter && <BeforeAfterSection title={beforeAfter.title} subtitle={beforeAfter.subtitle} />}

      {/* 7. INTERACTION — AI Studio feature demo */}
      {aiStudio && (
        <AIStudioBanner title={aiStudio.title} subtitle={aiStudio.subtitle} ctaLabel={aiStudio.ctaLabel} ctaHref={aiStudio.ctaHref} />
      )}

      {/* 8. GALLERY — creator showcase triptych */}
      {shotUsingPxl && (
        <ShotUsingPXLSection title={shotUsingPxl.title} subtitle={shotUsingPxl.subtitle} images={showcaseImages} />
      )}

      {/* 9. TRUST — social proof, stats, testimonials */}
      {socialProof && (
        <SocialProofSection title={socialProof.title} subtitle={socialProof.subtitle} items={socialProof.items} />
      )}

      {/* Featured Bundles — real DB bundles, renders nothing if none featured */}
      {featuredBundles && <FeaturedBundlesSection title={featuredBundles.title} subtitle={featuredBundles.subtitle} />}

      {/* Feature Cards — fully DB-driven, renders nothing without items */}
      {featureCards && <FeatureCardsSection title={featureCards.title} subtitle={featureCards.subtitle} items={featureCards.items} />}

      {/* Featured YouTube Videos — fully DB-driven, renders nothing without items */}
      {youtubeVideos && <FeaturedYouTubeVideosSection title={youtubeVideos.title} subtitle={youtubeVideos.subtitle} items={youtubeVideos.items} />}

      {/* FAQ — fully DB-driven, renders nothing without items */}
      {faq && <FAQSection title={faq.title} subtitle={faq.subtitle} items={faq.items} />}

      {/* 10. PHILOSOPHY — compact 3-pillar + cinematic vision closer */}
      {philosophy && <PhilosophyStrip title={philosophy.title} items={philosophy.items} />}

      {/* 11. GIVEAWAY — live giveaway strip CTA */}
      {giveaway && (
        <GiveawayBanner title={giveaway.title} subtitle={giveaway.subtitle} ctaLabel={giveaway.ctaLabel} ctaHref={giveaway.ctaHref} />
      )}

      {/* 12. LEAD MAGNET — free preset email capture / newsletter */}
      {leadMagnet && <LeadMagnetSection title={leadMagnet.title} subtitle={leadMagnet.subtitle} />}

      {/* 13. CONVERSION — final CTA */}
      {ctaBanner && (
        <CTABanner title={ctaBanner.title} subtitle={ctaBanner.subtitle} ctaLabel={ctaBanner.ctaLabel} ctaHref={ctaBanner.ctaHref} />
      )}

      {/* Footer promotional content — homepage-scoped, above the global footer */}
      {footerPromo && (
        <FooterPromoSection title={footerPromo.title} subtitle={footerPromo.subtitle} ctaLabel={footerPromo.ctaLabel} ctaHref={footerPromo.ctaHref} />
      )}
    </>
  )
}
