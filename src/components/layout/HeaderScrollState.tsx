"use client"

/**
 * HeaderScrollState.tsx
 *
 * A zero-render client component that watches window.scrollY and
 * toggles a `data-scrolled` attribute on the <header> element.
 *
 * CSS in globals.css then uses:
 *   header[data-scrolled="true"] { stronger glass backdrop, gold border glow }
 *
 * This keeps SiteHeader as a Server Component while giving it
 * scroll-reactive visual behaviour via pure DOM manipulation — no
 * React state, no re-renders, no layout thrash.
 */

import { useEffect } from "react"

export function HeaderScrollState() {
  useEffect(() => {
    const header = document.querySelector("header") as HTMLElement | null
    if (!header) return

    let ticking = false

    const update = () => {
      header.dataset.scrolled = window.scrollY > 28 ? "true" : "false"
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update)
        ticking = true
      }
    }

    /* Set initial state */
    update()

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return null
}
