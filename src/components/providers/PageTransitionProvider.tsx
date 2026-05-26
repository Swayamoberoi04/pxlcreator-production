"use client"

/**
 * PageTransitionProvider.tsx
 *
 * Apple-level cinematic page transitions via Framer Motion AnimatePresence.
 *
 * Transition design:
 *   EXIT  — current page: scale down to 0.97, fade out, slight rotateX tilt,
 *            motion blur via CSS filter, recedes into depth.
 *   ENTER — new page: rises from slightly scaled-down + rotateX state,
 *            fades in, clears blur, settles into full scale (expo-out ease).
 *
 * The combined effect: a sense of spatial depth — like moving through
 * a dimensional cinematic world, not a flat 2D crossfade.
 *
 * Used in layout.tsx wrapping {children}.
 */

import { usePathname }            from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import type { ReactNode }          from "react"

interface PageTransitionProviderProps {
  children: ReactNode
}

/* Premium expo-out — identical to CinematicReveal depth easing */
const EXPO_OUT = [0.16, 1, 0.3, 1] as const

export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        /* ── Enter: rise from depth ── */
        initial={{
          opacity: 0,
          y:       20,
          scale:   0.974,
          rotateX: 5,
          filter:  "blur(6px)",
        }}
        animate={{
          opacity: 1,
          y:       0,
          scale:   1,
          rotateX: 0,
          filter:  "blur(0px)",
        }}
        /* ── Exit: recede into depth ── */
        exit={{
          opacity: 0,
          y:       -14,
          scale:   0.968,
          rotateX: -4,
          filter:  "blur(4px)",
        }}
        transition={{
          duration: 0.48,
          ease:     EXPO_OUT,
        }}
        style={{
          flex:            1,
          display:         "flex",
          flexDirection:   "column",
          transformOrigin: "50% 0%",
          perspective:     "1400px",
          /* willChange is intentionally omitted from the static style —
             keeping it on permanently promotes this element to a
             composited layer even when idle, wasting GPU memory.
             Framer Motion promotes the layer automatically during
             animation and demotes it when the transition completes. */
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
