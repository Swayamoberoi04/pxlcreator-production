"use client"

/**
 * ScrollPhysics.tsx
 *
 * GSAP ScrollTrigger anti-gravity parallax system.
 *
 * Makes children float at different speeds relative to scroll,
 * creating the cinematic anti-gravity dimensional effect where
 * elements at different "depths" drift at different rates —
 * like moving through a layered cinematic world.
 *
 * Architecture:
 *   • `<ScrollPhysics>` wraps any element and registers a GSAP
 *     ScrollTrigger on mount, using the parent section as the
 *     scroll container reference.
 *   • `depth` (0–1): how much the element drifts. 0 = anchored,
 *     1 = moves fully with scroll (like a sticky element).
 *     Visually: depth 0.1–0.3 = deep background, depth 0.7–0.9 =
 *     floating foreground.
 *   • `direction`: vertical (default), horizontal, or both.
 *   • `rotate`: optional Z-rotation amplitude in degrees.
 *   • `scale`: optional scale breathing amplitude.
 *
 * Performance:
 *   • Uses `will-change: transform` and GPU-composited transforms only
 *   • GSAP handles rAF scheduling — no extra animation loops
 *   • Proper cleanup via `ctx.revert()` on unmount
 *
 * Respects `prefers-reduced-motion`.
 *
 * Usage:
 *   // Slow-floating background element
 *   <ScrollPhysics depth={0.15} className="absolute inset-0">
 *     <div className="ambient-layer" />
 *   </ScrollPhysics>
 *
 *   // Fast-floating foreground card
 *   <ScrollPhysics depth={0.65} rotate={4}>
 *     <FeatureCard />
 *   </ScrollPhysics>
 */

import { useRef, useEffect, type ReactNode } from "react"
/*
 * GSAP + ScrollTrigger lazy-loaded inside useEffect.
 * ScrollPhysics only activates when elements approach the viewport;
 * deferring GSAP to mount time keeps it out of the initial bundle.
 */

interface ScrollPhysicsProps {
  children:    ReactNode
  className?:  string
  /** 0 = no drift, 1 = full drift with scroll. Sweet spots: 0.1–0.3 (bg), 0.5–0.8 (fg) */
  depth?:      number
  /** Max Y travel in pixels (derived from depth if not set) */
  yRange?:     number
  /** Rotation amplitude in degrees */
  rotate?:     number
  /** Scale breathing: 1 + scale at start, 1 at end */
  scale?:      number
  /** Horizontal drift direction and depth */
  xDepth?:     number
  /** Start trigger — "top bottom" by default */
  start?:      string
  /** End trigger — "bottom top" by default */
  end?:        string
}

export function ScrollPhysics({
  children,
  className,
  depth    = 0.3,
  yRange,
  rotate   = 0,
  scale    = 0,
  xDepth   = 0,
  start    = "top bottom",
  end      = "bottom top",
}: ScrollPhysicsProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    /* Respect reduced-motion preference */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const el  = ref.current
    if (!el) return

    /* Compute Y travel from depth if not explicitly set */
    const travel = yRange ?? Math.round(depth * 160)

    let ctx: { revert: () => void } | undefined

    /* Lazy-load GSAP + ScrollTrigger — deferred until after initial render */
    import("gsap").then(({ default: gsap }) =>
      import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger)
        ctx = gsap.context(() => {
          gsap.fromTo(
            el,
            {
              y:       travel,
              rotate:  rotate  ? -rotate  : 0,
              scale:   scale   ? 1 + scale : 1,
              x:       xDepth  ? -xDepth * 60 : 0,
            },
            {
              y:       -travel,
              rotate:  rotate  ? rotate   : 0,
              scale:   1,
              x:       xDepth  ? xDepth * 60  : 0,
              ease:    "none",
              scrollTrigger: {
                trigger:  el,
                start,
                end,
                scrub:    1.8,
              },
            }
          )
        }, el)
      })
    )

    return () => { ctx?.revert() }
  }, [depth, yRange, rotate, scale, xDepth, start, end])

  return (
    <div
      ref={ref}
      className={className}
      /*
       * will-change removed from the static style.
       * GSAP sets it automatically via its own CSSPlugin when the
       * ScrollTrigger animation is active, and removes it on completion.
       * Setting it statically on every wrapper (even when off-screen) forces
       * the browser to allocate a compositor layer for every element at load
       * time — GPU memory pressure with no benefit until scroll starts.
       */
    >
      {children}
    </div>
  )
}

/* ── ScrollPhysicsGroup ──────────────────────────────────────────
   Applies staggered floating depths to a set of children,
   creating the anti-gravity multi-layer parallax field.
   Pass an array of depth values matching child count, or
   provide a single `baseDepth` and get auto-generated depths.
──────────────────────────────────────────────────────────────── */
interface ScrollPhysicsGroupProps {
  children:    ReactNode[]
  baseDepth?:  number
  depths?:     number[]
  rotations?:  number[]
  className?:  string
  itemClass?:  string
}

export function ScrollPhysicsGroup({
  children,
  baseDepth = 0.25,
  depths,
  rotations,
  className,
  itemClass,
}: ScrollPhysicsGroupProps) {
  return (
    <div className={className}>
      {children.map((child, i) => {
        const d = depths    ? depths[i]    ?? baseDepth : baseDepth + i * 0.08
        const r = rotations ? rotations[i] ?? 0        : 0
        return (
          <ScrollPhysics key={i} depth={d} rotate={r} className={itemClass}>
            {child}
          </ScrollPhysics>
        )
      })}
    </div>
  )
}
