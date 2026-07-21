"use client"

/**
 * MotionProvider — a single global home for Framer Motion configuration.
 *
 * `reducedMotion="user"` makes EVERY motion.* component across the app
 * honor the operating-system "reduce motion" preference automatically:
 * transform and layout animations are suppressed while opacity/colour
 * fades are preserved (the accessible default — content still appears,
 * it just doesn't fly in). This covers the studio result surface,
 * cards, sliders, and any future motion component without per-component
 * useReducedMotion() wiring.
 *
 * Pairs with the CSS `@media (prefers-reduced-motion: reduce)` baseline
 * in globals.css, which handles pure-CSS animations. Together they give
 * full WCAG 2.3.3 coverage for a heavily-animated product.
 */

import { MotionConfig } from "framer-motion"

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  )
}
