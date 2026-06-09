"use client"

/**
 * src/components/ui/PopupManager.tsx
 *
 * Orchestrates WHEN a promotional popup appears — all business logic here,
 * no UI. The PromoPopup component handles only rendering.
 *
 * Trigger logic (first-to-fire wins, other is cleared):
 *   A) Timer  — fires after 30–45 s (randomised to avoid all-same-page behaviour)
 *   B) Scroll — fires when user reaches 40% of the page height
 *
 * Gates (all must pass before any popup shows):
 *   1. Session gate  — sessionStorage('pxl_popup_session') — one per browser session
 *   2. Cooldown gate — localStorage('pxl_popup_last_ts')   — 24 h between popups
 *   3. Route gate    — never on checkout / auth / dashboard / admin flows
 *
 * Rotation:
 *   localStorage('pxl_popup_idx') cycles 0 → 1 → 2 → 3 → 0 → …
 *   so each qualifying visit sees the next variant.
 *
 * Performance:
 *   This file is dynamically imported in layout.tsx with { ssr: false }
 *   → zero SSR cost, zero impact on Lighthouse FCP/LCP/TBT.
 *   The popup itself (PromoPopup) is also only loaded when the trigger fires.
 *
 * Accessibility:
 *   PromoPopup handles focus-trap and Escape-key — this manager only shows/hides it.
 */

import { useEffect, useRef, useState } from "react"
import { usePathname }                 from "next/navigation"
import { PromoPopup }                  from "@/components/ui/PromoPopup"
import { POPUP_CONFIGS }               from "@/data/popups"
import type { PopupConfig }            from "@/types/popup"

/* ── Storage keys ─────────────────────────────────────────── */
const SK_SESSION   = "pxl_popup_session"   // sessionStorage: fired this session
const LK_LAST_TS   = "pxl_popup_last_ts"   // localStorage: last-shown Unix ms
const LK_IDX       = "pxl_popup_idx"       // localStorage: rotation index

/* ── Timing constants ─────────────────────────────────────── */
const MIN_DELAY_MS     = 30_000              // 30 s floor
const EXTRA_RANGE_MS   = 15_000             // +0–15 s jitter → 30–45 s total
const COOLDOWN_MS      = 24 * 60 * 60_000   // 24 h
const SCROLL_THRESHOLD = 0.40               // 40% page depth

/* ── Route exclusions ────────────────────────────────────── */
const EXCLUDED_PREFIXES = [
  "/checkout",
  "/login",
  "/signup",
  "/forgot-password",
  "/payment",
  "/dashboard",
  "/admin",
  "/account",
  "/onboarding",
  "/premium/success",
  "/checkout/success",
]

/* ─────────────────────────────────────────────────────────────
   Safe storage helpers (localStorage / sessionStorage may be
   blocked in private-browsing or cross-origin iframes — never
   crash the page over it).
───────────────────────────────────────────────────────────── */
function ssGet(key: string): string | null {
  try { return sessionStorage.getItem(key) } catch { return null }
}
function ssSet(key: string, value: string) {
  try { sessionStorage.setItem(key, value) } catch {}
}
function lsGet(key: string): string | null {
  try { return localStorage.getItem(key) }  catch { return null }
}
function lsSet(key: string, value: string) {
  try { localStorage.setItem(key, value) }  catch {}
}

/* ─────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────── */
export default function PopupManager() {
  const pathname                = usePathname()
  const [config, setConfig]     = useState<PopupConfig | null>(null)
  const firedRef                = useRef(false)   // prevents double-fire

  useEffect(() => {
    /* Reset fire-guard on every pathname change */
    firedRef.current = false

    /* 1. Route gate */
    if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return

    /* 2. Session gate */
    if (ssGet(SK_SESSION)) return

    /* 3. 24-hour cooldown */
    const lastTs = parseInt(lsGet(LK_LAST_TS) ?? "0", 10)
    if (!isNaN(lastTs) && Date.now() - lastTs < COOLDOWN_MS) return

    /* 4. Pick rotation index */
    let idx = parseInt(lsGet(LK_IDX) ?? "0", 10)
    if (isNaN(idx) || idx < 0 || idx >= POPUP_CONFIGS.length) idx = 0
    const chosen = POPUP_CONFIGS[idx]

    /* ── Fire: marks gates, sets state ── */
    function fire() {
      if (firedRef.current) return
      firedRef.current = true
      ssSet(SK_SESSION, "1")
      lsSet(LK_LAST_TS, String(Date.now()))
      lsSet(LK_IDX,     String((idx + 1) % POPUP_CONFIGS.length))
      setConfig(chosen)
    }

    /* ── Trigger A: timer ── */
    const delay   = MIN_DELAY_MS + Math.random() * EXTRA_RANGE_MS
    const timerId = window.setTimeout(fire, delay)

    /* ── Trigger B: scroll depth ── */
    function onScroll() {
      const scrolled = window.scrollY /
        Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      if (scrolled >= SCROLL_THRESHOLD) fire()
    }
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      window.clearTimeout(timerId)
      window.removeEventListener("scroll", onScroll)
    }
  }, [pathname])

  if (!config) return null

  return (
    <PromoPopup
      config={config}
      onClose={() => setConfig(null)}
    />
  )
}
