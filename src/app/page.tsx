/**
 * src/app/page.tsx — Homepage
 *
 * Section list, order, and on/off state now come from the database
 * (src/lib/homepage/repository.ts, managed at /admin/homepage) instead of
 * being hardcoded here — every section can be enabled/disabled/reordered/
 * scheduled without a code change. If Supabase isn't configured or the
 * migration hasn't run, getHomepageSections() falls back to this exact
 * original 11-section list, in this exact order, all enabled — so the
 * page never breaks during cutover (same guarantee as presets/courses/blog).
 *
 * Content wiring status (honest, not every section is fully rewired):
 *   ✅ enabled/disabled + schedule — respected by every section below
 *   ✅ FAQ, Announcement Banner — 100% DB-driven (title/subtitle/CTA/items)
 *   ⏳ Hero, Featured, Manifesto, BeforeAfter, AIStudioBanner, ShotUsingPXL,
 *      SocialProof, PhilosophyStrip, GiveawayBanner, LeadMagnet, CTABanner —
 *      admin can edit their title/subtitle/CTA/image in the CMS today, but
 *      these existing components don't yet read those props (follow-up).
 *   🔜 Featured Bundles, Statistics, Testimonials, Feature Cards, Featured
 *      YouTube Videos, Footer Promo — schema + admin UI exist, disabled by
 *      default, no frontend component built yet (follow-up).
 */

import { Suspense }                   from "react"
import { HeroSection }                from "@/components/sections/HeroSection"
import { FeaturedSection }            from "@/components/sections/FeaturedSection"
import { ManifestoSection }           from "@/components/sections/ManifestoSection"
import { BeforeAfterSection }         from "@/components/sections/BeforeAfterSection"
import { AIStudioBanner }             from "@/components/sections/AIStudioBanner"
import { ShotUsingPXLSection }        from "@/components/sections/ShotUsingPXLSection"
import { SocialProofSection }         from "@/components/sections/SocialProofSection"
import { PhilosophyStrip }            from "@/components/sections/PhilosophyStrip"
import { GiveawayBanner }             from "@/components/sections/GiveawayBanner"
import { LeadMagnetSection }          from "@/components/sections/LeadMagnetSection"
import { CTABanner }                  from "@/components/sections/CTABanner"
import { FAQSection }                 from "@/components/sections/FAQSection"
import { AnnouncementBanner }         from "@/components/sections/AnnouncementBanner"
import { getHomepageSections, getSection, isSectionEnabled } from "@/lib/homepage/repository"

export const dynamic = "force-dynamic"

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
  const on = (key: string) => isSectionEnabled(sections, key)
  const announcement = getSection(sections, "announcement_banner")
  const faq = getSection(sections, "faq")

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
      {on("hero") && <HeroSection />}

      {/* 2. VISUAL — product grid */}
      {on("featured") && (
        <Suspense fallback={<SectionSkeleton height="h-[480px]" />}>
          <FeaturedSection />
        </Suspense>
      )}

      {/* 3. SHORT TEXT — 3 punchy contrast lines, headline only */}
      {on("manifesto") && <ManifestoSection />}

      {/* 6. INTERACTIVE — drag-to-compare sliders, 5 real image pairs */}
      {on("before_after") && <BeforeAfterSection />}

      {/* 7. INTERACTION — AI Studio feature demo */}
      {on("ai_studio_banner") && <AIStudioBanner />}

      {/* 8. GALLERY — creator showcase triptych */}
      {on("shot_using_pxl") && <ShotUsingPXLSection />}

      {/* 9. TRUST — social proof, stats, testimonials */}
      {on("social_proof") && <SocialProofSection />}

      {/* FAQ — fully DB-driven, renders nothing if no items */}
      {faq && <FAQSection title={faq.title} subtitle={faq.subtitle} items={faq.items} />}

      {/* 10. PHILOSOPHY — compact 3-pillar + cinematic vision closer */}
      {on("philosophy_strip") && <PhilosophyStrip />}

      {/* 11. GIVEAWAY — live giveaway strip CTA */}
      {on("giveaway_banner") && <GiveawayBanner />}

      {/* 12. LEAD MAGNET — free preset email capture */}
      {on("lead_magnet") && <LeadMagnetSection />}

      {/* 13. CONVERSION — final CTA */}
      {on("cta_banner") && <CTABanner />}
    </>
  )
}
