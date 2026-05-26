/**
 * src/app/bundles/page.tsx
 *
 * /bundles — Premium bundles store page.
 *
 * Server component: fetches all published bundles server-side.
 * BundleGrid (client) handles currency display and cart integration.
 */

import type { Metadata }  from "next"
import { getBundles }     from "@/lib/bundles/repository"
import { BundleGrid }     from "@/components/bundles/BundleGrid"
import Link               from "next/link"
import { LuminousEnvironment }  from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }         from "@/components/ui/GrainOverlay"
import { CinematicBackground }  from "@/components/ui/CinematicBackground"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

/* ── SEO ────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title:       "Creator Bundles — PXL Creator",
  description: "Premium Lightroom preset bundles at 60–74% off individual pack prices. Cinematic, film, portrait, landscape and street looks — curated collections for every creator.",
  openGraph: {
    title:       "Creator Bundles — PXL Creator",
    description: "Curated preset collections at 60–74% off. 8 bundles. 110+ presets. One download.",
    type:        "website",
    url:         "/bundles",
  },
}

/* ── Page ───────────────────────────────────────────────── */

export default async function BundlesPage() {
  const bundles = await getBundles()

  const totalPresets = bundles.reduce((sum, b) =>
    sum + (b.includeCount ?? b.includedPacks.reduce((s, p) => s + p.presetCount, 0)), 0
  )

  return (
    <main className="min-h-screen bg-background">

      {/* ── Hero header ─────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border depth-section">
        {/* Living luminous atmosphere */}
        <LuminousEnvironment variant="gold" intensity={1.0} />
        <CinematicBackground variant="mission" />
        <GrainOverlay opacity={0.019} animated zIndex={2} />

        {/* Edge rules */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/35 to-transparent z-[3]" />

        <div className="relative z-10 mx-auto max-w-3xl text-center pt-24 pb-16 px-4">
          {/* Eyebrow */}
          <CinematicReveal variant="rise">
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="h-px w-8 bg-gold/50 animate-gold-flicker" aria-hidden="true" />
              <span className="text-[0.7rem] font-bold tracking-[0.25em] uppercase text-gold/70 animate-gold-flicker">
                Premium Bundles
              </span>
              <span className="h-px w-8 bg-gold/50 animate-gold-flicker" aria-hidden="true" />
            </div>
          </CinematicReveal>

          {/* Title */}
          <CinematicReveal variant="depth" delay={0.07}>
            <h1 className="font-display text-[2.5rem] sm:text-[3.25rem] font-black leading-[1.05] text-foreground mb-5">
              Buy less.{" "}
              <br className="sm:hidden" />
              <span
                style={{
                  background: "linear-gradient(135deg, #ffd700 0%, #e5a227 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Create more.
              </span>
            </h1>
          </CinematicReveal>

          {/* Subtitle */}
          <CinematicReveal variant="rise" delay={0.13}>
            <p className="text-[1rem] sm:text-[1.0625rem] text-muted/55 leading-relaxed max-w-xl mx-auto mb-10">
              {bundles.length} hand-curated bundles. {totalPresets}+ presets total.
              Each collection saves you 60–74% off buying individual packs.
            </p>
          </CinematicReveal>

          {/* Stats row */}
          <CinematicStagger stagger={0.09} baseDelay={0.18} itemVariant="rise" className="flex items-center justify-center gap-6 sm:gap-10 text-center">
            {[
              { value: `${bundles.length}`, label: "Bundles" },
              { value: `${totalPresets}+`,  label: "Total Presets" },
              { value: "74%",               label: "Max Savings" },
              { value: "∞",                label: "Lifetime Access" },
            ].map(({ value, label }) => (
              <CinematicItem key={label} variant="rise">
                <div>
                  <p className="text-[1.35rem] font-black text-gold leading-none">{value}</p>
                  <p className="text-[0.68rem] font-medium text-muted/40 mt-1 tracking-wide uppercase">
                    {label}
                  </p>
                </div>
              </CinematicItem>
            ))}
          </CinematicStagger>
        </div>
      </section>

      {/* ── Bundle grid ─────────────────────────────── */}
      <section className="relative py-14 px-4">
        <LuminousEnvironment variant="gold" intensity={0.4} />
        <div className="relative z-10 mx-auto max-w-7xl">

          {/* Section label */}
          <CinematicReveal variant="rise">
            <div className="flex items-center justify-between mb-8">
              <p className="text-[0.8rem] font-medium text-muted/40">
                {bundles.length} bundle{bundles.length !== 1 ? "s" : ""} available
              </p>

              {/* Breadcrumb */}
              <nav className="hidden sm:flex items-center gap-1.5 text-[0.75rem] text-muted/30">
                <Link href="/" className="hover:text-muted/60 transition-colors">Home</Link>
                <span>/</span>
                <span className="text-muted/50">Bundles</span>
              </nav>
            </div>
          </CinematicReveal>

          <BundleGrid bundles={bundles} variant="compact" />
        </div>
      </section>

      {/* ── Bottom CTA strip ────────────────────────── */}
      <section className="relative py-16 px-4 border-t border-border">
        <LuminousEnvironment variant="gold" intensity={0.3} />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <CinematicReveal variant="depth">
            <div className="rounded-2xl border border-gold/15 bg-surface/60 backdrop-blur-sm px-8 py-10 shadow-[0_0_60px_rgba(255,215,0,0.05)]">
              <p className="text-[0.8rem] font-bold tracking-widest uppercase text-gold/55 mb-3">
                Need individual presets instead?
              </p>
              <h3 className="font-display text-[1.4rem] font-bold text-foreground mb-3">
                Browse the full preset store
              </h3>
              <p className="text-[0.875rem] text-muted/50 mb-6 leading-relaxed">
                All 110+ individual presets are available separately.
                Pick exactly what you need.
              </p>
              <Link
                href="/presets"
                className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-5 py-3 text-[0.875rem] font-semibold text-muted/60 hover:text-foreground hover:border-gold/25 transition-all duration-200"
              >
                Browse all presets
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            </div>
          </CinematicReveal>
        </div>
      </section>

    </main>
  )
}
