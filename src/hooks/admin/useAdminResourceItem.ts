"use client"

/**
 * src/hooks/admin/useAdminResourceItem.ts
 *
 * Companion to useAdminResource for a SINGLE record's edit page (Courses,
 * Blog, and every future detail/edit view). Handles: load-by-id (or blank
 * draft when id === "new"), local dirty-tracked editing, manual save
 * (create or update), debounced autosave once a record exists, delete,
 * duplicate, and publish/unpublish.
 *
 * Usage:
 *   const item = useAdminResourceItem<Course>({ basePath: "/api/admin/courses", id })
 *   <TextInput value={item.draft?.title ?? ""} onChange={(e) => item.setField("title", e.target.value)} />
 */

import { useCallback, useEffect, useRef, useState } from "react"

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

export interface UseAdminResourceItemOptions<T> {
  basePath: string   // e.g. "/api/admin/courses"
  id: string         // "new" for a fresh, unsaved record
  emptyDraft: T       // shape used to seed a new record
  statusField?: keyof T & string // defaults to "is_published"
  /** Autosave debounce in ms once the record exists. 0 disables autosave. */
  autosaveMs?: number
}

export interface UseAdminResourceItemResult<T> {
  draft: T | null
  loading: boolean
  saving: boolean
  error: string | null
  dirty: boolean
  isNew: boolean
  savedAt: Date | null
  setField: <K extends keyof T>(key: K, value: T[K]) => void
  setDraft: (next: T) => void
  save: () => Promise<T | null>
  remove: () => Promise<boolean>
  duplicate: () => Promise<T | null>
  publish: () => Promise<void>
  unpublish: () => Promise<void>
}

export function useAdminResourceItem<T extends Record<string, unknown>>(
  options: UseAdminResourceItemOptions<T>
): UseAdminResourceItemResult<T> {
  const { basePath, id, emptyDraft, statusField = "is_published" as keyof T & string, autosaveMs = 1500 } = options
  const isNew = id === "new"

  const [draft, setDraftState] = useState<T | null>(isNew ? emptyDraft : null)
  const [loading, setLoading]  = useState(!isNew)
  const [saving, setSaving]    = useState(false)
  const [error, setError]      = useState<string | null>(null)
  const [dirty, setDirty]      = useState(false)
  const [savedAt, setSavedAt]  = useState<Date | null>(null)

  const lastSaved = useRef<T | null>(null)

  // Load
  useEffect(() => {
    const t = setTimeout(() => {
      if (isNew) {
        setDraftState(emptyDraft)
        lastSaved.current = null
        setDirty(false)
        return
      }
      setLoading(true)
      fetch(`${basePath}/${id}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((json: ApiEnvelope<T>) => {
          if (json.success && json.data) {
            setDraftState(json.data)
            lastSaved.current = json.data
          } else {
            setError(json.error ?? "Failed to load.")
          }
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Network error."))
        .finally(() => setLoading(false))
    }, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath, id, isNew])

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setDraftState((prev) => (prev ? { ...prev, [key]: value } : prev))
    setDirty(true)
  }, [])

  const setDraft = useCallback((next: T) => {
    setDraftState(next)
    setDirty(true)
  }, [])

  const save = useCallback(async (): Promise<T | null> => {
    if (!draft) return null
    setSaving(true)
    setError(null)
    try {
      const url    = isNew ? basePath : `${basePath}/${id}`
      const method = isNew ? "POST" : "PUT"
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      const json = (await res.json()) as ApiEnvelope<T>
      if (!res.ok || !json.success || !json.data) {
        setError(json.error ?? "Save failed.")
        return null
      }
      setDraftState(json.data)
      lastSaved.current = json.data
      setDirty(false)
      setSavedAt(new Date())
      return json.data
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.")
      return null
    } finally {
      setSaving(false)
    }
  }, [draft, basePath, id, isNew])

  // Debounced autosave — only once the record exists (not on "new").
  useEffect(() => {
    if (isNew || !dirty || autosaveMs <= 0) return
    const t = setTimeout(() => { void save() }, autosaveMs)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, isNew, dirty, autosaveMs])

  const remove = useCallback(async (): Promise<boolean> => {
    if (isNew) return true
    setSaving(true)
    try {
      const res  = await fetch(`${basePath}/${id}`, { method: "DELETE" })
      const json = (await res.json()) as ApiEnvelope<null>
      if (!res.ok || !json.success) {
        setError(json.error ?? "Delete failed.")
        return false
      }
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.")
      return false
    } finally {
      setSaving(false)
    }
  }, [basePath, id, isNew])

  const duplicate = useCallback(async (): Promise<T | null> => {
    if (isNew) return null
    setSaving(true)
    try {
      const res  = await fetch(`${basePath}/${id}/duplicate`, { method: "POST" })
      const json = (await res.json()) as ApiEnvelope<T>
      if (!res.ok || !json.success || !json.data) {
        setError(json.error ?? "Duplicate failed.")
        return null
      }
      return json.data
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.")
      return null
    } finally {
      setSaving(false)
    }
  }, [basePath, id, isNew])

  const publish = useCallback(async () => {
    setField(statusField, true as T[typeof statusField])
    if (!isNew) await save()
  }, [setField, statusField, isNew, save])

  const unpublish = useCallback(async () => {
    setField(statusField, false as T[typeof statusField])
    if (!isNew) await save()
  }, [setField, statusField, isNew, save])

  return {
    draft, loading, saving, error, dirty, isNew, savedAt,
    setField, setDraft, save, remove, duplicate, publish, unpublish,
  }
}
