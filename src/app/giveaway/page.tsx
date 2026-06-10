"use client"

import { useState, useEffect } from "react"
import Link                    from "next/link"
import { Container }           from "@/components/layout/Container"
import { siteConfig }          from "@/config/site"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

/* ── Giveaway config — update these to run a real giveaway ── */
const GIVEAWAY_END_DATE = new Date("2026-06-27T23:59:59+05:30") // 30 days from launch

const STEPS = [
  {
    number: "01",
    title:  "Subscribe on YouTube",
    body:   "Subscribe to our YouTube channel. New tutorials and behind-the-scenes drop every week.",
    href:   siteConfig.socials.youtube,
    cta:    "Subscribe now",
    icon:   "▶",
  },
  {
    number: "02",
    title:  "Follow on Instagram",
    body:   "Follow @pxl_creator on Instagram and like the pinned giveaway post to register your entry.",
    href:   siteConfig.socials.instagram,
    cta:    "Follow & like",
    icon:   "◈",
  },
  {
    number: "03",
    title:  "Tag a Creator Friend",
    body:   "Tag one photographer or filmmaker friend in the comments. Each tag counts as an extra entry.",
    href:   null,
    cta:    null,
    icon:   "✦",
  },
] as const

const PRIZE_ITEMS = [
  { title: "Full Premium Preset Pack",           desc: "50+ handcrafted cinematic Lightroom presets",      value: "$89" },
  { title: "Lightroom Masterclass Access",        desc: "Complete editing course — lifetime access",         value: "$49" },
  { title: "1-on-1 Virtual Edit Session",         desc: "30-min private session with the PXL Creator team", value: "$79" },
  { title: "Exclusive Behind-the-Scenes LUT Pack",desc: "Cinema-grade LUTs used in real productions",       value: "$39" },
] as const

const PAST_WINNERS = [
  { name: "Arjun M.",    handle: "@arjun.frames",   prize: "Premium Preset Pack",   month: "April 2026"    },
  { name: "Priya S.",    handle: "@priya.captures",  prize: "Full Bundle + Course",  month: "March 2026"    },
  { name: "Lucas V.",    handle: "@lucas.visual",    prize: "Premium Preset Pack",   month: "February 2026" },
] as const

/* ─────────────────────────────────────────────────────── */

export default function GiveawayPage() {
  return (
    <div className="w-full bg-background">

      {/* ── Hero band ── */}
      <div className="relative w-full border-b border-border overflow-hidden depth-section">
        <LuminousEnvironment variant="gold" intensity={1.1} />
        <GrainOverlay opacity={0.018} animated zIndex={2} />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent z-[3]" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent z-[3]" />

        <Container className="relative z-10 py-16 sm:py-28">
          <div className="flex flex-col items-center text-center gap-6 max-w-2xl mx-auto">

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
                1-on-1 edit session — worth over{" "}
                <span className="text-foreground font-semibold">$256</span>.
                Three simple steps to enter.
              </p>
            </CinematicReveal>

            {/* Live pulse chip */}
            <CinematicReveal variant="rise" delay={0.19}>
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/8 px-4 py-1.5 text-[0.8125rem] font-medium text-gold">
                <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" aria-hidden="true" />
                Entries open now — closes June 27, 2026
              </span>
            </CinematicReveal>

            {/* Countdown */}
            <CinematicReveal variant="rise" delay={0.25}>
              <Countdown endDate={GIVEAWAY_END_DATE} />
            </CinematicReveal>

          </div>
        </Container>
      </div>

      {/* ── Prize showcase ── */}
      <div className="border-b border-border bg-surface">
        <Container className="py-14 sm:py-20">
          <div className="flex flex-col items-center gap-10 max-w-3xl mx-auto">

            <CinematicReveal variant="gentle">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-px w-8 bg-gold opacity-70" aria-hidden="true" />
                  <span className="text-label text-gold tracking-widest">The Prize</span>
                  <span className="h-px w-8 bg-gold opacity-70" aria-hidden="true" />
                </div>
                <h2 className="heading-3 text-foreground">What you could win</h2>
                <p className="text-[0.9375rem] text-muted">One winner takes the entire bundle.</p>
              </div>
            </CinematicReveal>

            <CinematicStagger
              className="w-full grid sm:grid-cols-2 gap-4"
              itemVariant="rise"
              stagger={0.09}
            >
              {PRIZE_ITEMS.map((item) => (
                <CinematicItem key={item.title} variant="rise">
                  <div className="group relative flex flex-col gap-2 rounded-2xl border border-border bg-background p-5 sm:p-6 transition-all duration-300 hover:border-gold/25 hover:bg-surface h-full">
                    {/* Value badge */}
                    <span className="self-start rounded-full bg-gold/10 border border-gold/20 px-2.5 py-0.5 text-[0.75rem] font-semibold text-gold">
                      {item.value} value
                    </span>
                    <h3 className="text-[0.9375rem] font-bold text-foreground leading-snug mt-1">
                      {item.title}
                    </h3>
                    <p className="text-[0.875rem] text-muted leading-relaxed">
                      {item.desc}
                    </p>
                    {/* Hover accent line */}
                    <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl" />
                  </div>
                </CinematicItem>
              ))}
            </CinematicStagger>

            {/* Total value chip */}
            <CinematicReveal variant="gentle" delay={0.05}>
              <div className="flex items-center gap-3 rounded-full border border-gold/20 bg-gold/5 px-6 py-3">
                <span className="text-[0.875rem] text-muted">Total prize value:</span>
                <span className="font-display font-black text-[1.125rem] text-gold">$256+</span>
              </div>
            </CinematicReveal>

          </div>
        </Container>
      </div>

      {/* ── How to enter ── */}
      <Container className="py-14 sm:py-20">
        <div className="flex flex-col items-center gap-12 max-w-2xl mx-auto">

          <CinematicReveal variant="gentle">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gold opacity-70" aria-hidden="true" />
                <span className="text-label text-gold tracking-widest">How to Enter</span>
                <span className="h-px w-8 bg-gold opacity-70" aria-hidden="true" />
              </div>
              <h2 className="heading-3 text-foreground">3 steps to enter</h2>
              <p className="text-[0.9375rem] text-muted">Each step completed is one entry. Complete all three for 3×+ your chances.</p>
            </div>
          </CinematicReveal>

          <CinematicStagger
            className="w-full flex flex-col gap-4"
            itemVariant="rise"
            stagger={0.10}
          >
            {STEPS.map((step) => (
              <CinematicItem key={step.number} variant="rise">
                <div className="group flex gap-5 rounded-2xl border border-border bg-surface p-6 sm:p-8 transition-all duration-300 hover:border-gold/20">
                  {/* Step number */}
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <span className="font-display text-[2.25rem] font-black text-gold/15 leading-none select-none group-hover:text-gold/25 transition-colors duration-300">
                      {step.number}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <h3 className="font-display font-bold text-foreground text-[1rem]">{step.title}</h3>
                    <p className="text-[0.9375rem] text-muted leading-relaxed">{step.body}</p>
                    {step.href && step.cta && (
                      <a
                        href={step.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 self-start inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-gold hover:text-gold-dim transition-colors"
                      >
                        {step.cta}
                        <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                      </a>
                    )}
                  </div>
                </div>
              </CinematicItem>
            ))}
          </CinematicStagger>

          {/* Main CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <a
              href={siteConfig.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-gold px-8 py-3.5 text-[0.9375rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Enter on Instagram
            </a>
            <a
              href={siteConfig.socials.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-8 py-3.5 text-[0.9375rem] font-semibold text-muted hover:text-foreground hover:border-gold/30 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Subscribe on YouTube
            </a>
          </div>

        </div>
      </Container>

      {/* ── Previous winners ── */}
      <div className="border-t border-border bg-surface">
        <Container className="py-14 sm:py-20">
          <div className="flex flex-col items-center gap-10 max-w-2xl mx-auto">

            <CinematicReveal variant="gentle">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-px w-8 bg-gold opacity-70" aria-hidden="true" />
                  <span className="text-label text-gold tracking-widest">Hall of Fame</span>
                  <span className="h-px w-8 bg-gold opacity-70" aria-hidden="true" />
                </div>
                <h2 className="heading-3 text-foreground">Previous winners</h2>
                <p className="text-[0.9375rem] text-muted">Real creators, real prizes. Could be you next.</p>
              </div>
            </CinematicReveal>

            <CinematicStagger
              className="w-full flex flex-col gap-3"
              itemVariant="gentle"
              stagger={0.07}
            >
              {PAST_WINNERS.map((winner) => (
                <CinematicItem key={winner.handle} variant="gentle">
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-5 py-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Avatar placeholder */}
                      <div className="h-9 w-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                        <span className="text-gold text-[0.75rem] font-bold">{winner.name[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[0.9375rem] font-semibold text-foreground truncate">{winner.name}</p>
                        <p className="text-[0.8125rem] text-muted truncate">{winner.handle}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[0.875rem] font-medium text-foreground">{winner.prize}</p>
                      <p className="text-[0.8125rem] text-muted">{winner.month}</p>
                    </div>
                  </div>
                </CinematicItem>
              ))}
            </CinematicStagger>

          </div>
        </Container>
      </div>

      {/* ── Legal ── */}
      <div className="border-t border-border">
        <Container className="py-8 sm:py-10">
          <div className="flex flex-col items-center gap-5 max-w-2xl mx-auto text-center">
            <p className="text-[0.8125rem] text-muted/50 leading-relaxed">
              Winner selected at random from qualifying entries. Open to all residents 18+.
              One winner announced on Instagram Stories within 7 days of the closing date.
              PXL Creator reserves the right to modify or cancel the giveaway at any time.
              No purchase necessary. Void where prohibited.
            </p>
            <Link
              href="/contact"
              className="text-[0.8125rem] text-muted/50 hover:text-gold transition-colors underline underline-offset-4"
            >
              Questions? Contact us
            </Link>
          </div>
        </Container>
      </div>

    </div>
  )
}

/* ── Countdown Timer ──────────────────────────────────────── */

interface TimeLeft {
  days:    number
  hours:   number
  minutes: number
  seconds: number
}

function Countdown({ endDate }: { endDate: Date }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
  const [expired,  setExpired]  = useState(false)

  useEffect(() => {
    function calculate() {
      const diff = endDate.getTime() - Date.now()
      if (diff <= 0) {
        setExpired(true)
        return
      }
      setTimeLeft({
        days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      })
    }
    calculate()
    const id = setInterval(calculate, 1000)
    return () => clearInterval(id)
  }, [endDate])

  if (expired) {
    return (
      <p className="text-[0.9375rem] text-muted">This giveaway has ended. Stay tuned for the next one.</p>
    )
  }

  /* Skeleton — avoids hydration mismatch by rendering nothing until client mounts */
  if (!timeLeft) return <div className="h-[72px]" aria-hidden="true" />

  const units = [
    { label: "Days",    value: timeLeft.days    },
    { label: "Hours",   value: timeLeft.hours   },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ]

  return (
    <div className="flex items-end gap-3 sm:gap-5" aria-label="Giveaway countdown timer" role="timer">
      {units.map(({ label, value }, i) => (
        <div key={label} className="flex items-end gap-3 sm:gap-5">
          <div className="flex flex-col items-center gap-1">
            <div className="min-w-[52px] sm:min-w-[64px] rounded-xl border border-border bg-surface/80 px-3 py-2.5 text-center">
              <span className="font-display font-black text-[1.625rem] sm:text-[2rem] text-foreground leading-none tabular-nums">
                {String(value).padStart(2, "0")}
              </span>
            </div>
            <span className="text-[0.6875rem] text-muted/60 tracking-wider uppercase">{label}</span>
          </div>
          {i < units.length - 1 && (
            <span className="text-gold/40 text-[1.5rem] font-thin mb-7 select-none" aria-hidden="true">:</span>
          )}
        </div>
      ))}
    </div>
  )
}
