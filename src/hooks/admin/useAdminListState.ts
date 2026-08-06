"use client"

/**
 * src/hooks/admin/useAdminListState.ts
 *
 * Remembers search / filters / page / sort per admin list page, keyed by
 * pathname — same pattern and storage (sessionStorage) as the existing
 * per-path scroll restoration in AdminScrollArea.tsx, so returning to a
 * list (via Back, or a full refresh in the same tab) restores exactly
 * where the admin left off instead of resetting to page 1 / empty search.
 *
 * Usage:
 *   const list = useAdminListState({ page: 1, q: "", sort: "created_at:desc", filters: {} })
 *   <SearchBar value={list.state.q} onChange={(q) => list.set({ q, page: 1 })} />
 */

import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

const KEY = (path: string) => `pxl_admin_list_state:${path}`

export function useAdminListState<S extends Record<string, unknown>>(defaults: S) {
  const pathname = usePathname()
  const hydrated = useRef(false)

  const [state, setState] = useState<S>(defaults)

  // Hydrate from sessionStorage once per path (deferred so the read/setState
  // happens outside the effect's synchronous pass, matching the pattern
  // used by AdminScrollArea's restoration effect).
  useEffect(() => {
    hydrated.current = false
    const t = setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(KEY(pathname))
        setState(raw ? { ...defaults, ...(JSON.parse(raw) as Partial<S>) } : defaults)
      } catch {
        setState(defaults)
      } finally {
        hydrated.current = true
      }
    }, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Persist on every change (skip the very first hydration write).
  useEffect(() => {
    if (!hydrated.current) return
    try { sessionStorage.setItem(KEY(pathname), JSON.stringify(state)) } catch { /* ignore */ }
  }, [state, pathname])

  function set(partial: Partial<S>) {
    setState((prev) => ({ ...prev, ...partial }))
  }

  function reset() {
    setState(defaults)
    try { sessionStorage.removeItem(KEY(pathname)) } catch { /* ignore */ }
  }

  return { state, set, reset }
}
