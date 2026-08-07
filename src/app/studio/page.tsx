import type { Metadata } from "next"
import { Container }    from "@/components/layout/Container"
import { StudioShell }  from "@/components/studio/StudioShell"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"
import { CinematicBackground } from "@/components/ui/CinematicBackground"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"
import { FAQSection }       from "@/components/sections/FAQSection"
import { TutorialsSection } from "@/components/sections/TutorialsSection"
import { getSiteSeo } from "@/lib/seo/site-seo"
import { getAIStudioSettings } from "@/lib/ai-studio/settings"

export const dynamic = "force-dynamic"

/* ── SEO ── */
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSiteSeo("ai_studio")
  return {
    title: seo.title ?? undefined,
    description: seo.description ?? undefined,
    keywords: seo.keywords ?? undefined,
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    openGraph: { images: seo.ogImage ? [{ url: seo.ogImage }] : undefined },
    twitter: { card: seo.twitterCard },
  }
}

export default async function StudioPage() {
  const settings = await getAIStudioSettings()

  return (
    <div className="w-full bg-background">

      {/* ── Announcement — optional, admin-managed ── */}
      {settings.announcement && (
        <div className="w-full bg-[#6366f1]/[0.08] border-b border-[#6366f1]/20 px-4 py-2 text-center">
          <p className="text-[0.8125rem] text-[#a5b4fc]">{settings.announcement}</p>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          HERO BAND
          Living luminous atmosphere: indigo + gold dual orbs.
          Mirrors the AIStudioBanner palette for visual coherence.
      ──────────────────────────────────────────────────────── */}
      <div className="relative w-full border-b border-border overflow-hidden depth-section">

        {/* Living luminous atmosphere */}
        <LuminousEnvironment variant="indigo" intensity={1.15} />
        <CinematicBackground variant="mission" />
        <GrainOverlay opacity={0.019} animated zIndex={2} />

        {/* Edge rules */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#6366f1]/30 to-transparent z-[3]" />

        <Container className="relative z-10 py-16 sm:py-24">
          <div className="flex flex-col items-center text-center gap-5 max-w-2xl mx-auto">

            {/* Label pill */}
            <CinematicReveal variant="rise">
              <div className="flex items-center gap-2 rounded-full border border-[#6366f1]/30 bg-[#6366f1]/8 px-4 py-1.5">
                <SparkIcon />
                <span className="text-[0.75rem] font-semibold tracking-widest uppercase text-[#a5b4fc]">
                  {settings.heroBadgeLabel}
                </span>
              </div>
            </CinematicReveal>

            {/* Headline */}
            <CinematicReveal variant="depth" delay={0.07}>
              <h1 className="font-display font-bold text-foreground text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] tracking-tight">
                {settings.heroTitle}
              </h1>
            </CinematicReveal>

            {/* Subheadline */}
            <CinematicReveal variant="rise" delay={0.14}>
              <p className="text-lead max-w-lg">
                {settings.heroSubtitle}
              </p>
            </CinematicReveal>

            {/* Quick step indicators */}
            <CinematicStagger stagger={0.09} baseDelay={0.18} itemVariant="rise" className="flex items-center gap-3 mt-1 flex-wrap justify-center">
              {STEPS.map((step, i) => (
                <CinematicItem key={step} variant="rise">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full border border-[#6366f1]/40 bg-[#6366f1]/10 text-[0.65rem] font-bold text-[#a5b4fc]">
                        {i + 1}
                      </span>
                      <span className="text-[0.8125rem] text-muted/85 font-medium">{step}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <span className="text-muted/70 text-[0.75rem]" aria-hidden="true">→</span>
                    )}
                  </div>
                </CinematicItem>
              ))}
            </CinematicStagger>

          </div>
        </Container>
      </div>

      {/* ────────────────────────────────────────────────────────
          STUDIO SHELL — the full interactive tool (or a disabled
          notice when the admin kill switch is off)
      ──────────────────────────────────────────────────────── */}
      <div className="relative">
        <LuminousEnvironment variant="indigo" intensity={0.5} />
        <Container className="relative z-10 py-10 sm:py-14">
          {settings.isEnabled ? (
            <StudioShell chips={settings.promptChips} />
          ) : (
            <div className="rounded-2xl border border-border bg-surface px-6 py-16 text-center max-w-lg mx-auto">
              <p className="text-body text-muted">AI Studio is temporarily unavailable. Please check back soon.</p>
            </div>
          )}
        </Container>
      </div>

      {/* ────────────────────────────────────────────────────────
          FINE PRINT
      ──────────────────────────────────────────────────────── */}
      <div className="border-t border-border">
        <Container className="py-6">
          <p className="text-center text-[0.75rem] text-muted/70 leading-relaxed max-w-lg mx-auto">
            {settings.finePrint}
          </p>
        </Container>
      </div>

      {/* ── Tutorials — renders nothing when empty ── */}
      <TutorialsSection items={settings.tutorialItems} />

      {/* ── FAQ — renders nothing when empty ── */}
      {settings.faqItems.length > 0 && (
        <FAQSection title="AI Studio FAQ" items={settings.faqItems} />
      )}

    </div>
  )
}

/* ── Data ── */
const STEPS = ["Upload photo", "Describe the mood", "Download your edit"] as const

/* ── Icon ── */
function SparkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[#a5b4fc]"
      aria-hidden="true"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  )
}


