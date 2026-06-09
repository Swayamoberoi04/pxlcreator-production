"use client"

/**
 * CinematicReveal.tsx
 *
 * Framer Motion 3D-depth scroll-reveal system.
 * Replaces the flat `ScrollReveal` for sections that need
 * a premium, spatially-dimensional entrance feel.
 *
 * Components:
 *   CinematicReveal   — single element with 3D entrance
 *   CinematicStagger  — container that staggers children
 *   CinematicItem     — child element for CinematicStagger
 *
 * Variants:
 *   "depth"  — 3D flip from below (rotateX -18°, perspective)  [DEFAULT]
 *   "rise"   — graceful upward float with depth
 *   "left"   — slide in from left
 *   "right"  — slide in from right
 *
 * Architecture fix (v2):
 *   - Non-perspective variants ("rise", "left", "right") now render a
 *     SINGLE motion.div instead of div > motion.div. This prevents the
 *     extra wrapper from disrupting flex/grid layouts and removes an
 *     unnecessary DOM node.
 *   - "depth" variant still needs the outer div for CSS perspective context.
 *   - CinematicStagger's `style` prop is now correctly applied to the inner
 *     motion.div (which holds the className/grid layout), not the outer
 *     perspective wrapper.
 *
 * All animations respect `prefers-reduced-motion`.
 */

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode }            from "react"

/* ── Eases ─────────────────────────────────────────────────────── */
const EXPO_OUT    = [0.16, 1, 0.3,  1] as const   // premium expo out
const CINEMA_EASE = [0.22, 1, 0.36, 1] as const   // existing brand ease

/* ── Per-variant motion configs ────────────────────────────────── */
const VARIANTS = {
  depth: {
    hidden: {
      opacity:   0,
      y:         52,   /* reduced from 72 — less travel distance */
      rotateX:  -10,   /* reduced from -18 — less aggressive perspective rasterization */
      scale:     0.975,
    },
    visible: (delay = 0) => ({
      opacity:  1,
      y:        0,
      rotateX:  0,
      scale:    1,
      transition: { duration: 0.9, ease: EXPO_OUT, delay },
    }),
    perspective: "1200px",  /* reduced from 1400px */
    perspectiveOrigin: "50% -10%",
    transformOrigin:   "50% 0%",
  },

  rise: {
    hidden: { opacity: 0, y: 36 },  /* reduced from 48 */
    visible: (delay = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.85, ease: CINEMA_EASE, delay },
    }),
    perspective: undefined,
    perspectiveOrigin: undefined,
    transformOrigin:   undefined,
  },

  left: {
    hidden: { opacity: 0, x: -60 },
    visible: (delay = 0) => ({
      opacity: 1,
      x: 0,
      transition: { duration: 0.82, ease: CINEMA_EASE, delay },
    }),
    perspective: undefined,
    perspectiveOrigin: undefined,
    transformOrigin:   undefined,
  },

  right: {
    hidden: { opacity: 0, x: 60 },
    visible: (delay = 0) => ({
      opacity: 1,
      x: 0,
      transition: { duration: 0.82, ease: CINEMA_EASE, delay },
    }),
    perspective: undefined,
    perspectiveOrigin: undefined,
    transformOrigin:   undefined,
  },
} as const

type Variant = keyof typeof VARIANTS

/* ═══════════════════════════════════════════════════════════════
   CinematicReveal — single element
══════════════════════════════════════════════════════════════════ */
interface CinematicRevealProps {
  children:   ReactNode
  className?: string
  variant?:   Variant
  delay?:     number
  /**
   * IntersectionObserver root margin.
   * Negative = element must be N px INSIDE viewport before firing.
   * Default "-20px" — just 20px inside viewport, much safer than -60px
   * which caused elements near the fold to never animate on small viewports.
   */
  margin?:    string
}

export function CinematicReveal({
  children,
  className,
  variant = "depth",
  delay   = 0,
  margin  = "-20px",
}: CinematicRevealProps) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>

  const cfg = VARIANTS[variant]

  /* Depth variant needs an outer div for CSS perspective context */
  if (cfg.perspective) {
    return (
      <div
        style={{
          perspective:       cfg.perspective,
          perspectiveOrigin: cfg.perspectiveOrigin,
          contain:           "layout",  /* prevent layout thrash during animation */
        }}
      >
        <motion.div
          className={className}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin }}
          variants={{
            hidden:  cfg.hidden,
            visible: cfg.visible(delay),
          }}
          style={{ transformOrigin: cfg.transformOrigin }}
        >
          {children}
        </motion.div>
      </div>
    )
  }

  /* Non-perspective variants: single motion.div — no wrapper overhead */
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin }}
      variants={{
        hidden:  cfg.hidden,
        visible: cfg.visible(delay),
      }}
    >
      {children}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CinematicStagger — staggered container
   Children should be <CinematicItem> elements.
══════════════════════════════════════════════════════════════════ */
interface CinematicStaggerProps {
  children:     ReactNode
  className?:   string
  stagger?:     number
  baseDelay?:   number
  itemVariant?: Variant
  margin?:      string
  style?:       React.CSSProperties
}

export function CinematicStagger({
  children,
  className,
  stagger     = 0.085,
  baseDelay   = 0,
  itemVariant = "depth",
  margin      = "-20px",
  style,
}: CinematicStaggerProps) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className} style={style}>{children}</div>

  const cfg = VARIANTS[itemVariant]
  const hasPerspective = cfg.perspective !== undefined

  /* Depth variant: wrap in perspective div, but style goes to motion.div */
  if (hasPerspective) {
    return (
      <div
        style={{
          perspective:       cfg.perspective as string,
          perspectiveOrigin: cfg.perspectiveOrigin as string,
        }}
      >
        <motion.div
          className={className}
          style={style}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin }}
          variants={{
            hidden:  {},
            visible: { transition: { staggerChildren: stagger, delayChildren: baseDelay } },
          }}
        >
          {children}
        </motion.div>
      </div>
    )
  }

  /* Non-perspective variants: single motion.div */
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin }}
      variants={{
        hidden:  {},
        visible: { transition: { staggerChildren: stagger, delayChildren: baseDelay } },
      }}
    >
      {children}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CinematicItem — child of CinematicStagger
══════════════════════════════════════════════════════════════════ */
interface CinematicItemProps {
  children:   ReactNode
  className?: string
  variant?:   Variant
}

export function CinematicItem({
  children,
  className,
  variant = "depth",
}: CinematicItemProps) {
  const cfg = VARIANTS[variant]

  return (
    <motion.div
      className={className}
      variants={{
        hidden:  cfg.hidden,
        visible: cfg.visible(0),
      }}
      style={cfg.transformOrigin ? { transformOrigin: cfg.transformOrigin } : undefined}
    >
      {children}
    </motion.div>
  )
}
