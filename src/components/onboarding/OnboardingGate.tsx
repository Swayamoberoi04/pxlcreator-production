"use client"

/**
 * OnboardingGate.tsx — v2
 *
 * Reliable post-login onboarding trigger.
 *
 * Trigger priority:
 *  1. localStorage check (instant — works even if Supabase is down)
 *     key: `pxl_ob_${uid}` = "1" means completed
 *  2. If not found in localStorage → open modal IMMEDIATELY
 *  3. Background API verify for cross-device sync
 *     (if user completed on another device, API closes the modal)
 *  4. When Zustand `isComplete` becomes true → write localStorage
 *
 * This is FAIL-OPEN: new users always see the modal because they
 * have no localStorage entry. If Supabase is down, that's fine —
 * we still show the onboarding correctly.
 *
 * The old approach (fail-closed: if API returns !ok → skip modal)
 * was the root cause of the trigger not firing.
 */

import { useEffect, useRef } from "react"
import { useAuth }           from "@/contexts/AuthContext"
import { useOnboardingStore } from "@/store/onboarding"

const LS_KEY = (uid: string) => `pxl_ob_${uid}`

export function OnboardingGate() {
  const { user, loading } = useAuth()
  const { isComplete, isOpen, open, close } = useOnboardingStore()

  /* Prevent double-firing within the same session */
  const checkedRef = useRef<string | null>(null)

  /* ── Persist completion to localStorage when store marks done ── */
  useEffect(() => {
    if (isComplete && user) {
      try {
        localStorage.setItem(LS_KEY(user.uid), "1")
      } catch { /* private browsing — ignore */ }
    }
  }, [isComplete, user])

  /* ── Main trigger effect ───────────────────────────────────── */
  useEffect(() => {
    if (loading)  return
    if (!user)    { checkedRef.current = null; return }
    if (isOpen)   return  // already showing — don't re-trigger
    if (isComplete) { checkedRef.current = user.uid; return }
    if (checkedRef.current === user.uid) return  // already processed this session

    checkedRef.current = user.uid

    /* ── Step 1: localStorage (instant, no network) ── */
    let locallyDone = false
    try {
      locallyDone = localStorage.getItem(LS_KEY(user.uid)) === "1"
    } catch { /* private browsing */ }

    if (locallyDone) {
      /* Already done — no need to show modal.
         We'll verify in background but don't block on it. */
      verifyInBackground(user.uid, user.getIdToken.bind(user), () => {
        /* If server says NOT done (localStorage stale e.g. db reset), reopen */
        checkedRef.current = null
        try { localStorage.removeItem(LS_KEY(user.uid)) } catch { /* ignore */ }
        open()
      })
      return
    }

    /* ── Step 2: Not in localStorage → show modal immediately ── */
    open()

    /* ── Step 3: Background API check for cross-device sync ──── */
    /* If user completed onboarding on another device, close the modal */
    verifyInBackground(user.uid, user.getIdToken.bind(user), null, () => {
      /* API says completed → write localStorage + close */
      try { localStorage.setItem(LS_KEY(user.uid), "1") } catch { /* ignore */ }
      close()
    })
  }, [user, loading, isOpen, isComplete, open, close])

  return null
}

/* ── Helpers ─────────────────────────────────────────────────── */

/**
 * verifyInBackground — calls /api/onboarding/status
 * @param uid             Firebase UID (for logging only)
 * @param getToken        Bound `user.getIdToken` function
 * @param onNotCompleted  Called if server says NOT completed (and we expected it was)
 * @param onCompleted     Called if server says completed (and we expected it wasn't)
 */
async function verifyInBackground(
  uid:            string,
  getToken:       () => Promise<string>,
  onNotCompleted: (() => void) | null,
  onCompleted?:   () => void,
) {
  try {
    const token = await getToken()
    const res   = await fetch("/api/onboarding/status", {
      headers: { Authorization: `Bearer ${token}` },
      /* Short timeout — this is non-critical background work */
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) {
      /* API error (e.g. table not yet migrated) — do nothing.
         The modal is already open for new users, which is correct. */
      return
    }

    const data = await res.json() as { completed: boolean }

    if (data.completed && onCompleted) onCompleted()
    if (!data.completed && onNotCompleted) onNotCompleted()
  } catch {
    /* Network error or timeout — silently ignore.
       The modal state is already correct (open for new users). */
  }
}
