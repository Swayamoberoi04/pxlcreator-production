import { notFound }          from "next/navigation"
import type { Metadata }      from "next"
import Image                  from "next/image"
import Link                   from "next/link"
import { Container }          from "@/components/layout/Container"
import { UnlockOrBuyPanel }   from "@/components/store/UnlockOrBuyPanel"
import { PresetProductGallery } from "@/components/store/PresetProductGallery"
import { getPresetBySlug, getRelatedPresets } from "@/lib/presets/repository"
import { trackPresetView }                    from "@/lib/presets/analytics"
import { PresetCard }         from "@/components/store/PresetCard"
import { cn }                 from "@/lib/utils"
import { siteConfig }         from "@/config/site"
import { productSchema, breadcrumbSchema } from "@/lib/seo/schemas"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"
import { ReviewList } from "@/components/store/ReviewList"
import { ReviewForm } from "@/components/store/ReviewForm"
import { generatePresetDescription, HOW_TO_UNLOCK_COPY } from "@/lib/presets/description-generator"

export const dynamic = "force-dynamic"

type PageProps = { params: Promise<{ slug: string }> }

/*
 * generateStaticParams intentionally removed.
 *
 * With `dynamic = "force-dynamic"` this page is fully server-rendered
 * on every request, so pre-generating static paths adds no value and
 * would require an extra DB query at build time.
 * New presets imported via YouTube go live instantly — no rebuild needed.
 */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const preset   = await getPresetBySlug(slug)
  if (!preset) return {}

  const pageUrl = `${siteConfig.url}/presets/${preset.slug}`
  const ogImage = preset.thumbnailUrl ?? siteConfig.ogImage

  return {
    title:       preset.seoTitle ?? preset.name,
    description: preset.seoDescription ?? preset.tagline,
    keywords:    [
      preset.name,
      preset.category,
      "lightroom preset",
      "photo editing",
      "PXL Creator",
      ...(preset.aiTags ?? []),
    ],
    alternates: { canonical: pageUrl },
    openGraph: {
      type:        "website",
      url:          pageUrl,
      title:        preset.seoTitle ?? preset.name,
      description:  preset.seoDescription ?? preset.tagline,
      images: [{ url: ogImage, width: 1200, height: 630, alt: preset.name }],
    },
    twitter: {
      card:        "summary_large_image",
      title:        preset.seoTitle ?? preset.name,
      description:  preset.seoDescription ?? preset.tagline,
      images:       [ogImage],
    },
  }
}

/* ── Badge colours ── */
const badgeStyles: Record<string, string> = {
  "Best Seller": "bg-gold text-background",
  "New":         "bg-surface-2 text-foreground border border-border",
  "Sale":        "bg-red-500/15 text-red-400 border border-red-500/25",
  "Free":        "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
}

export default async function PresetDetailPage({ params }: PageProps) {
  const { slug } = await params
  const preset   = await getPresetBySlug(slug)
  if (!preset) notFound()

  // Fire-and-forget — never awaited so it never delays the page
  void trackPresetView(preset.id)

  const discount = preset.originalPrice
    ? Math.round((1 - preset.price / preset.originalPrice) * 100)
    : null

  /* Related — same category, different id, max 3 */
  const related = await getRelatedPresets(preset.category, preset.id, 3)

  /* All gallery images including thumbnail */
  const allImages = [
    ...(preset.thumbnailUrl ? [preset.thumbnailUrl] : []),
    ...(preset.images ?? []),
  ]

  /* ── Structured data ── */
  const jsonLd = [
    productSchema(preset),
    breadcrumbSchema([
      { name: "Home",          url: siteConfig.url },
      { name: "Store",         url: `${siteConfig.url}/store` },
      { name: preset.category, url: `${siteConfig.url}/store` },
      { name: preset.name,     url: `${siteConfig.url}/presets/${preset.slug}` },
    ]),
  ]

  return (
    <div className="w-full bg-background">

      {/* ── JSON-LD structured data ── */}
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* ── Cinematic hero image — full bleed ── */}
      {preset.thumbnailUrl && (
        <div className="relative w-full h-[45vh] sm:h-[55vh] lg:h-[65vh] overflow-hidden">
          <Image
            src={preset.thumbnailUrl}
            alt={preset.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Cinematic letterbox */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[10%] bg-gradient-to-b from-background to-transparent" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-background via-background/70 to-transparent" />

          {/* Floating badge */}
          {preset.badge && (
            <div className="absolute top-6 left-6 z-10">
              <span className={cn("text-[0.7rem] font-bold tracking-widest uppercase rounded-full px-3 py-1.5", badgeStyles[preset.badge])}>
                {preset.badge === "Sale" && discount ? `−${discount}%` : preset.badge}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Page atmosphere ── */}
      <div className="relative">
        <LuminousEnvironment variant="gold" intensity={0.7} />
        <GrainOverlay opacity={0.016} zIndex={1} />

        <Container className="relative z-10 -mt-4 pb-14 sm:pb-20">

          {/* ── Breadcrumb ── */}
          <CinematicReveal variant="rise">
            <nav className="flex items-center gap-2 text-[0.75rem] text-muted/50 mb-8 pt-4" aria-label="Breadcrumb">
              <Link href="/store" className="hover:text-gold transition-colors">( Store )</Link>
              <span aria-hidden="true" className="text-muted/25">/</span>
              <Link href="/store" className="hover:text-gold transition-colors">( {preset.category} )</Link>
              <span aria-hidden="true" className="text-muted/25">/</span>
              <span className="text-muted/70">( {preset.name} )</span>
            </nav>
          </CinematicReveal>

          {/* ── Main grid: Gallery | Info ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 xl:gap-16 items-start">

            {/* ── LEFT — Gallery ── */}
            <CinematicReveal variant="depth" delay={0.05}>
              <PresetProductGallery
                images={allImages}
                beforeUrl={preset.beforeUrl}
                afterUrl={preset.afterUrl}
                name={preset.name}
                beforeAfterExplanation={preset.beforeAfterExplanation}
              />
            </CinematicReveal>

            {/* ── RIGHT — Sticky purchase panel ── */}
            <CinematicReveal variant="rise" delay={0.12}>
              <div className="depth-card flex flex-col gap-6 lg:sticky lg:top-24 rounded-2xl border border-border/60 bg-surface/60 backdrop-blur-sm p-6 shadow-[0_0_60px_rgba(255,214,10,0.08)]">

                {/* Category + name */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-px w-5 bg-gold/60" aria-hidden="true" />
                    <span className="text-label text-gold/80 tracking-widest animate-gold-flicker">( {preset.category} )</span>
                  </div>
                  <h1 className="font-display font-black text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.05] tracking-tight text-foreground">
                    {preset.name}
                  </h1>
                  <p className="text-[1rem] text-muted/70 leading-relaxed">{preset.tagline}</p>

                  {/* Hook */}
                  {preset.hook && (
                    <p className="text-[0.9rem] font-semibold text-foreground/85 leading-snug border-l-2 border-gold/50 pl-3 mt-1">
                      {preset.hook}
                    </p>
                  )}
                </div>

                {/* Rating row — only shown when real reviews exist */}
                {preset.reviewCount && preset.reviewCount > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon key={i} filled={i < Math.round(preset.rating ?? 0)} />
                      ))}
                    </div>
                    <span className="text-[0.875rem] font-medium text-foreground">{preset.rating?.toFixed(1)}</span>
                    <span className="text-[0.8125rem] text-muted/50">
                      ( {preset.reviewCount.toLocaleString()} reviews )
                    </span>
                  </div>
                )}

                {/* Price block */}
                <div className="flex items-baseline gap-3 py-4 border-y border-border">
                  <span className={cn(
                    "font-display font-black text-[2.5rem] leading-none",
                    preset.isFree ? "text-emerald-400" : "text-gold"
                  )}>
                    {preset.isFree ? "Free" : `$${preset.price}`}
                  </span>
                  {preset.originalPrice && (
                    <>
                      <span className="text-[1.125rem] text-muted/50 line-through">${preset.originalPrice}</span>
                      <span className="text-[0.75rem] font-bold text-red-400 bg-red-500/10 rounded-full px-2.5 py-1">
                        Save {discount}%
                      </span>
                    </>
                  )}
                </div>

                {/* Pack size chip */}
                {preset.includeCount && (
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border bg-surface text-[0.75rem] font-medium text-muted/70 px-3 py-1.5">
                      ( {preset.includeCount} presets included )
                    </span>
                  </div>
                )}

                {/* Features */}
                {preset.features && preset.features.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-label text-muted/50 tracking-widest">( What&apos;s included )</p>
                    <ul className="flex flex-col gap-2" role="list">
                      {preset.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5">
                          <span className="mt-0.5 shrink-0 text-gold"><CheckIcon /></span>
                          <span className="text-[0.875rem] text-foreground/80 leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Compatibility chips */}
                {preset.compatibility && preset.compatibility.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-label text-muted/50 tracking-widest">( Compatible with )</p>
                    <div className="flex flex-wrap gap-2">
                      {preset.compatibility.map((app) => (
                        <span key={app} className="text-[0.75rem] text-muted/60 bg-surface border border-border rounded-full px-3 py-1">
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Best use case + ideal lighting */}
                {(preset.bestUseCase || preset.idealLighting) && (
                  <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-surface-2/40 px-4 py-3">
                    {preset.bestUseCase && (
                      <div className="flex gap-2.5 text-[0.8rem]">
                        <span className="shrink-0 text-muted/40 font-medium min-w-[5rem]">Best for</span>
                        <span className="text-foreground/70 leading-snug">{preset.bestUseCase}</span>
                      </div>
                    )}
                    {preset.idealLighting && (
                      <div className="flex gap-2.5 text-[0.8rem]">
                        <span className="shrink-0 text-muted/40 font-medium min-w-[5rem]">Lighting</span>
                        <span className="text-foreground/70 leading-snug">{preset.idealLighting}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Difficulty + included files */}
                {(preset.difficultyLevel || preset.includedFiles) && (
                  <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-surface-2/40 px-4 py-3">
                    {preset.difficultyLevel && (
                      <div className="flex gap-2.5 text-[0.8rem]">
                        <span className="shrink-0 text-muted/40 font-medium min-w-[5rem]">Difficulty</span>
                        <span className={`font-semibold ${
                          preset.difficultyLevel === "Beginner"     ? "text-emerald-400" :
                          preset.difficultyLevel === "Intermediate" ? "text-gold/80" :
                          "text-rose-400"
                        }`}>{preset.difficultyLevel}</span>
                      </div>
                    )}
                    {preset.includedFiles && preset.includedFiles.length > 0 && (
                      <div className="flex gap-2.5 text-[0.8rem]">
                        <span className="shrink-0 text-muted/40 font-medium min-w-[5rem]">Files</span>
                        <div className="flex flex-col gap-0.5">
                          {preset.includedFiles.map((f) => (
                            <span key={f} className="text-foreground/70 leading-snug">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Camera types */}
                {preset.cameraTypes && preset.cameraTypes.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-label text-muted/50 tracking-widest">( Recommended cameras )</p>
                    <div className="flex flex-wrap gap-2">
                      {preset.cameraTypes.map((cam) => (
                        <span key={cam} className="text-[0.72rem] text-muted/60 bg-surface border border-border rounded-full px-3 py-1">
                          {cam}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA — unified unlock or buy panel */}
                <div className="flex flex-col gap-3 pt-1">
                  <UnlockOrBuyPanel preset={preset} />
                </div>

                {/* Trust strip */}
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {[
                    "( Instant access )",
                    "( Lifetime ownership )",
                    "( .xmp + .dng )",
                    ...(!preset.isFree ? ["( Free YouTube unlock )"] : []),
                  ].map((t) => (
                    <span key={t} className="text-[0.7rem] font-medium text-muted/40 rounded-full border border-border/50 px-2.5 py-1">
                      {t}
                    </span>
                  ))}
                </div>

              </div>
            </CinematicReveal>
          </div>

          {/* ── About this preset (generated description) ── */}
          <CinematicReveal variant="rise" delay={0.1}>
            <div className="mt-16 sm:mt-20 max-w-prose">
              <div className="flex items-center gap-3 mb-5">
                <span className="h-px w-6 bg-gold/50" aria-hidden="true" />
                <span className="text-label text-gold/70 tracking-widest">( About this preset )</span>
              </div>
              <div className="flex flex-col gap-4">
                {generatePresetDescription({
                  name:        preset.name,
                  slug:        preset.slug,
                  category:    preset.category,
                  aiTags:      preset.aiTags,
                  tagline:     preset.tagline ?? undefined,
                  bestUseCase: preset.bestUseCase ?? undefined,
                  isFree:      preset.isFree,
                })
                  .split("\n\n")
                  .map((para, i) => (
                    <p key={i} className="text-[0.9375rem] text-muted/65 leading-[1.85]">{para}</p>
                  ))}
              </div>
            </div>
          </CinematicReveal>

          {/* ── How to Access ── */}
          {!preset.isFree && (
            <CinematicReveal variant="rise" delay={0.05}>
              <div className="mt-10 max-w-prose rounded-2xl border border-border/60 bg-surface/50 backdrop-blur-sm px-6 py-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-gold/25 bg-gold/[0.08] text-gold">
                    <KeyIcon />
                  </span>
                  <h2 className="text-[0.9375rem] font-semibold text-foreground">
                    {HOW_TO_UNLOCK_COPY.heading}
                  </h2>
                </div>
                <div className="flex flex-col gap-3 pl-11">
                  {HOW_TO_UNLOCK_COPY.body.map((para, i) => (
                    <p key={i} className="text-[0.875rem] text-muted/60 leading-relaxed">{para}</p>
                  ))}
                </div>
              </div>
            </CinematicReveal>
          )}

          {/* ── Reviews ── */}
          <div className="mt-14 sm:mt-20">
            <CinematicReveal variant="rise">
              <div className="flex items-center gap-3 mb-8">
                <span className="h-px w-6 bg-gold/50" aria-hidden="true" />
                <span className="text-label text-gold/70 tracking-widest">( Reviews )</span>
              </div>
            </CinematicReveal>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 xl:gap-16">
              {/* Left — existing reviews */}
              <CinematicReveal variant="depth" delay={0.05}>
                <ReviewList presetSlug={preset.slug} />
              </CinematicReveal>

              {/* Right — submit a review (only for users with access) */}
              <CinematicReveal variant="rise" delay={0.1}>
                <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/60 px-5 py-5">
                  <div className="flex flex-col gap-1">
                    <p className="text-[0.875rem] font-semibold text-foreground">Leave a review</p>
                    <p className="text-[0.8rem] text-muted/55 leading-relaxed">
                      Purchased or unlocked this preset? Share your experience — reviews go live after moderation.
                    </p>
                  </div>
                  <ReviewForm presetSlug={preset.slug} />
                </div>
              </CinematicReveal>
            </div>
          </div>

          {/* ── Related presets ── */}
          {related.length > 0 && (
            <div className="mt-20 sm:mt-28">
              <CinematicReveal variant="depth">
                <div className="flex items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <span className="h-px w-6 bg-gold/50" aria-hidden="true" />
                    <span className="font-display font-bold text-[1.125rem] text-foreground">
                      ( You might also like )
                    </span>
                  </div>
                  <Link href="/store" className="text-[0.8125rem] text-muted/50 hover:text-gold transition-colors">
                    View all →
                  </Link>
                </div>
              </CinematicReveal>
              <CinematicStagger stagger={0.1} baseDelay={0.05} itemVariant="depth" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {related.map((p) => (
                  <CinematicItem key={p.id} variant="depth">
                    <PresetCard preset={p} />
                  </CinematicItem>
                ))}
              </CinematicStagger>
            </div>
          )}

        </Container>
      </div>
    </div>
  )
}

/* ── Icons ── */
function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "#C9A84C" : "none"} stroke={filled ? "none" : "#444"} strokeWidth="1.5" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  )
}
function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}
function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="7.5" cy="15.5" r="5.5"/>
      <path d="M21 2l-9.6 9.6"/>
      <path d="M15.5 7.5l3 3L22 7l-3-3"/>
    </svg>
  )
}
