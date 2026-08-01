"use client"

/**
 * AdminScrollArea.tsx
 *
 * The single scroll container for the admin shell (the sidebar stays fixed —
 * a scrollable main pane next to a fixed sidebar is the standard dashboard
 * pattern used by Linear/Notion/GitHub).
 *
 * Why this exists:
 *   The admin shell is a `fixed inset-0` overlay, so its content scrolls in
 *   THIS container rather than the window. The browser's native scroll
 *   restoration only restores window scroll — it can't restore a nested
 *   container. So we restore it ourselves, keyed to the URL:
 *
 *     • saved in sessionStorage → survives Back navigation AND a full refresh
 *     • a ResizeObserver re-applies the saved offset as async list content
 *       loads in, so returning to a long list lands exactly where you left it
 *       instead of snapping to the top once (before the rows have rendered)
 *
 * This is the correct implementation for a scroll container — there is no
 * router/History API that restores nested-container scroll for you.
 */

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

const KEY = (path: string) => `pxl_admin_scroll:${path}`

export function AdminScrollArea({ children }: { children: React.ReactNode }) {
  const ref      = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const key = KEY(pathname)

    /* ── Restore ─────────────────────────────────────────────── */
    let target = 0
    try { target = parseInt(sessionStorage.getItem(key) ?? "0", 10) || 0 } catch { /* private mode */ }

    let restored = target <= 0
    const applyTarget = () => {
      if (restored) return
      /* Only apply once the content is tall enough to actually reach `target`
         — otherwise the browser clamps us to the current (short) max. */
      if (el.scrollHeight - el.clientHeight >= target) {
        el.scrollTop = target
        restored = true
      }
    }
    applyTarget()

    /* Async list content grows the height after fetch → re-apply. */
    const ro = new ResizeObserver(applyTarget)
    ro.observe(el)
    /* Stop trying after 1.5s so we never fight a user who starts scrolling. */
    const cap = window.setTimeout(() => { restored = true; ro.disconnect() }, 1500)

    /* ── Save (rAF-throttled) ────────────────────────────────── */
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        try { sessionStorage.setItem(key, String(el.scrollTop)) } catch { /* ignore */ }
      })
    }
    el.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      /* Final save on leave so the position is fresh when we come back. */
      try { sessionStorage.setItem(key, String(el.scrollTop)) } catch { /* ignore */ }
      el.removeEventListener("scroll", onScroll)
      ro.disconnect()
      clearTimeout(cap)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [pathname])

  return (
    <div
      ref={ref}
      data-admin-scroll
      className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto overscroll-contain"
    >
      {children}
    </div>
  )
}
