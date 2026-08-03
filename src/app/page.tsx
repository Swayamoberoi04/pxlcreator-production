/**
 * src/app/page.tsx — Homepage
 *
 * Emotional scroll architecture:
 *
 *  1. HeroSection          ← ENTRY: real cinematic photos, cycling scenes, parallax
 *  2. FeaturedSection      ← VISUAL: product grid, immediate value proof
 *  3. ManifestoSection     ← SHORT TEXT: 3 contrast lines + power headline (~20 words)
 *  5. BeforeAfterSection   ← INTERACTIVE: drag-to-compare sliders (5 real pairs)
 *  6. AIStudioBanner       ← INTERACTION: AI feature demo
 *  7. ShotUsingPXLSection  ← GALLERY: 12-photo masonry creator gallery
 *  8. SocialProofSection   ← TRUST: stats + testimonials
 *  9. PhilosophyStrip      ← PHILOSOPHY: compact 3-pillar + vision closer
 * 10. CTABanner            ← CONVERSION: final CTA
 *
 * Pacing:
 *   Cinematic entry → product value → static transformation →
 *   text punch → interactive proof → AI feature → gallery proof →
 *   trust → brief philosophy → convert.
 *
 * Philosophy: no manifesto dumps. Emotional engagement earns philosophy.
 * Full brand story lives at /about.
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

/* ── Skeleton placeholder — keeps layout stable during async streaming ── */
function SectionSkeleton({ height = "h-96" }: { height?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`w-full ${height} bg-gradient-to-b from-surface/30 to-transparent animate-pulse`}
    />
  )
}

export default function Home() {
  return (
    <>
      {/* 1. ENTRY — real cinematic photos, cycling, parallax */}
      <HeroSection />

      {/* 2. VISUAL — product grid */}
      <Suspense fallback={<SectionSkeleton height="h-[480px]" />}>
        <FeaturedSection />
      </Suspense>

      {/* 3. SHORT TEXT — 3 punchy contrast lines, headline only */}
      <ManifestoSection />

      {/* 6. INTERACTIVE — drag-to-compare sliders, 5 real image pairs */}
      <BeforeAfterSection />

      {/* 7. INTERACTION — AI Studio feature demo */}
      <AIStudioBanner />

      {/* 8. GALLERY — 12-image masonry creator gallery */}
      <ShotUsingPXLSection />

      {/* 9. TRUST — social proof, stats, testimonials */}
      <SocialProofSection />

      {/* 10. PHILOSOPHY — compact 3-pillar + cinematic vision closer */}
      <PhilosophyStrip />

      {/* 11. GIVEAWAY — live giveaway strip CTA */}
      <GiveawayBanner />

      {/* 12. LEAD MAGNET — free preset email capture */}
      <LeadMagnetSection />

      {/* 13. CONVERSION — final CTA */}
      <CTABanner />
    </>
  )
}
