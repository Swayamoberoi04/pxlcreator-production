import { notFound }         from "next/navigation"
import type { Metadata }     from "next"
import Link                  from "next/link"
import { Container }         from "@/components/layout/Container"
import { UnlockOrBuyPanel }  from "@/components/store/UnlockOrBuyPanel"
import { BeforeAfterSlider } from "@/components/ui/BeforeAfterSlider"
import { PresetCard }        from "@/components/store/PresetCard"
import { ReviewList }        from "@/components/store/ReviewList"
import { ReviewForm }        from "@/components/store/ReviewForm"
import { getPresetBySlug, getRelatedPresets } from "@/lib/presets/repository"
import { trackPresetView }   from "@/lib/presets/analytics"
import { siteConfig }        from "@/config/site"
import { productSchema, breadcrumbSchema } from "@/lib/seo/schemas"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }       from "@/components/ui/GrainOverlay"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"
import { cn }                from "@/lib/utils"
import Image                 from "next/image"
import { generatePresetDescription, HOW_TO_UNLOCK_COPY } from "@/lib/presets/description-generator"

export const dynamic = "force-dynamic"

type PageProps = { params: Promise<{ slug: string }> }

/* ─── SEO ─────────────────────────────────────────────────────── */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const preset   = await getPresetBySlug(slug)
  if (!preset) return {}

  const pageUrl = `${siteConfig.url}/store/${preset.slug}`
  const ogImage = preset.thumbnailUrl ?? siteConfig.ogImage

  const longTailTitle = preset.seoTitle
    ?? `${preset.name} — Cinematic ${preset.category} Lightroom Preset | PXL Creator`

  const longTailDesc = preset.seoDescription
    ?? `${preset.tagline}. Download ${preset.name} for Lightroom Mobile & Desktop. ${preset.includeCount ?? ""} presets, XMP + DNG. Made for mobile creators by PXL Creator.`

  return {
    title:       longTailTitle,
    description: longTailDesc,
    keywords: [
      preset.name,
      `${preset.category.toLowerCase()} lightroom preset`,
      `cinematic ${preset.category.toLowerCase()} mobile preset`,
      "lightroom mobile preset",
      "iphone photo editing",
      "PXL Creator",
      ...(preset.aiTags ?? []),
    ],
    alternates: { canonical: pageUrl },
    openGraph: {
      type:        "website",
      url:          pageUrl,
      title:        longTailTitle,
      description:  longTailDesc,
      images: [{ url: ogImage, width: 1200, height: 630, alt: preset.name }],
    },
    twitter: {
      card:        "summary_large_image",
      title:        longTailTitle,
      description:  longTailDesc,
      images:       [ogImage],
    },
  }
}

/* ─── Badge colours ────────────────────────────────────────────── */

const badgeStyles: Record<string, string> = {
  "Best Seller": "bg-gold text-background",
  "New":         "bg-surface-2 text-foreground border border-border",
  "Sale":        "bg-red-500/15 text-red-400 border border-red-500/25",
  "Free":        "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  "Popular":     "bg-gold/15 text-gold border border-gold/25",
  "Creator Pick":"bg-gold/15 text-gold border border-gold/25",
  "Trending":    "bg-purple-500/15 text-purple-300 border border-purple-500/25",
}

/* ─── FAQ data ─────────────────────────────────────────────────── */

const FAQ_ITEMS = [
  {
    q: "How do I install on Lightroom Mobile?",
    a: "Download the .dng file → import it into Lightroom Mobile → open it → tap the three dots → Copy Settings → paste onto your photo. Full guide included in your download.",
  },
  {
    q: "What about Lightroom Desktop / Classic?",
    a: "Import the .xmp file via File → Import Profiles & Presets. It will appear in your Develop panel under User Presets.",
  },
  {
    q: "What apps are compatible?",
    a: "Adobe Lightroom Mobile (iOS & Android), Lightroom Desktop, and Lightroom Classic. LUTs work in any app that supports .cube files.",
  },
  {
    q: "Do I need a paid Lightroom subscription?",
    a: "No. Lightroom Mobile is free and fully compatible with all PXL presets.",
  },
  {
    q: "What is your refund policy?",
    a: "Because presets are digital downloads, all sales are final once accessed. If you experience a technical issue, reach us at support@pxlcreator.com and we will resolve it.",
  },
  {
    q: "Can I use these for commercial work?",
    a: "Yes. A single-seat commercial license is included. You may use PXL presets in paid client work and social content.",
  },
]

/* ─── Page ─────────────────────────────────────────────────────── */

export default async function StorePresetPage({ params }: PageProps) {
  const { slug } = await params
  const preset   = await getPresetBySlug(slug)
  if (!preset) notFound()

  void trackPresetView(preset.id)

  const discount = preset.originalPrice
    ? Math.round((1 - preset.price / preset.originalPrice) * 100)
    : null

  const related   = await getRelatedPresets(preset.category, preset.id, 3)
  const hasSlider = Boolean(preset.beforeUrl && preset.afterUrl)
  const allImages = [
    ...(preset.thumbnailUrl ? [preset.thumbnailUrl] : []),
    ...(preset.images ?? []),
  ]

  const isMobile = preset.cameraTypes?.some((c) =>
    /phone|mobile|iphone|android|pixel/i.test(c)
  ) ?? false

  /* Structured data */
  const jsonLd = [
    productSchema(preset),
    breadcrumbSchema([
      { name: "Home",          url: siteConfig.url },
      { name: "Store",         url: `${siteConfig.url}/store` },
      { name: preset.category, url: `${siteConfig.url}/store?category=${preset.category}` },
      { name: preset.name,     url: `${siteConfig.url}/store/${preset.slug}` },
    ]),
  ]

  return (
    <div className="w-full bg-background">

      {/* JSON-LD */}
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      {/* ── HERO: before/after slider or thumbnail ──────────── */}
      <section className="w-full">
        {hasSlider ? (
          <BeforeAfterSlider
            beforeSrc={preset.beforeUrl!}
            afterSrc={preset.afterUrl!}
            alt={preset.name}
            label={preset.beforeAfterExplanation ?? preset.name}
            className="w-full rounded-none"
            height={520}
          />
        ) : preset.thumbnailUrl ? (
          <div className="relative w-full h-[45vh] sm:h-[55vh] lg:h-[65vh] overflow-hidden">
            <Image
              src={preset.thumbnailUrl}
              alt={preset.name}
              fill priority
              sizes="100vw"
              className="object-cover"
            />
            <div aria-hidden className="absolute inset-x-0 top-0 h-[10%] bg-gradient-to-b from-background to-transparent" />
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-background via-background/70 to-transparent" />
          </div>
        ) : null}
      </section>

      {/* ── BODY ─────────────────────────────────────────────── */}
      <div className="relative">
        <LuminousEnvironment variant="gold" intensity={0.6} />
        <GrainOverlay opacity={0.016} zIndex={1} />

        <Container className="relative z-10 -mt-2 pb-14 sm:pb-20">

          {/* Breadcrumb */}
          <CinematicReveal variant="rise">
            <nav aria-label="Breadcrumb"
              className="flex items-center gap-2 text-[0.75rem] text-muted/85 mb-8 pt-6">
              <Link href="/store" className="hover:text-gold transition-colors">Store</Link>
              <span aria-hidden className="text-muted/70">/</span>
              <Link href={`/store?category=${preset.category}`}
                className="hover:text-gold transition-colors">{preset.category}</Link>
              <span aria-hidden className="text-muted/70">/</span>
              <span className="text-muted/92 truncate max-w-[160px]">{preset.name}</span>
            </nav>
          </CinematicReveal>

          {/* ── MAIN GRID ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 xl:gap-16 items-start">

            {/* LEFT — Gallery strip */}
            {allImages.length > 1 && (
              <CinematicReveal variant="depth" delay={0.05}>
                <div className="flex flex-col gap-4">
                  {/* "One preset, many scenes" label */}
                  <div className="flex items-center gap-3">
                    <span className="h-px w-5 bg-gold/50" aria-hidden />
                    <span className="text-[0.65rem] font-bold uppercase tracking-widest text-gold/70">
                      One Preset — Many Scenes
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {allImages.slice(0, 6).map((src, i) => (
                      <div key={i}
                        className="relative aspect-[4/3] rounded-xl overflow-hidden bg-surface-2 group">
                        <Image
                          src={src}
                          alt={`${preset.name} scene ${i + 1}`}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ))}
                  </div>
                  {/* Secondary before/after below gallery if slider was shown as hero */}
                  {!hasSlider && preset.beforeUrl && preset.afterUrl && (
                    <div className="mt-2">
                      <BeforeAfterSlider
                        beforeSrc={preset.beforeUrl}
                        afterSrc={preset.afterUrl}
                        alt={preset.name}
                        label={preset.beforeAfterExplanation}
                        height={340}
                      />
                    </div>
                  )}
                </div>
              </CinematicReveal>
            )}

            {/* RIGHT — Sticky purchase panel */}
            <CinematicReveal variant="rise" delay={0.12}>
              <div className={cn(
                "flex flex-col gap-6 lg:sticky lg:top-24",
                "rounded-2xl border border-border/60 bg-surface/60 backdrop-blur-sm p-6",
                "shadow-[0_0_60px_rgba(255,214,10,0.08)]",
              )}>

                {/* Category + badges row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[0.65rem] font-bold uppercase tracking-widest text-gold/70">
                    {preset.category}
                  </span>
                  {isMobile && (
                    <span className="text-[0.6rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-gold/80">
                      Shot on Phone · No DSLR
                    </span>
                  )}
                  {preset.badge && (
                    <span className={cn(
                      "text-[0.6rem] font-bold tracking-widest uppercase rounded-full px-2.5 py-0.5",
                      badgeStyles[preset.badge] ?? "bg-surface-2 text-muted border border-border"
                    )}>
                      {preset.badge === "Sale" && discount ? `−${discount}%` : preset.badge}
                    </span>
                  )}
                </div>

                {/* Name + tagline */}
                <div className="flex flex-col gap-2">
                  <h1 className="font-display font-black text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.05] tracking-tight text-foreground">
                    {preset.name}
                  </h1>
                  <p className="text-[1rem] text-muted/92 leading-relaxed">{preset.tagline}</p>
                  {preset.hook && (
                    <p className="text-[0.9rem] font-semibold text-foreground/92 leading-snug border-l-2 border-gold/50 pl-3 mt-1">
                      {preset.hook}
                    </p>
                  )}
                </div>

                {/* Star rating */}
                {preset.reviewCount && preset.reviewCount > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5" aria-hidden>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon key={i} filled={i < Math.round(preset.rating ?? 0)} />
                      ))}
                    </div>
                    <span className="text-[0.875rem] font-medium text-foreground">
                      {preset.rating?.toFixed(1)}
                    </span>
                    <span className="text-[0.8125rem] text-muted/85">
                      ({preset.reviewCount.toLocaleString()} reviews)
                    </span>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-3 py-4 border-y border-border">
                  <span className={cn(
                    "font-display font-black text-[2.5rem] leading-none",
                    preset.isFree ? "text-emerald-400" : "text-gold"
                  )}>
                    {preset.isFree ? "Free" : `$${preset.price}`}
                  </span>
                  {preset.originalPrice && (
                    <>
                      <span className="text-[1.125rem] text-muted/85 line-through">
                        ${preset.originalPrice}
                      </span>
                      <span className="text-[0.75rem] font-bold text-red-400 bg-red-500/10 rounded-full px-2.5 py-1">
                        Save {discount}%
                      </span>
                    </>
                  )}
                </div>

                {/* What's included */}
                {preset.features && preset.features.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted/70">
                      What&apos;s included
                    </p>
                    <ul className="flex flex-col gap-2" role="list">
                      {preset.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5">
                          <span className="mt-0.5 shrink-0 text-gold"><CheckIcon /></span>
                          <span className="text-[0.875rem] text-foreground/92 leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Compatibility */}
                {preset.compatibility && preset.compatibility.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted/70">
                      Compatible with
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {preset.compatibility.map((app) => (
                        <span key={app}
                          className="text-[0.75rem] text-muted/85 bg-surface border border-border rounded-full px-3 py-1">
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detail pills */}
                {(preset.bestUseCase || preset.idealLighting || preset.difficultyLevel) && (
                  <div className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-surface-2/40 px-4 py-3">
                    {(
                      [
                        preset.bestUseCase    ? (["Best for",  preset.bestUseCase]    as [string, string]) : null,
                        preset.idealLighting  ? (["Lighting",  preset.idealLighting]  as [string, string]) : null,
                        preset.difficultyLevel? (["Level",     preset.difficultyLevel] as [string, string]) : null,
                      ] as ([string, string] | null)[]
                    ).filter((x): x is [string, string] => x !== null).map(([label, val]) => (
                      <div key={label} className="flex gap-2.5 text-[0.8rem]">
                        <span className="shrink-0 text-muted/70 font-medium min-w-[4.5rem]">{label}</span>
                        <span className={cn(
                          "leading-snug",
                          label === "Level"
                            ? val === "Beginner"     ? "text-emerald-400 font-semibold"
                            : val === "Intermediate" ? "text-gold/80 font-semibold"
                            :                          "text-rose-400 font-semibold"
                            : "text-foreground/92"
                        )}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <div className="flex flex-col gap-3 pt-1">
                  <UnlockOrBuyPanel preset={preset} />
                </div>

                {/* ── ORDER BUMP ───────────────────────────────── */}
                <OrderBump presetName={preset.name} presetSlug={preset.slug} />

                {/* Trust strip */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    "Instant access",
                    "Lifetime ownership",
                    ".xmp + .dng included",
                    ...(!preset.isFree ? ["Free YouTube unlock"] : []),
                  ].map((t) => (
                    <span key={t}
                      className="text-[0.68rem] font-medium text-muted/70 rounded-full border border-border/50 px-2.5 py-1">
                      ✓ {t}
                    </span>
                  ))}
                </div>

              </div>
            </CinematicReveal>
          </div>

          {/* ── ABOUT THIS PRESET ────────────────────────────── */}
          <CinematicReveal variant="rise" delay={0.1}>
            <div className="mt-16 sm:mt-20 max-w-prose">
              <SectionLabel>About this preset</SectionLabel>
              <div className="mt-5 flex flex-col gap-4">
                {generatePresetDescription({
                  name:         preset.name,
                  slug:         preset.slug,
                  category:     preset.category,
                  aiTags:       preset.aiTags,
                  tagline:      preset.tagline,
                  bestUseCase:  preset.bestUseCase,
                  isFree:       preset.isFree,
                }).split("\n\n").map((para, i) => (
                  <p key={i} className="text-[0.9375rem] text-muted/85 leading-[1.85]">{para}</p>
                ))}
              </div>
            </div>
          </CinematicReveal>

          {/* ── HOW TO ACCESS ────────────────────────────────── */}
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
                    <p key={i} className="text-[0.875rem] text-muted/85 leading-relaxed">{para}</p>
                  ))}
                </div>
              </div>
            </CinematicReveal>
          )}

          {/* ── FAQ ──────────────────────────────────────────── */}
          <div className="mt-16 sm:mt-20 max-w-2xl">
            <CinematicReveal variant="rise">
              <SectionLabel>Install & support</SectionLabel>
            </CinematicReveal>
            <FaqAccordion items={FAQ_ITEMS} />
          </div>

          {/* ── REVIEWS ──────────────────────────────────────── */}
          <div className="mt-16 sm:mt-20">
            <CinematicReveal variant="rise">
              <SectionLabel>Reviews</SectionLabel>
            </CinematicReveal>
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 xl:gap-16">
              <CinematicReveal variant="depth" delay={0.05}>
                <ReviewList presetSlug={preset.slug} />
              </CinematicReveal>
              <CinematicReveal variant="rise" delay={0.1}>
                <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/60 px-5 py-5">
                  <div className="flex flex-col gap-1">
                    <p className="text-[0.875rem] font-semibold text-foreground">Leave a review</p>
                    <p className="text-[0.8rem] text-muted/85 leading-relaxed">
                      Purchased or unlocked this preset? Share your experience.
                    </p>
                  </div>
                  <ReviewForm presetSlug={preset.slug} />
                </div>
              </CinematicReveal>
            </div>
          </div>

          {/* ── RELATED ──────────────────────────────────────── */}
          {related.length > 0 && (
            <div className="mt-20 sm:mt-28">
              <CinematicReveal variant="depth">
                <div className="flex items-center justify-between gap-4 mb-8">
                  <SectionLabel>You might also like</SectionLabel>
                  <Link href="/store"
                    className="text-[0.8125rem] text-muted/85 hover:text-gold transition-colors">
                    View all →
                  </Link>
                </div>
              </CinematicReveal>
              <CinematicStagger stagger={0.1} baseDelay={0.05} itemVariant="depth"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

/* ─── Sub-components ───────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-6 bg-gold/50" aria-hidden />
      <span className="text-[0.65rem] font-bold uppercase tracking-widest text-gold/70">
        {children}
      </span>
    </div>
  )
}

function OrderBump({ presetName, presetSlug }: { presetName: string; presetSlug: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
      <div className="mt-0.5 shrink-0">
        <span className="text-base">⚡</span>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-[0.75rem] font-bold text-gold/90 uppercase tracking-wide">
          Add to Cinematic Bundle — Save 40%
        </p>
        <p className="text-[0.78rem] text-muted/85 leading-snug">
          Get {presetName} + 4 more cinematic packs in one download.
          Normally ${Math.round(5 * 19)} — yours for $47.
        </p>
        <Link
          href={`/bundles?highlight=${presetSlug}`}
          className="mt-1.5 self-start text-[0.72rem] font-semibold text-gold hover:text-gold-bright transition-colors underline underline-offset-2"
        >
          See the bundle →
        </Link>
      </div>
    </div>
  )
}

/* ─── FAQ accordion (client) ──────────────────────────────────── */

import FaqAccordion from "./_FaqAccordion"

/* ─── Icons ────────────────────────────────────────────────────── */

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24"
      fill={filled ? "#FFD60A" : "none"}
      stroke={filled ? "none" : "#444"} strokeWidth="1.5" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
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
