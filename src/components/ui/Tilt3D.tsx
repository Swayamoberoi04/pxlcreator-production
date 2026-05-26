"use client"
/* eslint-disable react-hooks/immutability */

/**
 * Tilt3D.tsx
 *
 * CSS perspective tilt wrapper — wraps any card/element so it rotates
 * slightly in 3D toward the cursor on hover, then smoothly returns to flat.
 *
 * Implementation:
 *   – Tracks pointer via React synthetic events (no global listener)
 *   – Animates via requestAnimationFrame + lerp (no GSAP dependency)
 *   – Sets transform directly on the DOM node (no React state, no re-render)
 *   – Cleans up RAF on unmount via useEffect return
 *
 * Usage:
 *   <Tilt3D maxDeg={8}>
 *     <YourCard />
 *   </Tilt3D>
 */

import { useRef, useCallback, useEffect } from "react"
import { cn }                              from "@/lib/utils"

interface Tilt3DProps {
  children:   React.ReactNode
  className?: string
  /** Maximum tilt in degrees (default: 8) */
  maxDeg?:    number
}

export function Tilt3D({ children, className, maxDeg = 8 }: Tilt3DProps) {
  const ref     = useRef<HTMLDivElement>(null)
  const rafId   = useRef<number>(0)

  /* Desired tilt angle (set by mouse position) */
  const target  = useRef({ rx: 0, ry: 0 })
  /* Current animated tilt angle */
  const current = useRef({ rx: 0, ry: 0 })
  /* Whether the animation loop is running */
  const active  = useRef(false)

  /* ── Animation loop — runs only while mouse is over the card ── */
  const tick = useCallback(() => {
    const el = ref.current
    if (!el) return

    /* Lerp toward target */
    const lf = 0.12
    current.current.rx += (target.current.rx - current.current.rx) * lf
    current.current.ry += (target.current.ry - current.current.ry) * lf

    const rx = current.current.rx.toFixed(3)
    const ry = current.current.ry.toFixed(3)
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.018,1.018,1.018)`

    /* Continue until close enough to target */
    const err = Math.abs(target.current.rx - current.current.rx)
              + Math.abs(target.current.ry - current.current.ry)

    if (err > 0.008) {
      rafId.current = requestAnimationFrame(tick)
    } else {
      /* Snap to exact target and stop */
      el.style.transform = `perspective(900px) rotateX(${target.current.rx}deg) rotateY(${target.current.ry}deg) scale3d(1.018,1.018,1.018)`
      active.current = false
    }
  }, [])

  /* ── Return-to-flat loop — runs after mouse leaves ── */
  const restoreTick = useCallback(() => {
    const el = ref.current
    if (!el) return

    const lf = 0.10
    current.current.rx += (0 - current.current.rx) * lf
    current.current.ry += (0 - current.current.ry) * lf

    const dist = Math.abs(current.current.rx) + Math.abs(current.current.ry)

    if (dist > 0.01) {
      const rx = current.current.rx.toFixed(3)
      const ry = current.current.ry.toFixed(3)
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1,1,1)`
      rafId.current = requestAnimationFrame(restoreTick)
    } else {
      el.style.transform = ""
      active.current = false
    }
  }, [])

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left)  / rect.width  - 0.5   // –0.5 → +0.5
    const y = (e.clientY - rect.top)   / rect.height - 0.5

    target.current.rx = -y * maxDeg
    target.current.ry =  x * maxDeg

    /* Start loop if not already running */
    if (!active.current) {
      active.current = true
      rafId.current = requestAnimationFrame(tick)
    }
  }, [maxDeg, tick])

  const handleLeave = useCallback(() => {
    target.current.rx = 0
    target.current.ry = 0
    cancelAnimationFrame(rafId.current)
    active.current = true  // keep "active" so restoreTick runs
    rafId.current = requestAnimationFrame(restoreTick)
  }, [restoreTick])

  /* Cleanup on unmount */
  useEffect(() => () => cancelAnimationFrame(rafId.current), [])

  return (
    <div
      ref={ref}
      className={cn("will-change-transform", className)}
      style={{ transformStyle: "preserve-3d" }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </div>
  )
}
