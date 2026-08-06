"use client"

/**
 * src/hooks/admin/useAdminResource.ts
 *
 * The ONE generic CRUD hook every admin module (Presets, Bundles, Media
 * Library, and every future module) should use instead of hand-rolling
 * fetch/loading/error state per page.
 *
 * Talks to a REST-ish base path following the project's existing envelope
 * convention: `{ success: boolean, data?: T | T[], error?: string }`
 * (see src/app/api/admin/presets/**).
 *
 *   GET    {base}            → list
 *   POST   {base}             → create
 *   PUT    {base}/{id}        → update (full)
 *   PATCH  {base}/{id}        → partial update / toggle
 *   DELETE {base}/{id}        → delete
 *   POST   {base}/{id}/duplicate → duplicate (route must implement this)
 *
 * Publish/archive are just PATCH with a status field — see `publish()` /
 * `archive()` below, both configurable via `statusField`.
 *
 * Every mutation is OPTIMISTIC: local state updates immediately, and rolls
 * back if the server call fails.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
  meta?: { page?: number; pageSize?: number; total?: number }
}

export interface UseAdminResourceOptions<T> {
  /** Base API path, e.g. "/api/admin/courses". No trailing slash. */
  basePath: string
  /** Query string appended to the list GET, e.g. "?q=foo&page=2" (no leading "?" needed — pass with or without). */
  query?: string
  /** Field used by publish()/archive() — defaults to "is_published". */
  statusField?: keyof T & string
  /** Fetch the list automatically on mount / when `query` changes. Default true. */
  autoLoad?: boolean
  /** Row id accessor — defaults to `(row) => (row as any).id`. */
  getId?: (row: T) => string
}

export interface UseAdminResourceResult<T> {
  items:      T[]
  /** Total row count on the server for the current query (before pagination). */
  total:      number
  loading:    boolean
  error:      string | null
  refresh:    () => Promise<void>
  create:     (payload: Partial<T>) => Promise<T | null>
  update:     (id: string, payload: Partial<T>) => Promise<T | null>
  patch:      (id: string, payload: Partial<T>) => Promise<T | null>
  remove:     (id: string) => Promise<boolean>
  duplicate:  (id: string) => Promise<T | null>
  publish:    (id: string) => Promise<T | null>
  unpublish:  (id: string) => Promise<T | null>
  archive:    (id: string) => Promise<T | null>
  /** Per-row in-flight ids, so a table can show a spinner on the exact row being mutated. */
  pendingIds: Set<string>
}

export function useAdminResource<T extends Record<string, unknown>>(
  options: UseAdminResourceOptions<T>
): UseAdminResourceResult<T> {
  const { basePath, query = "", statusField = "is_published" as keyof T & string, autoLoad = true } = options
  const getId = useMemo(
    () => options.getId ?? ((row: T) => String((row as { id?: unknown }).id ?? "")),
    [options.getId]
  )

  const [items, setItems]     = useState<T[]>([])
  const [loading, setLoading] = useState(autoLoad)
  const [error, setError]     = useState<string | null>(null)
  const [total, setTotal]     = useState(0)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const markPending = useCallback((id: string, on: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev)
      if (on) next.add(id); else next.delete(id)
      return next
    })
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs  = query ? (query.startsWith("?") ? query : `?${query}`) : ""
      const res = await fetch(`${basePath}${qs}`, { cache: "no-store" })
      const json = (await res.json()) as ApiEnvelope<T[]>
      if (!mounted.current) return
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to load.")
        setItems([])
        setTotal(0)
      } else {
        setItems(json.data ?? [])
        setTotal(json.meta?.total ?? (json.data ?? []).length)
      }
    } catch (e) {
      if (!mounted.current) return
      setError(e instanceof Error ? e.message : "Network error.")
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [basePath, query])

  useEffect(() => {
    if (!autoLoad) return
    const t = setTimeout(() => { void refresh() }, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath, query, autoLoad])

  const create = useCallback(async (payload: Partial<T>): Promise<T | null> => {
    setError(null)
    try {
      const res  = await fetch(basePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as ApiEnvelope<T>
      if (!res.ok || !json.success || !json.data) {
        setError(json.error ?? "Failed to create.")
        return null
      }
      setItems((prev) => [json.data as T, ...prev])
      return json.data
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.")
      return null
    }
  }, [basePath])

  /** Shared mutate-by-id implementation for update/patch/publish/archive. */
  const mutateById = useCallback(async (
    id: string,
    method: "PUT" | "PATCH",
    payload: Partial<T>,
  ): Promise<T | null> => {
    setError(null)
    markPending(id, true)

    const prevItems = items
    // Optimistic merge
    setItems((prev) => prev.map((row) => (getId(row) === id ? { ...row, ...payload } : row)))

    try {
      const res  = await fetch(`${basePath}/${id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as ApiEnvelope<T>
      if (!res.ok || !json.success) {
        setItems(prevItems) // rollback
        setError(json.error ?? "Update failed.")
        return null
      }
      if (json.data) {
        setItems((prev) => prev.map((row) => (getId(row) === id ? (json.data as T) : row)))
        return json.data
      }
      return null
    } catch (e) {
      setItems(prevItems) // rollback
      setError(e instanceof Error ? e.message : "Network error.")
      return null
    } finally {
      markPending(id, false)
    }
  }, [basePath, items, getId, markPending])

  const update = useCallback((id: string, payload: Partial<T>) => mutateById(id, "PUT", payload), [mutateById])
  const patch  = useCallback((id: string, payload: Partial<T>) => mutateById(id, "PATCH", payload), [mutateById])

  const publish   = useCallback((id: string) => patch(id, { [statusField]: true } as Partial<T>), [patch, statusField])
  const unpublish = useCallback((id: string) => patch(id, { [statusField]: false } as Partial<T>), [patch, statusField])
  const archive    = useCallback((id: string) => patch(id, { is_archived: true } as unknown as Partial<T>), [patch])

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    markPending(id, true)
    const prevItems = items
    setItems((prev) => prev.filter((row) => getId(row) !== id)) // optimistic

    try {
      const res  = await fetch(`${basePath}/${id}`, { method: "DELETE" })
      const json = (await res.json()) as ApiEnvelope<null>
      if (!res.ok || !json.success) {
        setItems(prevItems) // rollback
        setError(json.error ?? "Delete failed.")
        return false
      }
      return true
    } catch (e) {
      setItems(prevItems) // rollback
      setError(e instanceof Error ? e.message : "Network error.")
      return false
    } finally {
      markPending(id, false)
    }
  }, [basePath, items, getId, markPending])

  const duplicate = useCallback(async (id: string): Promise<T | null> => {
    setError(null)
    markPending(id, true)
    try {
      const res  = await fetch(`${basePath}/${id}/duplicate`, { method: "POST" })
      const json = (await res.json()) as ApiEnvelope<T>
      if (!res.ok || !json.success || !json.data) {
        setError(json.error ?? "Duplicate failed.")
        return null
      }
      setItems((prev) => [json.data as T, ...prev])
      return json.data
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.")
      return null
    } finally {
      markPending(id, false)
    }
  }, [basePath, markPending])

  return {
    items, total, loading, error, refresh,
    create, update, patch, remove, duplicate,
    publish, unpublish, archive,
    pendingIds,
  }
}
