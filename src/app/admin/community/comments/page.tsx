"use client"

import { useState } from "react"
import { AdminListPage } from "@/components/admin/AdminListPage"
import { StatusBadge } from "@/components/admin/ui/StatusBadge"
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog"
import type { DataTableColumn } from "@/components/admin/ui/AdminDataTable"
import type { Database } from "@/types/database"

type Comment = Database["public"]["Tables"]["post_comments"]["Row"]

async function patchComment(id: string, body: Partial<Comment>) {
  await fetch(`/api/admin/community/comments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  window.location.reload()
}

export default function CommunityCommentsPage() {
  const [pendingDelete, setPendingDelete] = useState<Comment | null>(null)

  const columns: DataTableColumn<Comment>[] = [
    {
      key: "body", header: "Comment",
      render: (c) => (
        <div className="max-w-[420px]">
          <p className="truncate text-white/85">{c.body}</p>
          <p className="text-[0.7rem] text-white/35">by {c.author_uid}</p>
        </div>
      ),
    },
    { key: "created_at", header: "Posted", render: (c) => new Date(c.created_at).toLocaleDateString() },
    {
      key: "status", header: "Status",
      render: (c) => c.is_removed ? <StatusBadge label="Hidden" tone="danger" /> : <StatusBadge label="Visible" tone="neutral" />,
    },
  ]

  return (
    <>
      <AdminListPage<Comment>
        title="Community Comments"
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Community", href: "/admin/community" }, { label: "Comments" }]}
        basePath="/api/admin/community/comments"
        columns={columns}
        getId={(c) => c.id}
        searchPlaceholder="Search comments…"
        filters={[
          { key: "is_removed", label: "Status", options: [
            { value: "all", label: "All" }, { value: "false", label: "Visible" }, { value: "true", label: "Hidden" },
          ] },
        ]}
        rowActions={(c) => (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => patchComment(c.id, { is_removed: !c.is_removed })} className="text-[0.75rem] text-white/50 hover:text-gold transition-colors">
              {c.is_removed ? "Unhide" : "Hide"}
            </button>
            <button type="button" onClick={() => setPendingDelete(c)} className="text-[0.75rem] text-white/35 hover:text-red-400 transition-colors">
              Delete
            </button>
          </div>
        )}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return
          await fetch(`/api/admin/community/comments/${pendingDelete.id}`, { method: "DELETE" })
          window.location.reload()
        }}
        title="Delete this comment?"
        description="This permanently removes the comment. Consider Hide instead if you might need to restore it."
        confirmLabel="Delete"
      />
    </>
  )
}
