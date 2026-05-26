"use client"

/**
 * SocialProofSection.tsx — Stats + Testimonials
 *
 * Cinematic upgrade:
 *   • Stat numbers animate in with GSAP count-up on scroll enter
 *   • Testimonial cards enter with CinematicStagger depth reveal
 *   • Section header uses CinematicReveal
 *   • depth-card on testimonial cards
 *   • depth-section pseudo-borders
 * Content unchanged.
 */

import { useRef, useEffect }         from "react"
import { Container }                 from "@/components/layout/Container"
import { Heading }                   from "@/components/ui/typography"
import { TESTIMONIALS, SITE_STATS }  from "@/data/testimonials"
import { cn }                        from "@/lib/utils"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"
import { LuminousEnvironment }       from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }              from "@/components/ui/GrainOverlay"
import gsap                          from "gsap"
import { ScrollTrigger }             from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

export function SocialProofSection() {
  return (
    <section className="relative w-full bg-surface overflow-hidden py-24 sm:py-32 border-y border-border depth-section">
      <LuminousEnvironment variant="gold" intensity={0.4} />
      <GrainOverlay opacity={0.014} zIndex={1} />
      <Container className="relative z-10">

        {/* ── Stats Bar — animated count-up ── */}
        <CinematicStagger
          stagger={0.09}
          baseDelay={0}
          itemVariant="rise"
          className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden mb-16 sm:mb-20"
        >
          {SITE_STATS.map((stat) => (
            <CinematicItem key={stat.label} variant="rise">
              <StatCell value={stat.value} label={stat.label} />
            </CinematicItem>
          ))}
        </CinematicStagger>

        {/* ── Testimonials header ── */}
        <CinematicReveal variant="depth" margin="-60px">
          <div className="flex flex-col items-center text-center gap-4 mb-12">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
              <span className="text-label text-gold/80">What Creators Say</span>
              <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
            </div>
            <Heading level={2} className="max-w-xl">
              Trusted by{" "}
              <span className="text-gold-gradient">Real Creators</span>
            </Heading>
            <p className="text-lead max-w-md">
              Not influencer deals. Not paid reviews. Just photographers and
              filmmakers who use these presets daily.
            </p>
          </div>
        </CinematicReveal>

        {/* ── Testimonial cards — depth stagger ── */}
        <CinematicStagger
          stagger={0.12}
          baseDelay={0.05}
          itemVariant="depth"
          className="grid grid-cols-1 md:grid-cols-3 gap-7"
        >
          {TESTIMONIALS.map((t, index) => (
            <CinematicItem key={t.id} variant="depth">
              <TestimonialCard testimonial={t} index={index} />
            </CinematicItem>
          ))}
        </CinematicStagger>

      </Container>
    </section>
  )
}

/* ── Stat cell with GSAP count-up animation ── */
function StatCell({ value, label }: { value: string; label: string }) {
  const numRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = numRef.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    /* Parse numeric part (e.g. "10,000+" → 10000) */
    const raw     = value.replace(/,/g, "")
    const numMatch = raw.match(/[\d.]+/)
    if (!numMatch) return

    const target   = parseFloat(numMatch[0])
    const suffix   = raw.slice(numMatch.index! + numMatch[0].length)  // "+", "k", "%", etc.
    const hasComma = value.includes(",")

    const ctx = gsap.context(() => {
      const proxy = { val: 0 }
      gsap.to(proxy, {
        val: target,
        duration: 1.6,
        ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
        onUpdate() {
          if (!el) return
          const n = hasComma
            ? Math.round(proxy.val).toLocaleString()
            : proxy.val % 1 !== 0
              ? proxy.val.toFixed(1)
              : Math.round(proxy.val).toString()
          el.textContent = n + suffix
        },
        onComplete() {
          /* Ensure exact final value */
          el.textContent = value
        },
      })
    }, el)

    return () => ctx.revert()
  }, [value])

  return (
    <div className="flex flex-col items-center justify-center gap-2 bg-surface px-8 py-10 text-center">
      <span
        ref={numRef}
        className="font-display text-4xl sm:text-5xl font-bold text-gold leading-none"
      >
        {value}
      </span>
      <span className="text-small text-muted">{label}</span>
    </div>
  )
}

/* ── Individual testimonial card ── */
interface TestimonialCardProps {
  testimonial: (typeof TESTIMONIALS)[number]
  index: number
}

function TestimonialCard({ testimonial, index }: TestimonialCardProps) {
  const isFeatured = index === 1

  return (
    <div
      className={cn(
        "depth-card flex flex-col gap-6 rounded-2xl p-7 border",
        "bg-surface-2 transition-all duration-300",
        isFeatured
          ? "border-gold/30 shadow-[0_0_50px_rgba(255,215,0,0.07)]"
          : "border-border hover:border-gold/15"
      )}
    >

      {/* Stars */}
      <div className="flex items-center gap-0.5" aria-label={`${testimonial.rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon key={i} filled={i < testimonial.rating} />
        ))}
      </div>

      {/* Quote */}
      <blockquote className="text-body text-foreground leading-relaxed flex-1">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>

      {/* Pack tag */}
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-gold shrink-0" />
        <span className="text-small text-gold">{testimonial.pack}</span>
      </div>

      {/* Author */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <Avatar initials={testimonial.avatarInitials} featured={isFeatured} />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground leading-tight">
            {testimonial.name}
          </span>
          <span className="text-small text-muted">{testimonial.role}</span>
        </div>
      </div>

    </div>
  )
}

function Avatar({ initials, featured }: { initials: string; featured: boolean }) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
        "text-sm font-bold leading-none select-none",
        featured
          ? "bg-gold text-background"
          : "bg-surface-3 text-muted border border-border"
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "#ffd700" : "none"}
      stroke={filled ? "none" : "#555555"}
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}
