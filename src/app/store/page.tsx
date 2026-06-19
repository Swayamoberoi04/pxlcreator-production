import type { Metadata } from "next"
import { Container }    from "@/components/layout/Container"
import { StoreShell }          from "@/components/store/StoreShell"
import { UnlockMethodBanner }  from "@/components/store/UnlockMethodBanner"
import { getPresets }   from "@/lib/presets/repository"
import type { PresetCategory } from "@/types/product"
import { CinematicReveal }    from "@/components/ui/CinematicReveal"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }       from "@/components/ui/GrainOverlay"
/* StoreScene3DWrapper owns its own dynamic(ssr:false) and is "use client" */
import { StoreScene3DWrapper } from "@/components/3d/StoreScene3DWrapper"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Store — Preset Packs & Free Downloads",
  description:
    "Browse 24 PXL Creator preset packs — 12 free downloads and tiered paid packs from ₹420. Cinematic, film emulation, portrait, landscape and street. Instant download.",
}

const VALID_CATEGORIES = new Set([
  "All", "Bundle", "Cinematic", "Film Emulation", "Portrait", "Landscape", "Street", "Free"
])

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params      = await searchParams
  const rawCategory = params?.category ?? "All"
  const initialCategory = VALID_CATEGORIES.has(rawCategory)
    ? (rawCategory as PresetCategory | "All" | "Free")
    : "All"

  const allPresets = await getPresets({ orderBy: "order_index" })

  return (
    <div className="w-full bg-background">

      {/* ══════════════════════════════════════════════════
          CINEMATIC STORE HERO
          Living luminous atmosphere + 3D floating panels
      ══════════════════════════════════════════════════ */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: "clamp(440px, 52vh, 640px)" }}>

        {/* ── Luminous atmospheric background ── */}
        <LuminousEnvironment variant="store" intensity={1.2} />

        {/* ── 3D floating preset panels ── */}
        <div aria-hidden="true" className="absolute inset-0 z-[2] pointer-events-none">
          <StoreScene3DWrapper />
        </div>

        {/* ── Film grain ── */}
        <GrainOverlay opacity={0.022} animated zIndex={3} />

        {/* ── Gold rules ── */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/35 to-transparent z-[4]" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0    h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent z-[4]" />

        {/* ── Bottom fade to grid section ── */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent z-[4]" />

        {/* ── Hero content ── */}
        <Container className="relative z-[10] py-16 sm:py-24 flex flex-col justify-end h-full" /* style via parent div */ >
          <div className="flex flex-col gap-6 max-w-3xl">

            {/* Eyebrow */}
            <CinematicReveal variant="rise">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gold/70 animate-gold-flicker" aria-hidden="true" />
                <span className="text-label text-gold tracking-[0.2em] animate-gold-flicker">( PXL Store )</span>
                <span className="h-px w-8 bg-gold/70 animate-gold-flicker" aria-hidden="true" />
              </div>
            </CinematicReveal>

            {/* Headline */}
            <CinematicReveal variant="depth" delay={0.08}>
              <h1 className="font-display font-black text-[clamp(2.2rem,5.5vw,3.75rem)] leading-[1.02] tracking-tight text-foreground">
                Presets that earn their place<br />
                <span
                  style={{
                    background: "linear-gradient(135deg, #ffffff 0%, #C9A84C 45%, #A8893A 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  in your creative workflow.
                </span>
              </h1>
            </CinematicReveal>

            {/* Subtitle */}
            <CinematicReveal variant="rise" delay={0.16}>
              <p className="text-[1rem] sm:text-[1.0625rem] text-muted/65 max-w-xl leading-relaxed">
                Start with{" "}
                <span className="text-emerald-400 font-semibold">12 free preset packs</span>
                {" "}— no credit card. Buy any paid preset instantly,
                or <span className="text-gold font-medium">unlock free</span> using the password from our YouTube tutorials.
              </p>
            </CinematicReveal>

            {/* Trust chips */}
            <CinematicReveal variant="rise" delay={0.22}>
              <div className="flex flex-wrap gap-2.5 mt-1">
                {[
                  { label: "( 12 free presets )",        accent: true  },
                  { label: "( YouTube unlock option )",  accent: true  },
                  { label: "( Instant download )",       accent: false },
                  { label: "( Lifetime ownership )",     accent: false },
                  { label: "( .xmp + .dng formats )",    accent: false },
                ].map(({ label, accent }) => (
                  <span key={label} className={`text-[0.75rem] font-medium rounded-full border px-3 py-1.5 backdrop-blur-sm ${
                    accent
                      ? "text-emerald-400/90 border-emerald-500/25 bg-emerald-500/[0.06]"
                      : "text-muted/60 border-white/8 bg-white/[0.03]"
                  }`}>
                    {label}
                  </span>
                ))}
              </div>
            </CinematicReveal>

          </div>
        </Container>
      </div>

      {/* ══════════════════════════════════════════════════
          FILTER + GRID (client shell)
      ══════════════════════════════════════════════════ */}
      <div className="relative bg-luminous-gold">
        <LuminousEnvironment variant="gold" intensity={0.6} />
        <GrainOverlay opacity={0.015} zIndex={1} />
        <Container className="relative z-10 py-10 sm:py-14">
          <div className="mb-8">
            <UnlockMethodBanner variant="store" />
          </div>
          <StoreShell presets={allPresets} initialCategory={initialCategory} />
        </Container>
      </div>

    </div>
  )
}
