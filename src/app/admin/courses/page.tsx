"use client"

/**
 * src/app/admin/courses/page.tsx
 *
 * First real consumer of AdminListPage — proves the Phase 2 architecture:
 * this entire list page (search, filters, table, pagination, bulk actions,
 * remembered list state) is column/filter config only. No hand-rolled
 * fetch/loading/table/pagination code, unlike Presets/Bundles.
 */

import { useRouter } from "next/navigation"
import Image from "next/image"
import { AdminListPage } from "@/components/admin/AdminListPage"
import { PublishStatusBadge } from "@/components/admin/ui/StatusBadge"
import type { DataTableColumn } from "@/components/admin/ui/AdminDataTable"
import type { Database } from "@/types/database"

type Course = Database["public"]["Tables"]["courses"]["Row"]

export default function CoursesListPage() {
  const router = useRouter()

  const columns: DataTableColumn<Course>[] = [
    {
      key: "title",
      header: "Course",
      render: (c) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-9 w-14 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30">
            {c.thumbnail_url && <Image src={c.thumbnail_url} alt="" fill className="object-cover" sizes="56px" />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-white/85">{c.title}</p>
            <p className="truncate text-[0.7rem] text-white/35">{c.instructor || "—"}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (c) => c.category || "—" },
    { key: "difficulty", header: "Level", render: (c) => c.difficulty || "—" },
    {
      key: "price", header: "Price", align: "right",
      render: (c) => c.price === 0 ? "Free" : `${c.currency} ${c.discount_price ?? c.price}`,
    },
    {
      key: "students", header: "Students", align: "right",
      render: (c) => c.students_count.toLocaleString(),
    },
    {
      key: "status", header: "Status",
      render: (c) => <PublishStatusBadge isPublished={c.is_published} isArchived={c.is_archived} />,
    },
  ]

  return (
    <AdminListPage<Course>
      title="Courses"
      description="Video courses sold or included with premium access."
      breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Courses" }]}
      basePath="/api/admin/courses"
      newHref="/admin/courses/new"
      columns={columns}
      getId={(c) => c.id}
      searchPlaceholder="Search courses…"
      onRowClick={(c) => router.push(`/admin/courses/${c.id}`)}
      filters={[
        {
          key: "difficulty", label: "Level",
          options: [
            { value: "all", label: "All" },
            { value: "Beginner", label: "Beginner" },
            { value: "Intermediate", label: "Intermediate" },
            { value: "Advanced", label: "Advanced" },
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
          if (key === "publish") await fetch(`/api/admin/courses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_published: true }) })
          if (key === "unpublish") await fetch(`/api/admin/courses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_published: false }) })
        }
        router.refresh()
      }}
    />
  )
}
