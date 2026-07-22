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

import { useEffect, useRef, useState } from "react"

export function CinematicCursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  /*
   * enabled gates whether the cursor DOM is rendered at all.
   * On touch devices (pointer: coarse) or with reduced-motion the effect
   * returns early — but if we still rendered the two fixed divs they would
   * sit as a stray gold dot + ring stuck in the top-left corner on mobile
   * (no transform is ever applied). Rendering nothing avoids that artifact.
   */
  const [enabled, setEnabled] = useState(false)

  /* ── Capability detection — decides whether to render + activate ── */
  useEffect(() => {
    /* Skip on touch / coarse-pointer devices and reduced-motion */
    if (!window.matchMedia("(pointer: fine)").matches) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    setEnabled(true)
  }, [])

  /* ── Activation — runs only after the cursor DOM has rendered ── */
  useEffect(() => {
    if (!enabled) return

    /* Non-null after the guard; asserted so the values stay non-null when
       captured inside the rAF `tick` closure below (TS re-widens otherwise). */
    if (!dotRef.current || !ringRef.current) return
    const dot  = dotRef.current!
    const ring = ringRef.current!

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
    const idleTimer = 0
    let isRunning = false
    const LERP = 0.115

    function tick() {
      /* Inner dot — snaps exactly */
      dot.style.transform  = `translate(${mx}px, ${my}px) translate(-50%, -50%)`

      /* Outer ring — lags with lerp */
      rx += (mx - rx) * LERP
      ry += (my - ry) * LERP
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`

      /* Stop the loop once ring has fully caught up (< 0.1px delta) */
      const dxSettled = Math.abs(mx - rx) < 0.1
      const dySettled = Math.abs(my - ry) < 0.1
      if (dxSettled && dySettled) {
        isRunning = false
        return           /* No cancelAnimationFrame needed — loop just exits */
      }

      rafId = requestAnimationFrame(tick)
    }

    /* Start the loop only on pointer movement — idle pages pay zero cost */
    const startLoop = () => {
      if (isRunning) return
      isRunning = true
      rafId = requestAnimationFrame(tick)
    }

    const _origOnMove = onMove
    const onMoveWithRAF = (e: MouseEvent) => {
      _origOnMove(e)
      startLoop()
    }

    document.removeEventListener("mousemove", onMove)
    document.addEventListener("mousemove", onMoveWithRAF, { passive: true })

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(idleTimer)
      document.removeEventListener("mousemove",  onMoveWithRAF)
      document.removeEventListener("mouseover",  onEnter)
      document.removeEventListener("mouseout",   onLeave)
      document.removeEventListener("mousedown",  onDown)
      document.removeEventListener("mouseup",    onUp)
      document.body.classList.remove("cursor-none-cinematic")
    }
  }, [enabled])

  /* Render nothing on touch devices — avoids a stray gold dot/ring artifact
     stuck in the top-left corner where no transform is ever applied. */
  if (!enabled) return null

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
