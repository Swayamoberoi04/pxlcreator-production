"use client"

/**
 * ManifestoSection.tsx — The PXL Distinction
 *
 * Premium scroll-linked animation system (Apple / Porsche aesthetic):
 *
 *   • useScroll() + useTransform() — zero React re-renders on scroll.
 *     All animation runs in Framer Motion's internal RAF loop.
 *   • Per-row ContrastRow sub-components each own their useTransform calls.
 *   • Left (wrong) side: slides in from left at low opacity — visually "faded".
 *   • Right (bold) side: slides in from right, full opacity — feels definitive.
 *   • Divider line scales in left → right as the row reveals.
 *   • Headline reveals last with scale + opacity.
 *   • All transforms use: opacity, x, y, scale only — compositor path, 60fps.
 *   • Respects prefers-reduced-motion: static fallback, no motion values.
 *
 * Scroll range: "start end" (section just entering viewport bottom) →
 *               "end start" (section just exiting viewport top).
 * Row stagger: each row starts 0.08 progress units after the previous.
 */

import { useRef }                                                from "react"
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion"
import dynamic                                                   from "next/dynamic"
import { Container }                                             from "@/components/layout/Container"
import { CinematicBackground }                                   from "@/components/ui/CinematicBackground"
import { GrainOverlay }                                          from "@/components/ui/GrainOverlay"
import { ClientOnly }                                            from "@/components/ui/ClientOnly"

const AmbientOrbs = dynamic(
  () => import("@/components/3d/AmbientOrbs").then((m) => m.AmbientOrbs),
  { ssr: false }
)

/* ── Content ─────────────────────────────────────────────────── */
const CONTRASTS = [
  { faded: "A filter",  bold: "A signature."  },
  { faded: "Editing",   bold: "Expression."   },
  { faded: "A preset",  bold: "A language."   },
] as const

type ContrastItem = typeof CONTRASTS[number]

/* ── Gradient text style (shared between static + motion paths) ── */
const GRADIENT_STYLE: React.CSSProperties = {
  background:           "linear-gradient(135deg, #ffffff 0%, #FFD60A 45%, #E0A800 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor:  "transparent",
  backgroundClip:       "text",
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ContrastRow — owns its own scroll-derived motion values.
   Each instance subscribes to the shared scrollYProgress and
   derives its own x/opacity/scale — no React re-renders on scroll.
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
interface ContrastRowProps {
  item:            ContrastItem
  scrollYProgress: MotionValue<number>
  /** Progress value at which this row begins to reveal. */
  rangeStart:      number
  /** Progress value at which this row is fully revealed. */
  rangeEnd:        number
}

function ContrastRow({ item, scrollYProgress, rangeStart, rangeEnd }: ContrastRowProps) {
  /*
   * Left side (faded / "wrong"):
   *   - Enters from the left at low opacity — already muted, reinforces "faded" intent.
   *   - Slides fully in slightly before the right side, creating a L→R reveal sweep.
   */
  const leftX       = useTransform(scrollYProgress, [rangeStart, rangeEnd - 0.02], [-24, 0])
  const leftOpacity = useTransform(scrollYProgress, [rangeStart, rangeEnd - 0.02], [0,   0.28])

  /*
   * Arrow: subtle timing — appears halfway through the row reveal.
   */
  const arrowOpacity = useTransform(
    scrollYProgress,
    [rangeStart + 0.02, rangeEnd - 0.02],
    [0, 0.45]
  )

  /*
   * Right side (bold / "right"):
   *   - Starts 1/3 into the row's range so it feels like a response to the left side.
   *   - Slides from right + scale-up — depth/weight feel.
   *   - Full opacity — visual emphasis.
   */
  const lag          = (rangeEnd - rangeStart) * 0.30
  const rightX       = useTransform(scrollYProgress, [rangeStart + lag, rangeEnd],  [28, 0]   )
  const rightOpacity = useTransform(scrollYProgress, [rangeStart + lag, rangeEnd],  [0,  1]   )
  const rightScale   = useTransform(scrollYProgress, [rangeStart + lag, rangeEnd],  [0.95, 1] )

  /*
   * Divider line: scales in from left — acts as the punctuation of the row reveal.
   */
  const lineScale    = useTransform(scrollYProgress, [rangeStart, rangeEnd - 0.01], [0, 1])

  return (
    <div className="relative flex items-center justify-between gap-8 py-7">
      {/* Divider — origin-left scale from 0 → 1 */}
      <motion.div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-px bg-border/40 origin-left"
        style={{ scaleX: lineScale }}
      />

      {/* Left — muted / wrong side */}
      <motion.span
        style={{ opacity: leftOpacity, x: leftX }}
        className="text-[1.0625rem] sm:text-[1.25rem] text-muted/70 line-through font-medium leading-none shrink-0"
      >
        {item.faded}
      </motion.span>

      {/* Arrow separator */}
      <motion.span
        style={{ opacity: arrowOpacity }}
        className="text-gold/40 text-[0.75rem] shrink-0"
        aria-hidden="true"
      >
        →
      </motion.span>

      {/* Right — bold / definitive */}
      <motion.span
        style={{ opacity: rightOpacity, x: rightX, scale: rightScale }}
        className="text-[1.25rem] sm:text-[1.5rem] font-display font-black text-foreground leading-none"
      >
        {item.bold}
      </motion.span>
    </div>
  )
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ManifestoSection
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export function ManifestoSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduced    = useReducedMotion()

  /*
   * Track scroll progress as the section moves through the viewport.
   * offset: ["start end", "end start"]
   *   → 0 when section top reaches viewport bottom (entering)
   *   → 1 when section bottom reaches viewport top (exiting)
   * This covers the full "section in view" window.
   */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })

  /* Eyebrow: fires first (0.08 → 0.17) */
  const eyebrowOpacity = useTransform(scrollYProgress, [0.08, 0.17], [0, 1])
  const eyebrowY       = useTransform(scrollYProgress, [0.08, 0.17], [14, 0])

  /* Headline: fires after all rows (0.40 → 0.54) */
  const headlineOpacity = useTransform(scrollYProgress, [0.40, 0.54], [0, 1])
  const headlineY       = useTransform(scrollYProgress, [0.40, 0.54], [32, 0])
  const headlineScale   = useTransform(scrollYProgress, [0.40, 0.54], [0.96, 1])

  /*
   * Row ranges — stagger: each row starts 0.08 progress units after the previous.
   * Row 0: 0.14 → 0.26  (section ~15% through viewport)
   * Row 1: 0.22 → 0.34
   * Row 2: 0.30 → 0.42
   */
  const ROW_RANGES: [number, number][] = [
    [0.14, 0.26],
    [0.22, 0.34],
    [0.30, 0.42],
  ]

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden border-y border-border bg-surface depth-section"
    >

      {/* ── 3D ambient orbs canvas ── */}
      <ClientOnly>
        <div aria-hidden="true" className="absolute inset-0 z-[1] pointer-events-none opacity-60">
          <AmbientOrbs />
        </div>
      </ClientOnly>

      <CinematicBackground variant="manifesto" />
      <GrainOverlay opacity={0.025} animated zIndex={2} />

      {/* Gold rules */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0    h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent z-[2]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent z-[2]" />
      <div aria-hidden="true" className="absolute inset-y-0 left-0   w-px bg-gradient-to-b from-transparent via-gold/15 to-transparent z-[2]" />
      <div aria-hidden="true" className="absolute inset-y-0 right-0  w-px bg-gradient-to-b from-transparent via-gold/10 to-transparent z-[2]" />

      <Container className="relative z-[10] py-24 sm:py-36">
        <div className="flex flex-col items-center text-center gap-14 max-w-3xl mx-auto">

          {/* ── Eyebrow ── */}
          {reduced ? (
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/50 animate-gold-flicker" aria-hidden="true" />
              <span className="text-label text-gold/70 tracking-[0.2em] animate-gold-flicker">The PXL Distinction</span>
              <span className="h-px w-8 bg-gold/50 animate-gold-flicker" aria-hidden="true" />
            </div>
          ) : (
            <motion.div
              className="flex items-center gap-3"
              style={{ opacity: eyebrowOpacity, y: eyebrowY }}
            >
              <span className="h-px w-8 bg-gold/50 animate-gold-flicker" aria-hidden="true" />
              <span className="text-label text-gold/70 tracking-[0.2em] animate-gold-flicker">The PXL Distinction</span>
              <span className="h-px w-8 bg-gold/50 animate-gold-flicker" aria-hidden="true" />
            </motion.div>
          )}

          {/* ── 3 contrast rows ── */}
          <div className="flex flex-col gap-0 w-full max-w-xl">
            {reduced
              /* Static layout for reduced-motion users */
              ? CONTRASTS.map(({ faded, bold }) => (
                  <div key={bold} className="flex items-center justify-between gap-8 py-7 border-b border-border/40">
                    <span className="text-[1.0625rem] sm:text-[1.25rem] text-muted/70 line-through font-medium leading-none">{faded}</span>
                    <span className="text-gold/30 text-[0.75rem] shrink-0" aria-hidden="true">→</span>
                    <span className="text-[1.25rem] sm:text-[1.5rem] font-display font-black text-foreground leading-none">{bold}</span>
                  </div>
                ))
              /* Scroll-animated rows */
              : CONTRASTS.map((item, i) => (
                  <ContrastRow
                    key={item.bold}
                    item={item}
                    scrollYProgress={scrollYProgress}
                    rangeStart={ROW_RANGES[i][0]}
                    rangeEnd={ROW_RANGES[i][1]}
                  />
                ))
            }
          </div>

          {/* ── Power headline ── */}
          <motion.h2
            className="font-display font-black leading-[1.05] tracking-tight text-[clamp(2rem,5.5vw,3.5rem)]"
            style={{
              ...GRADIENT_STYLE,
              ...(reduced ? {} : {
                opacity: headlineOpacity,
                y:       headlineY,
                scale:   headlineScale,
              }),
            }}
          >
            One look.<br className="hidden sm:block" /> One identity.<br />
            Unmistakably yours.
          </motion.h2>

        </div>
      </Container>
    </section>
  )
}


