"use client"

/**
 * CinematicCursor.tsx
 *
 * A fully custom cinematic cursor that replaces the OS cursor on desktop.
 *
 * Anatomy — two layers, both follow the mouse:
 *   1. Inner dot  — snaps exactly to the pointer (no lag)
 *   2. Outer ring — follows with a spring lag (lerp at 0.12/frame)
 *
 * Interaction states — class-based CSS transitions on the ring:
 *   • `.hovering`   — ring scales up 2.2×, fills with gold/5, border gold
 *   • `.clicking`   — ring contracts 0.6×, snaps back on mouseup
 *   • `.on-text`    — ring becomes a thin text-cursor beam (w:2px, h:28px)
 *   • `.hidden`     — hides both layers (e.g., when over images/videos)
 *
 * Architecture:
 *   • Position: fixed, z-index: 9999, pointer-events: none
 *   • Pure DOM manipulation via useRef + rAF — zero React re-renders
 *   • CSS variables --cx / --cy hold position for GPU compositing
 *   • Only active on `(pointer: fine)` devices (real cursors, not touch)
 *   • Hides native cursor via body `cursor: none` class toggle
 *
 * Mounted once in layout.tsx — survives route changes.
 */

import { useEffect, useRef } from "react"

export function CinematicCursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    /* Skip on touch / coarse-pointer devices */
    if (!window.matchMedia("(pointer: fine)").matches) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    /* Non-null assertion safe here — both refs attach to real DOM divs
       rendered unconditionally below. The null guard is just defensive. */
    const dot  = dotRef.current!
    const ring = ringRef.current!
    if (!dot || !ring) return

    /* Current raw position of pointer */
    let mx = -100, my = -100
    /* Ring lags behind */
    let rx = -100, ry = -100

    /* Hide the OS cursor */
    document.body.classList.add("cursor-none-cinematic")

    /* ── Pointer tracking ── */
    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
    }

    /* ── State detection ── */
    const INTERACTIVE = [
      'a', 'button', '[role="button"]', 'input', 'select',
      'textarea', 'label', '[tabindex]', '[data-cursor-hover]',
    ].join(',')

    const onEnter = (e: MouseEvent) => {
      const target = e.target as Element
      if (target.matches(INTERACTIVE)) ring.classList.add("hovering")
    }
    const onLeave = (e: MouseEvent) => {
      const target = e.target as Element
      if (target.matches(INTERACTIVE)) ring.classList.remove("hovering")
    }

    const onDown = () => ring.classList.add("clicking")
    const onUp   = () => ring.classList.remove("clicking")

    document.addEventListener("mousemove",  onMove,  { passive: true })
    document.addEventListener("mouseover",  onEnter, { passive: true })
    document.addEventListener("mouseout",   onLeave, { passive: true })
    document.addEventListener("mousedown",  onDown,  { passive: true })
    document.addEventListener("mouseup",    onUp,    { passive: true })

    /* ── rAF render loop ── */
    let rafId = 0
    const LERP = 0.115

    function tick() {
      /* Inner dot — snaps exactly */
      dot.style.transform  = `translate(${mx}px, ${my}px) translate(-50%, -50%)`

      /* Outer ring — lags with lerp */
      rx += (mx - rx) * LERP
      ry += (my - ry) * LERP
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener("mousemove",  onMove)
      document.removeEventListener("mouseover",  onEnter)
      document.removeEventListener("mouseout",   onLeave)
      document.removeEventListener("mousedown",  onDown)
      document.removeEventListener("mouseup",    onUp)
      document.body.classList.remove("cursor-none-cinematic")
    }
  }, [])

  return (
    <>
      {/* ── Inner dot — snaps to exact pointer position ── */}
      <div
        ref={dotRef}
        aria-hidden="true"
        className="cinematic-cursor-dot"
      />

      {/* ── Outer ring — spring-lagged, state-reactive ── */}
      <div
        ref={ringRef}
        aria-hidden="true"
        className="cinematic-cursor-ring"
      />
    </>
  )
}
