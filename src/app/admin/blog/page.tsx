"use client"

/**
 * src/app/admin/blog/page.tsx
 *
 * Second AdminListPage consumer (after Courses) — same shell, different
 * columns/filters. Status column distinguishes Published / Scheduled /
 * Draft based on is_published + published_at.
 */

import { useRouter } from "next/navigation"
import Image from "next/image"
import { AdminListPage } from "@/components/admin/AdminListPage"
import { StatusBadge } from "@/components/admin/ui/StatusBadge"
import type { DataTableColumn } from "@/components/admin/ui/AdminDataTable"
import type { Database } from "@/types/database"

type Post = Database["public"]["Tables"]["blog_posts"]["Row"]

function postStatus(post: Post): { label: string; tone: "success" | "info" | "warning" } {
  if (!post.is_published) return { label: "Draft", tone: "warning" }
  if (post.published_at && new Date(post.published_at) > new Date()) return { label: "Scheduled", tone: "info" }
  return { label: "Published", tone: "success" }
}

export default function BlogListPage() {
  const router = useRouter()

  const columns: DataTableColumn<Post>[] = [
    {
      key: "title",
      header: "Post",
      render: (p) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-9 w-14 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30">
            {p.cover_image_url && <Image src={p.cover_image_url} alt="" fill className="object-cover" sizes="56px" />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-white/85">{p.title}</p>
            <p className="truncate text-[0.7rem] text-white/35">{p.author_name}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (p) => p.category },
    {
      key: "published_at", header: "Date",
      render: (p) => p.published_at ? new Date(p.published_at).toLocaleDateString() : "—",
    },
    {
      key: "views", header: "Views", align: "right",
      render: (p) => p.views_count.toLocaleString(),
    },
    {
      key: "status", header: "Status",
      render: (p) => { const s = postStatus(p); return <StatusBadge label={s.label} tone={s.tone} /> },
    },
  ]

  return (
    <AdminListPage<Post>
      title="Blog"
      description="Articles, tutorials, and editorial content."
      breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Blog" }]}
      basePath="/api/admin/blog"
      newHref="/admin/blog/new"
      columns={columns}
      getId={(p) => p.id}
      searchPlaceholder="Search posts…"
      onRowClick={(p) => router.push(`/admin/blog/${p.id}`)}
      filters={[
        {
          key: "category", label: "Category",
          options: [
            { value: "all", label: "All" },
            { value: "Tutorial", label: "Tutorial" },
            { value: "Gear", label: "Gear" },
            { value: "Behind the Scenes", label: "Behind the Scenes" },
            { value: "Tips & Tricks", label: "Tips & Tricks" },
            { value: "Inspiration", label: "Inspiration" },
          ],
        },
      ]}
      bulkActions={[
        { key: "publish", label: "Publish" },
        { key: "unpublish", label: "Unpublish" },
        { key: "delete", label: "Delete", tone: "danger" },
      ]}
      onBulkAction={async (key, ids) => {
        for (const id of ids) {
          if (key === "publish") await fetch(`/api/admin/blog/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_published: true }) })
          if (key === "unpublish") await fetch(`/api/admin/blog/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_published: false }) })
        }
        router.refresh()
      }}
    />
  )
}
