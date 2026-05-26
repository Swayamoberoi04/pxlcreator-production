import type { Metadata } from "next"
import { Container } from "@/components/layout/Container"
import { siteConfig } from "@/config/site"
import { LuminousEnvironment }  from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }         from "@/components/ui/GrainOverlay"
import { CinematicReveal }      from "@/components/ui/CinematicReveal"

export const metadata: Metadata = {
  title: "Giveaway",
  description:
    "Enter the PXL Creator giveaway for a chance to win a free premium preset pack and exclusive editing resources.",
}

const STEPS = [
  {
    number: "01",
    title:  "Follow on YouTube",
    body:   "Subscribe to our YouTube channel. New tutorials and behind-the-scenes drop every week.",
    href:   siteConfig.socials.youtube,
    cta:    "Subscribe",
  },
  {
    number: "02",
    title:  "Follow on Instagram",
    body:   "Follow @pxlcreator on Instagram and like the giveaway post to register your entry.",
    href:   siteConfig.socials.instagram,
    cta:    "Follow",
  },
  {
    number: "03",
    title:  "Tag a Creator Friend",
    body:   "Tag one photographer or filmmaker friend in the comments. Each tag counts as an extra entry.",
    href:   null,
    cta:    null,
  },
] as const

const PRIZE_ITEMS = [
  "Full premium preset pack (50+ presets)",
  "Lightroom editing masterclass access",
  "1-on-1 virtual edit session (30 min)",
  "Exclusive behind-the-scenes LUT pack",
] as const

export default function GiveawayPage() {
  return (
    <div className="w-full bg-background">

      {/* ── Hero band ── */}
      <div className="relative w-full border-b border-border overflow-hidden depth-section">
        <LuminousEnvironment variant="gold" intensity={1.1} />
        <GrainOverlay opacity={0.018} animated zIndex={2} />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent z-[3]" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent z-[3]" />

        <Container className="relative z-10 py-16 sm:py-24">
          <div className="flex flex-col items-center text-center gap-5 max-w-2xl mx-auto">

            <CinematicReveal variant="rise">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
                <span className="text-label text-gold/80 tracking-widest animate-gold-flicker">Limited Time</span>
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
              </div>
            </CinematicReveal>

            <CinematicReveal variant="depth" delay={0.07}>
              <h1 className="heading-2 text-foreground">
                PXL Creator{" "}
                <span className="text-gold-gradient">Giveaway</span>
              </h1>
            </CinematicReveal>

            <CinematicReveal variant="rise" delay={0.13}>
              <p className="text-lead max-w-lg">
                Win a full premium preset pack, a Lightroom masterclass, and a live
                1-on-1 edit session. Three simple steps to enter.
              </p>
            </CinematicReveal>

            {/* Urgency chip */}
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/8 px-4 py-1.5 text-[0.8125rem] font-medium text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" aria-hidden="true" />
              Entries open now
            </span>

          </div>
        </Container>
      </div>

      {/* ── Prize details ── */}
      <div className="border-b border-border bg-surface">
        <Container className="py-14 sm:py-20">
          <div className="flex flex-col items-center gap-10 max-w-2xl mx-auto">

            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gold opacity-70" aria-hidden="true" />
                <span className="text-label text-gold tracking-widest">The Prize</span>
                <span className="h-px w-8 bg-gold opacity-70" aria-hidden="true" />
              </div>
              <h2 className="heading-3 text-foreground">What you could win</h2>
            </div>

            <ul className="w-full flex flex-col gap-3">
              {PRIZE_ITEMS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-4 rounded-xl border border-border bg-background px-5 py-4"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-gold shrink-0" aria-hidden="true" />
                  <span className="text-[0.9375rem] text-foreground font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>

          </div>
        </Container>
      </div>

      {/* ── Entry steps ── */}
      <Container className="py-14 sm:py-20">
        <div className="flex flex-col items-center gap-12 max-w-2xl mx-auto">

          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold opacity-70" aria-hidden="true" />
              <span className="text-label text-gold tracking-widest">How to Enter</span>
              <span className="h-px w-8 bg-gold opacity-70" aria-hidden="true" />
            </div>
            <h2 className="heading-3 text-foreground">3 steps to enter</h2>
          </div>

          <div className="w-full flex flex-col gap-5">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="flex gap-5 rounded-2xl border border-border bg-surface p-6 sm:p-8"
              >
                {/* Step number */}
                <span className="font-display text-[2rem] font-black text-gold/20 leading-none select-none shrink-0 w-12">
                  {step.number}
                </span>
                {/* Content */}
                <div className="flex flex-col gap-1.5 flex-1">
                  <h3 className="font-display font-bold text-foreground text-[1rem]">{step.title}</h3>
                  <p className="text-[0.9375rem] text-muted leading-relaxed">{step.body}</p>
                  {step.href && step.cta && (
                    <a
                      href={step.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 self-start text-[0.875rem] font-semibold text-gold hover:text-gold-dim transition-colors"
                    >
                      {step.cta} →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </Container>

      {/* ── Legal fine print ── */}
      <div className="border-t border-border">
        <Container className="py-8">
          <p className="text-center text-[0.8125rem] text-muted/50 max-w-2xl mx-auto leading-relaxed">
            Winner selected at random from qualifying entries. Open to all residents 18+.
            One winner announced on Instagram Stories within 7 days of the closing date.
            PXL Creator reserves the right to modify or cancel the giveaway at any time.
          </p>
        </Container>
      </div>

    </div>
  )
}
