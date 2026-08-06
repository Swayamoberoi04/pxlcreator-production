"use client"

/**
 * src/components/admin/AdminEditShell.tsx
 *
 * Generic edit-page shell. A module passes its title/status/handlers and
 * module-specific form fields as children — this renders breadcrumbs, the
 * save/publish/duplicate/delete header, a save-status indicator, and the
 * loading skeleton. Pairs with useAdminResourceItem.
 *
 * Usage:
 *   const item = useAdminResourceItem<Course>({ basePath: "/api/admin/courses", id, emptyDraft })
 *   <AdminEditShell title={item.draft?.title || "New Course"} ...>
 *     <FormSection title="Basic Info">...</FormSection>
 *   </AdminEditShell>
 */

import { useState } from "react"
import { Breadcrumbs, type Crumb } from "@/components/admin/ui/Breadcrumbs"
import { StatusBadge } from "@/components/admin/ui/StatusBadge"
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog"
import { FormSkeleton } from "@/components/admin/ui/Skeleton"

interface AdminEditShellProps {
  title: string
  breadcrumbs: Crumb[]
  loading?: boolean
  saving?: boolean
  dirty?: boolean
  savedAt?: Date | null
  error?: string | null
  isNew?: boolean
  isPublished?: boolean
  onSave: () => void | Promise<void>
  onPublish?: () => void | Promise<void>
  onUnpublish?: () => void | Promise<void>
  onDuplicate?: () => void | Promise<void>
  onDelete?: () => void | Promise<void>
  children: React.ReactNode
}

export function AdminEditShell({
  title, breadcrumbs, loading, saving, dirty, savedAt, error, isNew, isPublished,
  onSave, onPublish, onUnpublish, onDuplicate, onDelete, children,
}: AdminEditShellProps) {
  const [pendingDelete, setPendingDelete] = useState(false)

  return (
    <div className="flex flex-col gap-6 px-6 sm:px-8 py-6 sm:py-8 max-w-[860px] mx-auto w-full pb-24">
      <Breadcrumbs items={breadcrumbs} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[1.375rem] font-bold text-white/95 truncate">{title}</h1>
            {!isNew && <StatusBadge label={isPublished ? "Published" : "Draft"} tone={isPublished ? "success" : "warning"} />}
          </div>
          <span className="text-[0.75rem] text-white/35">
            {saving ? "Saving…" : dirty ? "Unsaved changes" : savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : " "}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onDuplicate && !isNew && (
            <button type="button" onClick={() => void onDuplicate()} className="rounded-lg border border-white/10 px-3.5 py-2 text-[0.8125rem] text-white/60 hover:text-white/90 hover:border-white/25 transition-colors">
              Duplicate
            </button>
          )}
          {onDelete && !isNew && (
            <button type="button" onClick={() => setPendingDelete(true)} className="rounded-lg border border-red-500/25 px-3.5 py-2 text-[0.8125rem] text-red-400 hover:bg-red-500/10 transition-colors">
              Delete
            </button>
          )}
          {(onPublish || onUnpublish) && (
            isPublished ? (
              <button type="button" onClick={() => void onUnpublish?.()} className="rounded-lg border border-white/10 px-3.5 py-2 text-[0.8125rem] text-white/70 hover:text-white/95 hover:border-white/25 transition-colors">
                Unpublish
              </button>
            ) : (
              <button type="button" onClick={() => void onPublish?.()} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-[0.8125rem] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                Publish
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving}
            className="rounded-lg bg-gold px-4 py-2 text-[0.8125rem] font-semibold text-background hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : isNew ? "Create" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-[0.8125rem] text-red-300">
          {error}
        </div>
      )}

      {loading ? <FormSkeleton fields={8} /> : <div className="flex flex-col gap-5">{children}</div>}

      {onDelete && (
        <ConfirmDialog
          open={pendingDelete}
          onClose={() => setPendingDelete(false)}
          onConfirm={async () => { await onDelete() }}
          title="Delete this item?"
          description="This cannot be undone."
          confirmLabel="Delete"
        />
      )}
    </div>
  )
}
