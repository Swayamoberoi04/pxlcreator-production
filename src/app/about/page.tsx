import type { Metadata } from "next"
import { Container } from "@/components/layout/Container"
import Link from "next/link"
import { LuminousEnvironment }  from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }         from "@/components/ui/GrainOverlay"
import { CinematicBackground }  from "@/components/ui/CinematicBackground"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about PXL Creator — the team behind the presets, our story, and what drives us to help creators tell better visual stories.",
}

const VALUES = [
  {
    title: "Craft First",
    body:  "Every preset starts with a real shoot. We test under harsh sun, golden hour, and deep shadows before a single file ships.",
  },
  {
    title: "Creator-Built",
    body:  "We're photographers and filmmakers ourselves. The tools we release are the same ones we use every day on location.",
  },
  {
    title: "Honest Education",
    body:  "No fluff, no vanity metrics. Our tutorials teach the reasoning behind edits so you can adapt them to any scene.",
  },
  {
    title: "Community Over Clout",
    body:  "10,000+ creators use PXL tools. We answer DMs, run giveaways, and grow together — not just broadcast.",
  },
] as const

const STATS = [
  { value: "10K+",  label: "Creators" },
  { value: "50+",   label: "Presets"  },
  { value: "4.9★",  label: "Rating"   },
  { value: "2021",  label: "Founded"  },
] as const

export default function AboutPage() {
  return (
    <div className="w-full bg-background">

      {/* ── Hero band ── */}
      <div className="relative w-full border-b border-border overflow-hidden depth-section">
        <LuminousEnvironment variant="gold" intensity={0.9} />
        <CinematicBackground variant="mission" />
        <GrainOverlay opacity={0.018} animated zIndex={2} />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/35 to-transparent z-[3]" />

        <Container className="relative z-10 py-16 sm:py-24">
          <div className="flex flex-col items-center text-center gap-5 max-w-2xl mx-auto">

            <CinematicReveal variant="rise">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
                <span className="text-label text-gold/80 tracking-widest animate-gold-flicker">Our Story</span>
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
              </div>
            </CinematicReveal>

            <CinematicReveal variant="depth" delay={0.07}>
              <h1 className="heading-2 text-foreground">
                Built by{" "}
                <span className="text-gold-gradient">Creators</span>
                {" "}for Creators
              </h1>
            </CinematicReveal>

            <CinematicReveal variant="rise" delay={0.14}>
              <p className="text-lead max-w-lg">
                PXL Creator started as a personal toolkit — handcrafted presets for our own
                work. When people kept asking where the look came from, we decided to share it.
              </p>
            </CinematicReveal>

          </div>
        </Container>
      </div>

      {/* ── Stats strip ── */}
      <div className="border-b border-border bg-surface">
        <Container>
          <div className="flex items-center justify-center flex-wrap gap-0 py-8">
            {STATS.map((stat, i) => (
              <div key={stat.label} className="flex items-center">
                <div className="flex flex-col items-center px-8 sm:px-14">
                  <span className="font-display text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</span>
                  <span className="text-label text-muted/85 mt-0.5">{stat.label}</span>
                </div>
                {i < STATS.length - 1 && (
                  <span className="h-7 w-px bg-border shrink-0" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* ── Mission statement ── */}
      <div className="relative">
        <LuminousEnvironment variant="gold" intensity={0.45} />
        <Container className="relative z-10 py-16 sm:py-24">
          <CinematicReveal variant="depth">
            <div className="max-w-3xl mx-auto flex flex-col items-center text-center gap-7">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
                <span className="text-label text-gold/80 tracking-widest">What We Do</span>
                <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
              </div>
              <h2 className="heading-3 text-foreground">
                We help you find your visual language
              </h2>
              <p className="text-lead max-w-2xl">
                Great photography isn&apos;t just sharp and well-exposed — it has a{" "}
                <span className="text-foreground font-medium">mood</span>. PXL Creator
                exists to give you the color science and editing knowledge to make that mood
                deliberate and repeatable. Our presets are starting points; our courses and
                blog teach you to own the result.
              </p>
            </div>
          </CinematicReveal>
        </Container>
      </div>

      {/* ── Values grid ── */}
      <div className="relative border-t border-border bg-surface depth-section">
        <LuminousEnvironment variant="neutral" intensity={0.6} />
        <Container className="relative z-10 py-16 sm:py-24">
          <CinematicReveal variant="rise">
            <div className="flex flex-col items-center text-center gap-5 mb-12 sm:mb-16">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
                <span className="text-label text-gold/80 tracking-widest">What We Stand For</span>
                <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
              </div>
              <h2 className="heading-3 text-foreground">Our Values</h2>
            </div>
          </CinematicReveal>

          <CinematicStagger stagger={0.1} baseDelay={0.05} itemVariant="depth" className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {VALUES.map((v) => (
              <CinematicItem key={v.title} variant="depth">
                <div className="depth-card rounded-2xl border border-border/60 bg-background/80 backdrop-blur-sm p-6 sm:p-8 flex flex-col gap-3 h-full">
                  <span className="h-px w-6 bg-gold/50" aria-hidden="true" />
                  <h3 className="font-display font-bold text-foreground text-[1rem]">{v.title}</h3>
                  <p className="text-[0.9375rem] text-muted leading-relaxed">{v.body}</p>
                </div>
              </CinematicItem>
            ))}
          </CinematicStagger>
        </Container>
      </div>

      {/* ── CTA ── */}
      <div className="relative border-t border-border">
        <LuminousEnvironment variant="gold" intensity={0.5} />
        <Container className="relative z-10 py-16 sm:py-24">
          <CinematicReveal variant="depth">
            <div className="flex flex-col items-center text-center gap-6 max-w-lg mx-auto">
              <h2 className="heading-3 text-foreground">
                Ready to level up your edits?
              </h2>
              <p className="text-lead">
                Browse the full preset collection and find the look that fits your vision.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/store"
                  className="inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3 text-[0.9375rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.97] shadow-[0_0_40px_rgba(255,214,10,0.18)]"
                >
                  Browse Store
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-8 py-3 text-[0.9375rem] font-medium text-muted transition-all hover:border-gold/40 hover:text-foreground"
                >
                  Get in Touch
                </Link>
              </div>
            </div>
          </CinematicReveal>
        </Container>
      </div>

    </div>
  )
}

