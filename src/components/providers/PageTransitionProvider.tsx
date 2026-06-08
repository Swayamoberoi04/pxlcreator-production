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

  /*
   * Admin routes use a `position:fixed; inset:0` overlay that must be
   * viewport-relative. Any ancestor with `filter`, `transform`, or
   * `perspective` becomes a new CSS containing block (spec §10.1), which
   * breaks the overlay by constraining it to the <main> region.
   * Bypassing the animation wrapper entirely for admin routes.
   */
  if (pathname.startsWith("/admin")) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        /*
         * GPU-only transition: opacity + translateY + scale.
         * No filter:blur (triggers full repaint behind element).
         * No rotateX (triggers perspective rasterization).
         * Only compositor-accelerated properties → smooth 60fps on mobile.
         */
        initial={{ opacity: 0, y: 16, scale: 0.982 }}
        animate={{ opacity: 1, y: 0,  scale: 1     }}
        exit={{    opacity: 0, y: -10, scale: 0.988 }}
        transition={{ duration: 0.35, ease: EXPO_OUT }}
        style={{
          flex:          1,
          display:       "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
