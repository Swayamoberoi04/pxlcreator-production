import type { Metadata }   from "next"
import Link               from "next/link"
import { Container }      from "@/components/layout/Container"
import { PresetCard }     from "@/components/store/PresetCard"
import { BundleCard }     from "@/components/bundles/BundleCard"
import { getPresets }     from "@/lib/presets/repository"
import { getFeaturedBundles } from "@/lib/bundles/repository"
import { LuminousEnvironment }  from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }         from "@/components/ui/GrainOverlay"
import { CinematicBackground }  from "@/components/ui/CinematicBackground"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Presets — Featured Collections",
  description:
    "Explore PXL Creator's featured preset collections and bundles. Handcrafted Lightroom presets for cinematic, portrait, film, landscape and street photography — buy instantly or unlock free from YouTube.",
}

/* ── Store categories → /store filter mapping ── */
const VAULT_CATEGORIES = [
  { label: "Cinematic",      href: "/store?category=Cinematic"      },
  { label: "Film Emulation", href: "/store?category=Film+Emulation" },
  { label: "Portrait",       href: "/store?category=Portrait"       },
  { label: "Landscape",      href: "/store?category=Landscape"      },
  { label: "Street",         href: "/store?category=Street"         },
  { label: "Bundles",        href: "/store?category=Bundle"         },
  { label: "Free Packs",     href: "/store?category=Free"           },
]

export default async function PresetsPage() {
  const [featuredBundles, allPresets] = await Promise.all([
    getFeaturedBundles(4),
    getPresets({ featured: true, orderBy: "order_index", limit: 8 }),
  ])

  /* Fallback: if fewer than 6 featured presets exist, grab top 8 regardless */
  const showcasePresets = allPresets.length >= 4
    ? allPresets.slice(0, 8)
    : allPresets

  return (
    <div className="w-full bg-background">

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          HERO — curated showcase, not catalogue
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="relative w-full border-b border-border overflow-hidden">
        <LuminousEnvironment variant="gold" intensity={0.9} />
        <CinematicBackground variant="mission" />
        <GrainOverlay opacity={0.018} animated zIndex={2} />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent z-[3]" />

        <Container className="relative z-10 py-16 sm:py-24">
          <div className="flex flex-col items-center text-center gap-5 max-w-2xl mx-auto">

            <CinematicReveal variant="rise">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
                <span className="text-label text-gold/80 tracking-widest animate-gold-flicker">( Featured Collections )</span>
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
              </div>
            </CinematicReveal>

            <CinematicReveal variant="depth" delay={0.07}>
              <h1 className="font-display font-black text-[clamp(2rem,5vw,3.5rem)] leading-[1.04] tracking-tight text-foreground">
                Our most-loved<br />
                <span
                  style={{
                    background: "linear-gradient(135deg, #FFD60A 0%, #E0A800 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  presets & bundles.
                </span>
              </h1>
            </CinematicReveal>

            <CinematicReveal variant="rise" delay={0.13}>
              <p className="text-lead max-w-md text-muted/60 leading-relaxed">
                Hand-picked packs that creators reach for again and again.
                Browse the full catalogue inside the Store.
              </p>
            </CinematicReveal>

            <CinematicReveal variant="rise" delay={0.19}>
              <div className="flex items-center gap-3 mt-1">
                <Link
                  href="/store"
                  className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-[0.875rem] font-semibold text-background hover:brightness-110 transition-all active:scale-[0.97]"
                >
                  Browse Full Store
                  <ArrowRightIcon />
                </Link>
                <Link
                  href="/bundles"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-6 py-2.5 text-[0.875rem] font-medium text-muted/70 hover:text-foreground hover:border-gold/30 transition-all"
                >
                  View Bundles
                </Link>
              </div>
            </CinematicReveal>

          </div>
        </Container>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          FEATURED BUNDLES
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {featuredBundles.length > 0 && (
        <Container className="pt-16 sm:pt-20 pb-0">
          <CinematicReveal variant="rise">
            <div className="flex items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <span className="h-px w-6 bg-gold/60" aria-hidden="true" />
                <h2 className="font-display font-black text-[1.125rem] text-foreground tracking-tight">
                  ( Creator Bundles )
                </h2>
              </div>
              <Link
                href="/bundles"
                className="text-[0.8125rem] text-muted/50 hover:text-gold transition-colors flex items-center gap-1.5"
              >
                All bundles <ArrowRightSmIcon />
              </Link>
            </div>
          </CinematicReveal>

          <CinematicStagger
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-5"
            itemVariant="rise"
            stagger={0.07}
          >
            {featuredBundles.map((bundle) => (
              <CinematicItem key={bundle.id} variant="rise">
                <BundleCard bundle={bundle} />
              </CinematicItem>
            ))}
          </CinematicStagger>
        </Container>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          FEATURED INDIVIDUAL PRESETS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {showcasePresets.length > 0 && (
        <Container className="pt-16 sm:pt-20 pb-16 sm:pb-20">
          <CinematicReveal variant="rise">
            <div className="flex items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <span className="h-px w-6 bg-gold/60" aria-hidden="true" />
                <h2 className="font-display font-black text-[1.125rem] text-foreground tracking-tight">
                  ( Featured Packs )
                </h2>
              </div>
              <Link
                href="/store"
                className="text-[0.8125rem] text-muted/50 hover:text-gold transition-colors flex items-center gap-1.5"
              >
                View all {showcasePresets.length > 0 ? "in Store" : ""} <ArrowRightSmIcon />
              </Link>
            </div>
          </CinematicReveal>

          <CinematicStagger
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            itemVariant="depth"
            stagger={0.06}
          >
            {showcasePresets.map((preset) => (
              <CinematicItem key={preset.id} variant="depth">
                <PresetCard preset={preset} />
              </CinematicItem>
            ))}
          </CinematicStagger>
        </Container>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          CREATOR VAULT — cinematic store CTA
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <CreatorVaultSection />

    </div>
  )
}

/* ── Creator Vault Section ─────────────────────────────────────────────── */

function CreatorVaultSection() {
  return (
    <section className="relative w-full overflow-hidden bg-[#06060480]" aria-label="Discover the full store">
      {/* Deep dark background */}
      <div className="absolute inset-0 bg-[#040403]" aria-hidden="true" />

      {/* Central atmospheric glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[500px] w-[700px] rounded-full bg-gold/[0.055] blur-[130px] translate-y-8" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden pt-0">
        <div className="h-[300px] w-[500px] rounded-full bg-gold/[0.03] blur-[90px] -translate-y-8" />
      </div>

      {/* Top/bottom rules */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />

      <GrainOverlay opacity={0.028} zIndex={1} />

      <Container className="relative z-10 py-24 sm:py-36">
        <div className="flex flex-col items-center text-center gap-0">

          {/* Eyebrow */}
          <CinematicReveal variant="rise">
            <div className="flex items-center gap-4 mb-10">
              <span className="h-px w-10 bg-gold/30" aria-hidden="true" />
              <span className="text-[0.7rem] font-bold tracking-[0.3em] text-gold/50 uppercase">
                The Creator Vault
              </span>
              <span className="h-px w-10 bg-gold/30" aria-hidden="true" />
            </div>
          </CinematicReveal>

          {/* Main headline */}
          <CinematicReveal variant="depth" delay={0.08}>
            <h2 className="font-display font-black text-[clamp(2.8rem,8vw,6rem)] leading-[0.96] tracking-[-0.02em] mb-0">
              <span className="block text-white/90">Discover the</span>
              <span
                className="block"
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #FFD60A 40%, #E0A800 75%, #c8841a 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Full Creator Vault
              </span>
            </h2>
          </CinematicReveal>

          {/* Value props */}
          <CinematicReveal variant="rise" delay={0.15}>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-8 text-[0.9375rem] text-muted/40">
              {[
                "100+ Premium Presets",
                "Exclusive Creator Bundles",
                "Hidden YouTube Unlocks",
                "Instant Downloads",
              ].map((v, i, arr) => (
                <span key={v} className="flex items-center gap-5">
                  {v}
                  {i < arr.length - 1 && <span aria-hidden="true" className="text-muted/20">·</span>}
                </span>
              ))}
            </div>
          </CinematicReveal>

          {/* Category browse chips */}
          <CinematicReveal variant="rise" delay={0.22}>
            <div className="flex flex-wrap justify-center gap-2.5 mt-10">
              <span className="text-[0.75rem] font-medium text-muted/30 self-center mr-1">
                Search by:
              </span>
              {VAULT_CATEGORIES.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="group rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[0.8125rem] font-medium text-muted/55 transition-all duration-200 hover:border-gold/35 hover:bg-gold/[0.07] hover:text-gold/90"
                >
                  {label}
                </Link>
              ))}
            </div>
          </CinematicReveal>

          {/* Divider */}
          <div aria-hidden="true" className="w-full max-w-sm h-px bg-gradient-to-r from-transparent via-gold/12 to-transparent my-14 sm:my-16" />

          {/* Unlock methods */}
          <CinematicReveal variant="depth" delay={0.28}>
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-10 max-w-lg">
              {/* Method 1 */}
              <div className="flex flex-col items-center sm:items-start gap-3 text-center sm:text-left">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/25 bg-gold/[0.08]">
                  <span className="font-display font-black text-[0.875rem] text-gold">①</span>
                </div>
                <p className="text-[0.875rem] text-muted/60 leading-relaxed max-w-[180px]">
                  Enter the password hidden inside creator videos
                </p>
              </div>

              {/* "or" divider */}
              <div className="flex sm:flex-col items-center gap-3 shrink-0">
                <div className="h-px w-8 sm:w-px sm:h-8 bg-white/[0.07]" aria-hidden="true" />
                <span className="text-[0.75rem] font-medium text-muted/25">or</span>
                <div className="h-px w-8 sm:w-px sm:h-8 bg-white/[0.07]" aria-hidden="true" />
              </div>

              {/* Method 2 */}
              <div className="flex flex-col items-center sm:items-start gap-3 text-center sm:text-left">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/[0.08]">
                  <span className="font-display font-black text-[0.875rem] text-emerald-400">②</span>
                </div>
                <p className="text-[0.875rem] text-muted/60 leading-relaxed max-w-[180px]">
                  Purchase instantly and skip the hunt
                </p>
              </div>
            </div>
          </CinematicReveal>

          {/* Tagline */}
          <CinematicReveal variant="rise" delay={0.34}>
            <p className="mt-12 text-[0.9375rem] sm:text-[1rem] text-muted/30 leading-[1.9] tracking-wide">
              Every preset lives inside the Store.<br />
              <span className="text-muted/50">Search.&nbsp;&nbsp;Preview.&nbsp;&nbsp;Unlock.&nbsp;&nbsp;Download.</span>
            </p>
          </CinematicReveal>

          {/* CTA button */}
          <CinematicReveal variant="depth" delay={0.4}>
            <div className="mt-10">
              <Link
                href="/store"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-gold px-10 py-4 text-[1rem] font-bold text-background transition-all duration-300 hover:brightness-110 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
              >
                {/* Shimmer sweep */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -skew-x-12 translate-x-[-120%] bg-white/20 transition-transform duration-700 group-hover:translate-x-[200%]"
                />
                <span className="relative">Explore The Store</span>
                <span className="relative">
                  <ArrowRightIcon />
                </span>
              </Link>
            </div>
          </CinematicReveal>

        </div>
      </Container>
    </section>
  )
}

/* ── Icons ─────────────────────────────────────────────────────────────── */

function ArrowRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  )
}

function ArrowRightSmIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  )
}

