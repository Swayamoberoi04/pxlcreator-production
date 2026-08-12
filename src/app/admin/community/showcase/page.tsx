"use client"

import { useState } from "react"
import Image from "next/image"
import { AdminListPage } from "@/components/admin/AdminListPage"
import { StatusBadge } from "@/components/admin/ui/StatusBadge"
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog"
import type { DataTableColumn } from "@/components/admin/ui/AdminDataTable"
import type { Database } from "@/types/database"

type ShowcaseItem = Database["public"]["Tables"]["showcase_items"]["Row"]

async function patchItem(id: string, body: Partial<ShowcaseItem>) {
  await fetch(`/api/admin/community/showcase/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  window.location.reload()
}

export default function CommunityShowcasePage() {
  const [pendingDelete, setPendingDelete] = useState<ShowcaseItem | null>(null)

  const columns: DataTableColumn<ShowcaseItem>[] = [
    {
      key: "title", header: "Item",
      render: (s) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-9 w-14 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30">
            {s.thumbnail_url && <Image src={s.thumbnail_url} alt="" fill className="object-cover" sizes="56px" />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-white/85">{s.title}</p>
            <p className="truncate text-[0.7rem] text-white/35">by {s.author_uid}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (s) => s.category },
    {
      key: "status", header: "Status",
      render: (s) => (
        <div className="flex gap-1.5 flex-wrap">
          {s.is_removed && <StatusBadge label="Hidden" tone="danger" />}
          {s.is_featured && <StatusBadge label="Featured" tone="gold" />}
          {!s.is_removed && !s.is_featured && <StatusBadge label="Normal" tone="neutral" />}
        </div>
      ),
    },
  ]

  return (
    <>
      <AdminListPage<ShowcaseItem>
        title="Community Showcase"
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Community", href: "/admin/community" }, { label: "Showcase" }]}
        basePath="/api/admin/community/showcase"
        columns={columns}
        getId={(s) => s.id}
        searchPlaceholder="Search showcase…"
        filters={[
          { key: "is_removed", label: "Status", options: [
            { value: "all", label: "All" }, { value: "false", label: "Visible" }, { value: "true", label: "Hidden" },
          ] },
        ]}
        rowActions={(s) => (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => patchItem(s.id, { is_featured: !s.is_featured })} className="text-[0.75rem] text-white/50 hover:text-gold transition-colors">
              {s.is_featured ? "Unfeature" : "Feature"}
            </button>
            <button type="button" onClick={() => patchItem(s.id, { is_removed: !s.is_removed })} className="text-[0.75rem] text-white/50 hover:text-gold transition-colors">
              {s.is_removed ? "Unhide" : "Hide"}
            </button>
            <button type="button" onClick={() => setPendingDelete(s)} className="text-[0.75rem] text-white/35 hover:text-red-400 transition-colors">
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
          await fetch(`/api/admin/community/showcase/${pendingDelete.id}`, { method: "DELETE" })
          window.location.reload()
        }}
        title="Delete this showcase item?"
        description="This permanently removes the item. Consider Hide instead if you might need to restore it."
        confirmLabel="Delete"
      />
    </>
  )
}
