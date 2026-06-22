"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

/**
 * Thin gold progress line that fires on every App Router navigation.
 * Mounts once in layout.tsx — no setup needed per-page.
 *
 * Fake-progress approach: jump to 15%, ease to 85% while the new
 * page loads, complete to 100% on pathname change, then fade out.
 */
export function NavProgressBar() {
  const pathname    = usePathname()
  const [width, setWidth]     = useState(0)
  const [opacity, setOpacity] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clear = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  useEffect(() => {
    clear()

    // Deferred to avoid synchronous setState inside an effect body
    const t0 = setTimeout(() => { setOpacity(1); setWidth(10) }, 0)
    timers.current.push(t0)

    const t1 = setTimeout(() => setWidth(50),  120)
    const t2 = setTimeout(() => setWidth(82),  420)
    const t3 = setTimeout(() => setWidth(100), 640)
    const t4 = setTimeout(() => setOpacity(0), 820)
    const t5 = setTimeout(() => setWidth(0),   1060)

    timers.current = [t1, t2, t3, t4, t5]
    return clear
  }, [pathname])

  return (
    <div
      aria-hidden="true"
      style={{
        position:   "fixed",
        top:        0,
        left:       0,
        height:     "2px",
        width:      `${width}%`,
        opacity,
        background: "#FFD60A",
        boxShadow:  "0 0 10px rgba(255,214,10,0.75), 0 0 24px rgba(255,214,10,0.35)",
        transition: "width 0.28s ease, opacity 0.22s ease",
        zIndex:     9999,
        pointerEvents: "none",
      }}
    />
  )
}
