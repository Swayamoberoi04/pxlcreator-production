"use client"

import { useState } from "react"
import { AdminListPage } from "@/components/admin/AdminListPage"
import { StatusBadge } from "@/components/admin/ui/StatusBadge"
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog"
import type { DataTableColumn } from "@/components/admin/ui/AdminDataTable"
import type { Database } from "@/types/database"

type Post = Database["public"]["Tables"]["channel_posts"]["Row"]

async function patchPost(id: string, body: Partial<Post>) {
  await fetch(`/api/admin/community/posts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  window.location.reload()
}

export default function CommunityPostsPage() {
  const [pendingDelete, setPendingDelete] = useState<Post | null>(null)

  const columns: DataTableColumn<Post>[] = [
    {
      key: "body", header: "Post",
      render: (p) => (
        <div className="max-w-[420px]">
          <p className="truncate font-medium text-white/85">{p.title || p.body.slice(0, 80)}</p>
          <p className="text-[0.7rem] text-white/35">by {p.author_uid}</p>
        </div>
      ),
    },
    { key: "created_at", header: "Posted", render: (p) => new Date(p.created_at).toLocaleDateString() },
    {
      key: "status", header: "Status",
      render: (p) => (
        <div className="flex gap-1.5 flex-wrap">
          {p.is_removed && <StatusBadge label="Hidden" tone="danger" />}
          {p.is_pinned && <StatusBadge label="Pinned" tone="gold" />}
          {p.is_locked && <StatusBadge label="Locked" tone="warning" />}
          {!p.is_removed && !p.is_pinned && !p.is_locked && <StatusBadge label="Normal" tone="neutral" />}
        </div>
      ),
    },
  ]

  return (
    <>
      <AdminListPage<Post>
        title="Community Posts"
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Community", href: "/admin/community" }, { label: "Posts" }]}
        basePath="/api/admin/community/posts"
        columns={columns}
        getId={(p) => p.id}
        searchPlaceholder="Search posts…"
        filters={[
          { key: "is_removed", label: "Status", options: [
            { value: "all", label: "All" }, { value: "false", label: "Visible" }, { value: "true", label: "Hidden" },
          ] },
        ]}
        rowActions={(p) => (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => patchPost(p.id, { is_removed: !p.is_removed })} className="text-[0.75rem] text-white/50 hover:text-gold transition-colors">
              {p.is_removed ? "Unhide" : "Hide"}
            </button>
            <button type="button" onClick={() => setPendingDelete(p)} className="text-[0.75rem] text-white/35 hover:text-red-400 transition-colors">
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
          await fetch(`/api/admin/community/posts/${pendingDelete.id}`, { method: "DELETE" })
          window.location.reload()
        }}
        title="Delete this post?"
        description="This permanently removes the post. Consider Hide instead if you might need to restore it."
        confirmLabel="Delete"
      />
    </>
  )
}
