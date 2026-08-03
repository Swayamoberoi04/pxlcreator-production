import type { Metadata }       from "next"
import { notFound }            from "next/navigation"
import Link                    from "next/link"
import { getBundleBySlug } from "@/lib/bundles/repository"
import { Container }           from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"
import { CinematicBackground } from "@/components/ui/CinematicBackground"
import { CinematicReveal }     from "@/components/ui/CinematicReveal"
import { siteConfig }          from "@/config/site"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const bundle   = await getBundleBySlug(slug)
  if (!bundle) return { title: "Bundle Not Found" }
  return {
    title:       bundle.seoTitle ?? `${bundle.name} — PXL Creator`,
    description: bundle.seoDescription ?? bundle.tagline ?? undefined,
    openGraph: {
      images: bundle.bannerUrl ? [bundle.bannerUrl] : bundle.thumbnailUrl ? [bundle.thumbnailUrl] : [],
    },
  }
}

export default async function BundleDetailPage({ params }: Props) {
  const { slug } = await params
  const bundle   = await getBundleBySlug(slug)
  if (!bundle) notFound()

  const savingPct = bundle.totalValue > 0
    ? Math.round((bundle.savings / bundle.totalValue) * 100)
    : 0

  return (
    <main className="relative min-h-screen bg-background overflow-x-hidden">
      <GrainOverlay />
      <LuminousEnvironment />
      <CinematicBackground />

      {/* ── Banner ── */}
      {bundle.bannerUrl && (
        <div className="relative w-full h-[340px] sm:h-[420px] overflow-hidden">
          <img src={bundle.bannerUrl} alt={bundle.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
      )}

      <Container className={bundle.bannerUrl ? "pt-0 pb-24" : "pt-28 pb-24"}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 items-start">

          {/* ── Left ── */}
          <div className="flex flex-col gap-10">
            <CinematicReveal>
              <div className="flex flex-col gap-4">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-[0.75rem] text-white/35">
                  <Link href="/bundles" className="hover:text-white/60 transition-colors">Bundles</Link>
                  <span>/</span>
                  <span className="text-white/55">{bundle.name}</span>
                </nav>

                {/* Badges */}
                <div className="flex gap-2">
                  {bundle.badge && (
                    <span className="text-[0.7rem] font-bold px-2.5 py-1 rounded-full bg-gold text-background">
                      {bundle.badge}
                    </span>
                  )}
                  {savingPct > 0 && (
                    <span className="text-[0.7rem] font-bold px-2.5 py-1 rounded-full bg-green-500/90 text-background">
                      Save {savingPct}%
                    </span>
                  )}
                </div>

                <h1 className="font-display font-bold text-[2.25rem] sm:text-[2.75rem] text-white/92 leading-tight">
                  {bundle.name}
                </h1>

                {bundle.tagline && (
                  <p className="text-[1rem] text-white/55 leading-relaxed">{bundle.tagline}</p>
                )}

                {bundle.description && (
                  <div className="text-[0.9rem] text-white/60 leading-relaxed whitespace-pre-line border-t border-white/[0.06] pt-6 mt-2">
                    {bundle.description}
                  </div>
                )}
              </div>
            </CinematicReveal>

            {/* ── Included Presets ── */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-[0.75rem] text-white/35 tracking-widest">
                  {bundle.presetCount} PRESETS INCLUDED
                </span>
                <span className="h-px flex-1 bg-white/[0.06]" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {bundle.presets.map((preset) => (
                  <Link
                    key={preset.presetId}
                    href={`/store/${preset.slug}`}
                    className="group flex flex-col rounded-xl border border-white/[0.06] bg-surface overflow-hidden hover:border-white/[0.12] transition-all"
                  >
                    <div className="aspect-square bg-white/[0.04] overflow-hidden">
                      {preset.thumbnailUrl ? (
                        <img
                          src={preset.thumbnailUrl}
                          alt={preset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-white/[0.04] to-transparent" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-[0.8125rem] font-medium text-white/80 truncate group-hover:text-white transition-colors">
                        {preset.name}
                      </p>
                      <p className="text-[0.7rem] text-white/35 mt-0.5">${preset.priceUsd} individually</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Sticky purchase panel ── */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-white/[0.08] bg-surface p-6 flex flex-col gap-5">

              {bundle.thumbnailUrl && !bundle.bannerUrl && (
                <div className="rounded-xl overflow-hidden aspect-[4/3] w-full">
                  <img src={bundle.thumbnailUrl} alt={bundle.name} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[2rem] font-bold text-gold">${bundle.bundlePriceUsd}</span>
                  {bundle.compareAtPriceUsd && (
                    <span className="text-[1rem] text-white/30 line-through">${bundle.compareAtPriceUsd}</span>
                  )}
                </div>
                {bundle.savings > 0 && (
                  <p className="text-[0.875rem] text-green-400">
                    You save ${bundle.savings.toFixed(2)} vs buying individually
                  </p>
                )}
              </div>

              {/* Value breakdown */}
              <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-4">
                <div className="flex items-center justify-between text-[0.8125rem]">
                  <span className="text-white/45">{bundle.presetCount} presets, total value</span>
                  <span className="text-white/60">${bundle.totalValue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[0.8125rem]">
                  <span className="text-white/45">Bundle price</span>
                  <span className="text-gold font-bold">${bundle.bundlePriceUsd.toFixed(2)}</span>
                </div>
                {bundle.savings > 0 && (
                  <div className="flex items-center justify-between text-[0.8125rem]">
                    <span className="text-green-400">Your savings</span>
                    <span className="text-green-400 font-bold">−${bundle.savings.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* CTA */}
              <button
                type="button"
                className="w-full rounded-xl bg-gold text-background font-bold py-4 text-[1rem] hover:bg-gold-dim transition-all active:scale-[0.98]"
              >
                Buy Bundle — ${bundle.bundlePriceUsd}
              </button>

              <p className="text-center text-[0.75rem] text-white/30">
                Instant download after purchase
              </p>
            </div>
          </div>

        </div>
      </Container>
    </main>
  )
}
