/**
 * src/components/ui/ScrollReveal.tsx
 *
 * Framer Motion scroll-triggered entrance animation wrapper.
 *
 * Usage (Server Component):
 *   import { ScrollReveal } from "@/components/ui/ScrollReveal"
 *   <ScrollReveal delay={0.1}>
 *     <p>This fades in when it enters the viewport.</p>
 *   </ScrollReveal>
 *
 * Architecture:
 *   - Client Component — wraps children in a `motion.div`
 *   - Triggers once (viewport: { once: true }) for performance
 *   - Uses cubic-bezier [0.22, 1, 0.36, 1] — the "expo out" ease for premium
 *     entrance feel (quick settle, no over-shoot)
 *   - Automatically disabled when `prefers-reduced-motion` is set via
 *     Framer Motion's built-in useReducedMotion hook
 */
"use client"

import React                        from "react"
import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode }           from "react"

interface ScrollRevealProps {
  children:   ReactNode
  /** Extra delay before the entrance animation fires, in seconds */
  delay?:     number
  /** Animation duration in seconds. Default 0.65 */
  duration?:  number
  /** Starting Y offset in px. Default 22 */
  y?:         number
  /** Starting opacity. Default 0 */
  opacity?:   number
  className?: string
}

export function ScrollReveal({
  children,
  delay    = 0,
  duration = 0.65,
  y        = 22,
  opacity  = 0,
  className,
}: ScrollRevealProps) {
  const reducedMotion = useReducedMotion()

  /* When the user prefers reduced motion, render children without
     any animation — no flicker, no layout shift. */
  if (reducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ── Staggered group variant ───────────────────────────────── */
/* Wraps multiple children and staggers their reveal */

interface StaggerRevealProps {
  children:       ReactNode
  stagger?:       number   // seconds between each child, default 0.1
  baseDelay?:     number   // seconds before the first child animates
  className?:     string
  style?:         React.CSSProperties
}

export function StaggerReveal({
  children,
  stagger   = 0.10,
  baseDelay = 0,
  className,
  style,
}: StaggerRevealProps) {
  const reducedMotion = useReducedMotion()

  if (reducedMotion) {
    return <div className={className} style={style}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden:  {},
        visible: { transition: { staggerChildren: stagger, delayChildren: baseDelay } },
      }}
    >
      {children}
    </motion.div>
  )
}

/* ── Item for use inside StaggerReveal ─────────────────────── */

interface StaggerItemProps {
  children:   ReactNode
  className?: string
  y?:         number
}

export function StaggerItem({ children, className, y = 18 }: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden:  { opacity: 0, y },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  )
}
