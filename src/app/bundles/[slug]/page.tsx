/**
 * src/app/bundles/[slug]/page.tsx
 *
 * /bundles/:slug — Bundle detail page.
 *
 * Server component — fetches bundle data at request time.
 * Layout: two-column on desktop (content | sticky sidebar).
 *
 * Architecture:
 *   - All static content (description, included packs, features) is server-rendered.
 *   - BundleSidebarCTA is a client component (uses currency + cart stores).
 */

import type { Metadata }         from "next"
import { notFound }              from "next/navigation"
import Image                     from "next/image"
import Link                      from "next/link"
import { getBundleBySlug }       from "@/lib/bundles/repository"
import { BundlePresetsList }     from "@/components/bundles/BundlePresetsList"
import { BundleSidebarCTA }      from "@/components/bundles/BundleSidebarCTA"
import { cn }                    from "@/lib/utils"
import { siteConfig }            from "@/config/site"
import { bundleProductSchema, breadcrumbSchema } from "@/lib/seo/schemas"
import { LuminousEnvironment }   from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }          from "@/components/ui/GrainOverlay"

/* ── Static params for SSG ──────────────────────────────── */

export async function generateStaticParams() {
  // Use static data for build-time generation (avoids Supabase call at build)
  const { ALL_BUNDLES } = await import("@/data/bundles")
  return ALL_BUNDLES.map((b) => ({ slug: b.slug }))
}

/* ── Metadata ───────────────────────────────────────────── */

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug }  = await params
  const bundle    = await getBundleBySlug(slug)

  if (!bundle) return { title: "Bundle Not Found — PXL Creator" }

  const totalPresets = bundle.includeCount
    ?? bundle.includedPacks.reduce((s, p) => s + p.presetCount, 0)

  const savings = bundle.individualValueUsd > 0
    ? Math.round((1 - bundle.price / bundle.individualValueUsd) * 100)
    : 0

  const pageUrl = `${siteConfig.url}/bundles/${bundle.slug}`
  const ogImage = bundle.thumbnailUrl ?? siteConfig.ogImage

  return {
    title:       bundle.name,
    description: `${totalPresets} Lightroom presets. Save ${savings}% vs buying separately. ${bundle.tagline}`,
    keywords:    [
      bundle.name,
      "lightroom preset bundle",
      "cinematic presets bundle",
      "photo editing bundle",
      "PXL Creator",
      ...bundle.useCases,
    ],
    alternates: { canonical: pageUrl },
    openGraph: {
      type:        "website",
      url:          pageUrl,
      title:        bundle.name,
      description:  bundle.tagline,
      images: [{ url: ogImage, width: 1200, height: 630, alt: bundle.name }],
    },
    twitter: {
      card:        "summary_large_image",
      title:        bundle.name,
      description:  bundle.tagline,
      images:       [ogImage],
    },
  }
}

/* ── Page ───────────────────────────────────────────────── */

export default async function BundleDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const bundle   = await getBundleBySlug(slug)

  if (!bundle) notFound()

  const totalPresets = bundle.includeCount
    ?? bundle.includedPacks.reduce((s, p) => s + p.presetCount, 0)

  const savingsPercent = bundle.individualValueUsd > 0
    ? Math.round((1 - bundle.price / bundle.individualValueUsd) * 100)
    : 0

  /* ── Structured data ── */
  const jsonLd = [
    bundleProductSchema(bundle),
    breadcrumbSchema([
      { name: "Home",    url: siteConfig.url },
      { name: "Bundles", url: `${siteConfig.url}/bundles` },
      { name: bundle.name, url: `${siteConfig.url}/bundles/${bundle.slug}` },
    ]),
  ]

  return (
    <main className="relative min-h-screen bg-background overflow-hidden">

      {/* Living gold atmosphere behind the whole page */}
      <LuminousEnvironment variant="gold" intensity={0.65} />
      <GrainOverlay opacity={0.015} zIndex={1} />

      {/* ── JSON-LD structured data ── */}
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* ── Breadcrumb ──────────────────────────────── */}
      <div className="relative z-10 border-b border-border/30 px-4 py-3">
        <nav
          aria-label="Breadcrumb"
          className="mx-auto max-w-7xl flex items-center gap-1.5 text-[0.75rem] text-muted/70"
        >
          <Link href="/"       className="hover:text-muted/85 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/bundles" className="hover:text-muted/85 transition-colors">Bundles</Link>
          <span>/</span>
          <span className="text-muted/85">{bundle.name}</span>
        </nav>
      </div>

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative z-10">
        {/* Full-width thumbnail */}
        <div className="relative w-full h-[220px] sm:h-[320px] overflow-hidden bg-[#0d0c08]">
          {bundle.thumbnailUrl ? (
            <Image
              src={bundle.thumbnailUrl}
              alt={bundle.name}
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-60"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1c1600] via-[#100e06] to-[#070600]">
              <div aria-hidden className="absolute inset-0 flex items-end justify-center gap-[4px] pb-6 opacity-10">
                {Array.from({ length: 11 }).map((_, i) => (
                  <div key={i} className="w-[3px] rounded-full bg-gold"
                    style={{ height: `${25 + Math.abs(5 - i) * 7}%` }}
                  />
                ))}
              </div>
            </div>
          )}
          {/* Gradient overlay — strong at bottom for text legibility */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

          {/* Hero text overlay */}
          <div className="absolute bottom-0 inset-x-0 px-4 sm:px-8 pb-6 sm:pb-10">
            <div className="mx-auto max-w-7xl flex items-end justify-between gap-4">
              <div>
                {/* Bundle badge */}
                <span className={cn(
                  "inline-block text-[0.625rem] font-bold tracking-widest uppercase rounded-full px-2.5 py-[5px] mb-3",
                  "bg-gold/15 text-gold border border-gold/25"
                )}>
                  {bundle.bundleBadge}
                </span>
                <h1 className="font-display text-[1.75rem] sm:text-[2.5rem] font-bold text-foreground leading-[1.1]">
                  {bundle.name}
                </h1>
                <p className="mt-1.5 text-[0.9375rem] text-muted/85 max-w-lg">
                  {bundle.tagline}
                </p>
              </div>

              {/* Stats — desktop only */}
              <div className="hidden md:flex items-center gap-6 pb-1 flex-shrink-0">
                <div className="text-center">
                  <p className="text-[1.5rem] font-bold text-gold leading-none">{totalPresets}</p>
                  <p className="text-[0.625rem] text-muted/70 mt-0.5 uppercase tracking-wide">Presets</p>
                </div>
                {savingsPercent > 0 && (
                  <div className="text-center">
                    <p className="text-[1.5rem] font-bold text-emerald-400 leading-none">{savingsPercent}%</p>
                    <p className="text-[0.625rem] text-muted/70 mt-0.5 uppercase tracking-wide">Savings</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-[1.5rem] font-bold text-foreground/92 leading-none">{bundle.includedPacks.length}</p>
                  <p className="text-[0.625rem] text-muted/70 mt-0.5 uppercase tracking-wide">Packs</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content + Sidebar ───────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-10">
        <div className="grid lg:grid-cols-[1fr_360px] gap-10 lg:gap-14 items-start">

          {/* ── Left: content ─────────────────────── */}
          <div className="space-y-10">

            {/* Mobile stats row */}
            <div className="flex items-center gap-6 md:hidden">
              {[
                { value: totalPresets,     label: "Presets" },
                { value: `${savingsPercent}%`, label: "Savings" },
                { value: bundle.includedPacks.length, label: "Packs" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-[1.25rem] font-bold text-gold leading-none">{value}</p>
                  <p className="text-[0.625rem] text-muted/70 mt-0.5 uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>

            {/* What's Inside */}
            <div>
              <SectionLabel>What&apos;s Inside</SectionLabel>
              <h2 className="text-[1.25rem] font-bold text-foreground mb-5">
                {bundle.includedPacks.length} packs · {totalPresets} total presets
              </h2>
              <BundlePresetsList packs={bundle.includedPacks} />
            </div>

            {/* Description */}
            {bundle.description && (
              <div>
                <SectionLabel>About This Bundle</SectionLabel>
                <p className="text-[0.9375rem] text-muted/85 leading-[1.8] whitespace-pre-line">
                  {bundle.description}
                </p>
              </div>
            )}

            {/* Why Creators Love It */}
            {bundle.whyCreatorsLoveIt && (
              <div className="rounded-2xl bg-gold/[0.05] border border-gold/15 p-6">
                <SectionLabel>Why Creators Love It</SectionLabel>
                <p className="text-[0.9375rem] text-muted/85 leading-[1.8]">
                  {bundle.whyCreatorsLoveIt}
                </p>
              </div>
            )}

            {/* Features */}
            {bundle.features && bundle.features.length > 0 && (
              <div>
                <SectionLabel>What You Get</SectionLabel>
                <ul className="space-y-2.5">
                  {bundle.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="mt-[3px] flex-shrink-0 text-gold/60">
                        <SmallCheckIcon />
                      </span>
                      <span className="text-[0.875rem] text-muted/85 leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Target Audience */}
            {bundle.targetAudience && bundle.targetAudience.length > 0 && (
              <div>
                <SectionLabel>Who This Is For</SectionLabel>
                <div className="flex flex-wrap gap-2 mt-3">
                  {bundle.targetAudience.map((audience) => (
                    <span
                      key={audience}
                      className="text-[0.8125rem] font-medium text-muted/85 bg-surface-2/60 border border-border/50 rounded-full px-3 py-1.5"
                    >
                      {audience}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Use Cases */}
            {bundle.useCases && bundle.useCases.length > 0 && (
              <div>
                <SectionLabel>Use Cases</SectionLabel>
                <div className="flex flex-wrap gap-2 mt-3">
                  {bundle.useCases.map((tag) => (
                    <span
                      key={tag}
                      className="text-[0.75rem] font-semibold text-gold/50 bg-gold/[0.06] border border-gold/10 rounded-full px-3 py-1.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Compatibility */}
            {bundle.compatibility && bundle.compatibility.length > 0 && (
              <div>
                <SectionLabel>Compatible With</SectionLabel>
                <div className="flex flex-wrap gap-2 mt-3">
                  {bundle.compatibility.map((app) => (
                    <span
                      key={app}
                      className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted/85 bg-surface-2/50 border border-border/40 rounded-lg px-3 py-1.5"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-gold/50 flex-shrink-0" />
                      {app}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile CTA */}
            <div className="lg:hidden">
              <BundleSidebarCTA bundle={bundle} />
            </div>

          </div>

          {/* ── Right: sticky sidebar ─────────────── */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <BundleSidebarCTA bundle={bundle} />
            </div>
          </div>

        </div>
      </div>

      {/* ── Related bundles nudge ───────────────────── */}
      <div className="border-t border-border/30 py-10 px-4">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-[0.8125rem] text-muted/70 mb-2">
            Looking for more?
          </p>
          <Link
            href="/bundles"
            className="inline-flex items-center gap-2 text-[0.875rem] font-semibold text-gold/60 hover:text-gold transition-colors"
          >
            Browse all bundles
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>
      </div>
    </main>
  )
}

/* ── Sub-components ─────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.6875rem] font-bold tracking-[0.2em] uppercase text-gold/50 mb-2">
      {children}
    </p>
  )
}

function SmallCheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
