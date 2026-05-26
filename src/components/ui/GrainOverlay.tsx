/**
 * src/components/ui/GrainOverlay.tsx
 *
 * Animated film grain overlay — simulates celluloid texture.
 * Positions itself absolute over the parent (needs position: relative on parent).
 * Uses background-position animation to shift the SVG noise tile at ~8fps.
 * Suppressed automatically by the `.anim-grain` CSS class when
 * `prefers-reduced-motion: reduce` is active.
 */
"use client"

import { cn } from "@/lib/utils"

interface GrainOverlayProps {
  /** Grain opacity. Keep ≤ 0.06 for subtlety. Default 0.035 */
  opacity?: number
  /** Animate the grain (shifts position). Default true */
  animated?: boolean
  /** z-index layer. Default 1 */
  zIndex?: number
  className?: string
}

/* Inline SVG noise — no network request, no flicker */
const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.80' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`

export function GrainOverlay({
  opacity  = 0.035,
  animated = true,
  zIndex   = 1,
  className,
}: GrainOverlayProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("absolute inset-0 pointer-events-none", className)}
      style={{
        zIndex,
        opacity,
        backgroundImage: GRAIN_SVG,
        backgroundSize:  "300px 300px",
        mixBlendMode:    "overlay",
        /* animation class lets the CSS media query suppress it cleanly */
        animation: animated
          ? "grain-shift 0.14s steps(1) infinite"
          : "none",
      }}
    />
  )
}
