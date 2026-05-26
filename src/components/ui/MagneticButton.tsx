"use client"

/**
 * MagneticButton.tsx
 *
 * Wraps any element with a magnetic cursor effect — the element
 * pulls slightly toward the cursor while it's within the magnetic
 * zone, then snaps back with a spring on leave.
 *
 * Implementation:
 *   • onMouseMove: compute offset from element centre, multiply by strength
 *   • onMouseLeave: reset to origin with CSS transition
 *   • Pure DOM manipulation — zero React state, zero re-renders
 *   • The inner content is wrapped in a second div that moves MORE
 *     than the outer (parallax layers inside the button)
 *
 * Usage:
 *   <MagneticButton>
 *     <Link href="/store" className="rounded-full bg-gold ...">Shop Now</Link>
 *   </MagneticButton>
 */

import { useRef, useCallback, useEffect, ReactNode } from "react"

interface MagneticButtonProps {
  children:   ReactNode
  className?: string
  /** How strongly the element follows the cursor. 0.25 = 25% of offset. */
  strength?:  number
  /** How strongly the INNER element follows (creates parallax). */
  innerStrength?: number
}

export function MagneticButton({
  children,
  className,
  strength      = 0.28,
  innerStrength = 0.50,
}: MagneticButtonProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const rafId    = useRef<number>(0)

  /* Apply smooth magnetic pull */
  const handleMove = useCallback(
    (e: MouseEvent) => {
      const outer = outerRef.current
      const inner = innerRef.current
      if (!outer || !inner) return

      cancelAnimationFrame(rafId.current)
      rafId.current = requestAnimationFrame(() => {
        const rect = outer.getBoundingClientRect()
        const cx   = rect.left + rect.width  / 2
        const cy   = rect.top  + rect.height / 2
        const dx   = (e.clientX - cx) * strength
        const dy   = (e.clientY - cy) * strength

        outer.style.transform = `translate(${dx}px, ${dy}px)`
        inner.style.transform = `translate(${dx * innerStrength}px, ${dy * innerStrength}px)`
      })
    },
    [strength, innerStrength]
  )

  const handleLeave = useCallback(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    cancelAnimationFrame(rafId.current)
    outer.style.transform = "translate(0px, 0px)"
    inner.style.transform = "translate(0px, 0px)"
  }, [])

  useEffect(() => {
    const el = outerRef.current
    if (!el) return

    const TRANSITION = "transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)"
    el.style.transition = TRANSITION
    if (innerRef.current) innerRef.current.style.transition = TRANSITION

    el.addEventListener("mousemove", handleMove, { passive: true })
    el.addEventListener("mouseleave", handleLeave)
    return () => {
      el.removeEventListener("mousemove", handleMove)
      el.removeEventListener("mouseleave", handleLeave)
      cancelAnimationFrame(rafId.current)
    }
  }, [handleMove, handleLeave])

  return (
    <div ref={outerRef} className={className} style={{ willChange: "transform", display: "inline-flex" }}>
      <div ref={innerRef} style={{ willChange: "transform" }}>
        {children}
      </div>
    </div>
  )
}
