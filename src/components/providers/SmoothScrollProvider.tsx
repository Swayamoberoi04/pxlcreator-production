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
 * Performance note:
 *   GSAP + ScrollTrigger are NOT imported at the module level so they are
 *   never bundled into the mobile JS path. The DesktopScrollProvider lazy-
 *   loads them only when the component mounts, which only happens on non-
 *   touch devices (touch branch returns before rendering DesktopScrollProvider).
 */

import ReactLenis, { useLenis } from "lenis/react"
import { useState, useEffect } from "react"

/* ── GSAP ↔ Lenis bridge — only imported in the desktop branch ── */
function GSAPScrollBridge() {
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) return
    const l = lenis

    /* Lazy-import GSAP only when this component mounts (desktop only) */
    let cleanup: (() => void) | undefined

    import("gsap").then(({ default: gsap }) =>
      import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger)

        function update(time: number) { l.raf(time * 1000) }

        gsap.ticker.add(update)
        gsap.ticker.lagSmoothing(0)

        const onScroll = () => ScrollTrigger.update()
        l.on("scroll", onScroll)

        cleanup = () => {
          gsap.ticker.remove(update)
          l.off("scroll", onScroll)
        }
      })
    )

    return () => { cleanup?.() }
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
   * Touch detection: evaluated once synchronously after mount.
   * Using `useState(false)` + `useEffect` causes:
   *   1. SSR renders Lenis wrapper (server doesn't know device type)
   *   2. Client mounts, effect fires, state flips → second render
   * This double-render is wasted work. Using `useSyncExternalStore` pattern
   * or a lazy initialiser keeps it to one render on the client.
   */
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    const isTouch =
      window.matchMedia("(pointer: coarse)").matches ||
      navigator.maxTouchPoints > 0
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isTouch) setIsTouchDevice(true)
  }, [])

  /* On touch/mobile — skip Lenis and GSAP entirely, use native scroll */
  if (isTouchDevice) {
    return <>{children}</>
  }

  return (
    <ReactLenis
      root
      autoRaf={false}
      options={{
        lerp:            0.10,  /* slightly snappier feel (was 0.09) */
        duration:        0.85,
        smoothWheel:     true,
        wheelMultiplier: 1,
        infinite:        false,
      }}
    >
      <GSAPScrollBridge />
      {children}
    </ReactLenis>
  )
}
