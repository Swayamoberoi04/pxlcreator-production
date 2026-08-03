import type { Metadata }       from "next"
import Link                    from "next/link"
import { getBundles }          from "@/lib/bundles/repository"
import { Container }           from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"
import { CinematicBackground } from "@/components/ui/CinematicBackground"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"
import type { BundleWithPresets } from "@/types/bundle"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Bundles — PXL Creator",
  description:
    "Save more with PXL Creator preset bundles. Hand-curated collections at one discounted price — get the complete look instantly.",
}

export default async function BundlesPage() {
  const bundles = await getBundles()

  return (
    <main className="relative min-h-screen bg-background overflow-x-hidden">
      <GrainOverlay />
      <LuminousEnvironment />
      <CinematicBackground />

      <Container className="pt-28 pb-20">

        {/* ── Hero ── */}
        <CinematicReveal>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="h-px w-8 bg-gold/40" />
              <span className="text-[0.7rem] text-gold/60 tracking-widest font-medium">( PRESET BUNDLES )</span>
              <span className="h-px w-8 bg-gold/40" />
            </div>
            <h1 className="font-display font-bold text-[2.5rem] sm:text-[3rem] text-white/90 leading-tight mb-4">
              Get More,<br />Pay Less.
            </h1>
            <p className="text-[1rem] text-white/55 leading-relaxed">
              Hand-curated preset collections at one discounted price.
              Professional results without breaking the bank.
            </p>
          </div>
        </CinematicReveal>

        {/* ── Bundle grid ── */}
        {bundles.length === 0 ? (
          <div className="text-center py-20 text-white/30 text-[0.9rem]">
            No bundles available yet. Check back soon.
          </div>
        ) : (
          <CinematicStagger>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {bundles.map((bundle) => (
                <CinematicItem key={bundle.id}>
                  <BundleCard bundle={bundle} />
                </CinematicItem>
              ))}
            </div>
          </CinematicStagger>
        )}

      </Container>
    </main>
  )
}

function BundleCard({ bundle }: { bundle: BundleWithPresets }) {
  const savings  = bundle.savings
  const savingPct = bundle.totalValue > 0
    ? Math.round((savings / bundle.totalValue) * 100)
    : 0

  return (
    <Link
      href={`/bundles/${bundle.slug}`}
      className="group relative flex flex-col rounded-2xl border border-white/[0.06] bg-surface overflow-hidden hover:border-white/[0.12] transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/9] bg-white/[0.04] overflow-hidden">
        {bundle.thumbnailUrl ? (
          <img
            src={bundle.thumbnailUrl}
            alt={bundle.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/10">
            <PackIcon />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {bundle.badge && (
            <span className="text-[0.65rem] font-bold px-2 py-1 rounded-full bg-gold text-background">
              {bundle.badge}
            </span>
          )}
          {savingPct > 0 && (
            <span className="text-[0.65rem] font-bold px-2 py-1 rounded-full bg-green-500/90 text-background">
              Save {savingPct}%
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col gap-2 p-5">
        <h2 className="font-display font-bold text-[1.05rem] text-white/90 leading-snug group-hover:text-white transition-colors">
          {bundle.name}
        </h2>
        {bundle.tagline && (
          <p className="text-[0.8125rem] text-white/50 leading-relaxed line-clamp-2">{bundle.tagline}</p>
        )}
        <p className="text-[0.75rem] text-white/35 mt-auto">{bundle.presetCount} presets included</p>
      </div>

      {/* Pricing */}
      <div className="flex items-center justify-between px-5 pb-5">
        <div className="flex items-baseline gap-2">
          <span className="text-[1.25rem] font-bold text-gold">${bundle.bundlePriceUsd}</span>
          {bundle.compareAtPriceUsd && (
            <span className="text-[0.8125rem] text-white/30 line-through">${bundle.compareAtPriceUsd}</span>
          )}
        </div>
        {savings > 0 && (
          <span className="text-[0.75rem] text-green-400 font-medium">Save ${savings.toFixed(0)}</span>
        )}
      </div>
    </Link>
  )
}

function PackIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}
