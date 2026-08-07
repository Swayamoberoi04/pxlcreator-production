"use client"

/**
 * src/components/admin/ui/VersionHistoryPanel.tsx
 *
 * Generic version-history list + restore, paired with any module whose
 * item routes were built with `versioning: true` (see crud-factory.ts).
 * Talks to the standard {basePath}/{id}/versions (+ /restore) endpoints —
 * a module gets working history/restore UI for free by dropping this in.
 */

import { useEffect, useState } from "react"
import { ConfirmDialog } from "./ConfirmDialog"

interface Version {
  id: string
  snapshot: Record<string, unknown>
  created_by: string | null
  created_at: string
}

interface VersionHistoryPanelProps {
  /** e.g. "/api/admin/homepage" */
  basePath: string
  resourceId: string
  /** Called after a successful restore so the caller can refresh its local state. */
  onRestored?: () => void
  /** Field(s) from the snapshot to preview in the list, e.g. ["title", "subtitle"]. */
  previewFields?: string[]
}

export function VersionHistoryPanel({ basePath, resourceId, onRestored, previewFields = ["title"] }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingRestore, setPendingRestore] = useState<Version | null>(null)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(() => {
      setLoading(true)
      fetch(`${basePath}/${resourceId}/versions`, { cache: "no-store" })
        .then((r) => r.json())
        .then((json) => { if (!cancelled) setVersions(json.success ? json.data : []) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 0)
    return () => { cancelled = true; clearTimeout(t) }
  }, [basePath, resourceId])

  async function handleRestore() {
    if (!pendingRestore) return
    setRestoring(true)
    try {
      const res = await fetch(`${basePath}/${resourceId}/versions/${pendingRestore.id}/restore`, { method: "POST" })
      if (res.ok) onRestored?.()
    } finally {
      setRestoring(false)
      setPendingRestore(null)
    }
  }

  if (loading) {
    return <p className="text-[0.75rem] text-white/35">Loading history…</p>
  }

  if (versions.length === 0) {
    return <p className="text-[0.75rem] text-white/35">No previous versions yet — history starts after the first edit.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {versions.map((v) => (
        <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <div className="min-w-0 flex flex-col gap-0.5">
            <p className="text-[0.75rem] text-white/70 truncate">
              {previewFields.map((f) => String(v.snapshot[f] ?? "")).filter(Boolean).join(" — ") || "Untitled snapshot"}
            </p>
            <p className="text-[0.6875rem] text-white/35">
              {new Date(v.created_at).toLocaleString()} {v.created_by ? `· ${v.created_by}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPendingRestore(v)}
            className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1 text-[0.7rem] text-white/60 hover:text-gold hover:border-gold/30 transition-colors"
          >
            Restore
          </button>
        </div>
      ))}

      <ConfirmDialog
        open={!!pendingRestore}
        onClose={() => setPendingRestore(null)}
        onConfirm={handleRestore}
        title="Restore this version?"
        description="The current state is saved as a new version first, so this is never a one-way trip."
        confirmLabel={restoring ? "Restoring…" : "Restore"}
        tone="default"
      />
    </div>
  )
}
