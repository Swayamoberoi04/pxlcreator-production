"use client"

/**
 * SmoothScrollProvider.tsx
 *
 * Wraps the app in Lenis smooth scrolling on desktop only.
 * On touch/mobile devices we skip Lenis entirely so the browser's
 * native GPU-accelerated momentum scroll handles touch — always faster
 * than any JS-driven smooth-scroll library on mobile.
 *
 * Architecture:
 *   ReactLenis (root, autoRaf=false) — desktop only
 *     └─ GSAPScrollBridge  — drives Lenis via gsap.ticker
 *        └─ {children}
 *   OR on touch devices:
 *     {children} — plain wrapper, native scroll
 *
 * Why autoRaf=false: prevents a double-RAF situation where Lenis would
 * update itself AND GSAP would also call lenis.raf(). One loop is enough.
 */

import ReactLenis, { useLenis } from "lenis/react"
import { useState, useEffect }   from "react"
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
  /*
   * On touch/mobile devices the browser's native momentum scroll is
   * GPU-accelerated and always smoother than Lenis. Skip Lenis entirely
   * on touch devices so scroll performance is maximised on mobile.
   *
   * We start as `false` (unknown) and set to `true` only on first touch
   * so we don't SSR-mismatch (both server and client start as false).
   */
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    /* Detect touch capability after mount */
    const isTouch =
      window.matchMedia("(pointer: coarse)").matches ||
      navigator.maxTouchPoints > 0

    if (isTouch) setIsTouchDevice(true)
  }, [])

  /* On touch/mobile — skip Lenis, use native browser scroll */
  if (isTouchDevice) {
    return <>{children}</>
  }

  return (
    <ReactLenis
      root
      autoRaf={false}
      options={{
        lerp:           0.09,  /* smoothness — 0.09 balances butter vs responsiveness */
        duration:       0.9,   /* slightly snappier than default 1.2 */
        smoothWheel:    true,  /* smooth trackpad and wheel events */
        wheelMultiplier: 1,    /* wheel sensitivity */
        infinite:       false,
      }}
    >
      <GSAPScrollBridge />
      {children}
    </ReactLenis>
  )
}
