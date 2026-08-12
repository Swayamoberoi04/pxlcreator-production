"use client"

/**
 * src/app/admin/editor-changelog/page.tsx
 *
 * "What's New" entries shown in the photo editor's TopBar panel
 * (src/components/editor/WhatsNewPanel.tsx). A real growing list — uses
 * AdminListPage, same as Courses/Blog.
 */

import { useRouter } from "next/navigation"
import { AdminListPage } from "@/components/admin/AdminListPage"
import { PublishStatusBadge } from "@/components/admin/ui/StatusBadge"
import type { DataTableColumn } from "@/components/admin/ui/AdminDataTable"
import type { Database } from "@/types/database"

type ChangelogEntry = Database["public"]["Tables"]["editor_changelog"]["Row"]

export default function EditorChangelogListPage() {
  const router = useRouter()

  const columns: DataTableColumn<ChangelogEntry>[] = [
    {
      key: "title", header: "Entry",
      render: (e) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-white/85">{e.title}</p>
          <p className="truncate text-[0.7rem] text-white/35">{e.version_label}</p>
        </div>
      ),
    },
    {
      key: "released_at", header: "Released",
      render: (e) => new Date(e.released_at).toLocaleDateString(),
    },
    {
      key: "status", header: "Status",
      render: (e) => <PublishStatusBadge isPublished={e.is_published} />,
    },
  ]

  return (
    <AdminListPage<ChangelogEntry>
      title="Editor Changelog"
      description={`"What's New" entries shown in the photo editor.`}
      breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Editor Changelog" }]}
      basePath="/api/admin/editor-changelog"
      newHref="/admin/editor-changelog/new"
      columns={columns}
      getId={(e) => e.id}
      searchPlaceholder="Search changelog…"
      onRowClick={(e) => router.push(`/admin/editor-changelog/${e.id}`)}
      bulkActions={[
        { key: "publish", label: "Publish" },
        { key: "unpublish", label: "Unpublish" },
        { key: "delete", label: "Delete", tone: "danger" },
      ]}
      onBulkAction={async (key, ids) => {
        for (const id of ids) {
          if (key === "publish") await fetch(`/api/admin/editor-changelog/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_published: true }) })
          if (key === "unpublish") await fetch(`/api/admin/editor-changelog/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_published: false }) })
        }
        router.refresh()
      }}
    />
  )
}
