"use client"

/**
 * SmoothScrollProvider.tsx
 *
 * Wraps the entire app in Lenis smooth scrolling.
 * Bridges Lenis with GSAP's ticker so ScrollTrigger stays in sync.
 *
 * Architecture:
 *   ReactLenis (root, autoRaf=false)
 *     └─ GSAPScrollBridge  — drives Lenis via gsap.ticker so both
 *                            systems share a single RAF loop.
 *        └─ {children}     — rest of the app
 *
 * Why autoRaf=false: prevents a double-RAF situation where Lenis would
 * update itself AND GSAP would also call lenis.raf(). One loop is enough.
 */

import ReactLenis, { useLenis } from "lenis/react"
import { useEffect }             from "react"
import gsap                      from "gsap"
import { ScrollTrigger }         from "gsap/ScrollTrigger"

/* Register GSAP plugins once, client-side */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

/* ── GSAP ↔ Lenis bridge ──────────────────────────────────────── */
function GSAPScrollBridge() {
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) return

    /*
     * Capture the narrowed, non-undefined instance into a const so that
     * TypeScript preserves the type inside nested function declarations
     * (control-flow narrowing is not propagated into deferred callbacks).
     */
    const l = lenis

    /* Drive Lenis from GSAP's ticker so both share one rAF loop.
       GSAP passes `time` in seconds; Lenis.raf() expects milliseconds. */
    function update(time: number) {
      l.raf(time * 1000)
    }

    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0) // prevents large jumps after tab switch

    /* Keep ScrollTrigger positions fresh on every Lenis scroll event */
    const onScroll = () => ScrollTrigger.update()
    l.on("scroll", onScroll)

    return () => {
      gsap.ticker.remove(update)
      l.off("scroll", onScroll)
    }
  }, [lenis])

  return null
}

/* ── Provider ─────────────────────────────────────────────────── */
export function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ReactLenis
      root
      autoRaf={false}
      options={{
        lerp:             0.09,   /* smoothness coefficient — 0.09 balances butter vs response */
        duration:         0.9,    /* 1.2→0.9: snappier without losing the cinematic float feel */
        smoothWheel:      true,   /* smooth trackpad and wheel events */
        touchMultiplier:  1.8,    /* slightly reduced for more natural mobile feel */
        wheelMultiplier:  1,      /* wheel sensitivity */
        infinite:         false,
        /* easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) — Lenis default is fine */
      }}
    >
      <GSAPScrollBridge />
      {children}
    </ReactLenis>
  )
}
