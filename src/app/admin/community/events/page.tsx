"use client"

/**
 * src/app/admin/community/events/page.tsx
 *
 * Admin moderation for community events — feature, cancel, hide, or delete.
 * Members create their own events at /community/events; this is oversight of
 * what already exists, plus the external-event listing flag.
 */

import { useState } from "react"
import { AdminListPage } from "@/components/admin/AdminListPage"
import { StatusBadge } from "@/components/admin/ui/StatusBadge"
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog"
import type { DataTableColumn } from "@/components/admin/ui/AdminDataTable"
import type { Database } from "@/types/database"

type Event = Database["public"]["Tables"]["community_events"]["Row"]

async function patchEvent(id: string, body: Partial<Event>) {
  await fetch(`/api/admin/community/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  window.location.reload()
}

export default function AdminEventsPage() {
  const [pendingDelete, setPendingDelete] = useState<Event | null>(null)

  const columns: DataTableColumn<Event>[] = [
    {
      key: "title", header: "Event",
      render: (e) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-white/85">{e.title}</p>
          <p className="truncate text-[0.7rem] text-white/35">
            {e.event_type} · {e.attendance_mode}
            {e.source === "external" && e.organizer_name ? ` · by ${e.organizer_name}` : ""}
          </p>
        </div>
      ),
    },
    { key: "start_date", header: "Starts", render: (e) => new Date(e.start_date).toLocaleDateString() },
    { key: "participant_count", header: "Registered", align: "right", render: (e) => e.participant_count.toLocaleString() },
    { key: "view_count", header: "Views", align: "right", render: (e) => e.view_count.toLocaleString() },
    {
      key: "status", header: "Status",
      render: (e) => (
        <div className="flex gap-1.5 flex-wrap">
          <StatusBadge label={e.status} tone={e.status === "cancelled" ? "danger" : e.status === "active" ? "success" : "neutral"} />
          {e.source === "external" && <StatusBadge label="External" tone="info" />}
          {e.is_featured && <StatusBadge label="Featured" tone="gold" />}
          {e.visibility === "private" && <StatusBadge label="Private" tone="neutral" />}
        </div>
      ),
    },
  ]

  return (
    <>
      <AdminListPage<Event>
        title="Community Events"
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Community", href: "/admin/community" }, { label: "Events" }]}
        basePath="/api/admin/community/events"
        columns={columns}
        getId={(e) => e.id}
        searchPlaceholder="Search events…"
        filters={[
          { key: "status", label: "Status", options: [
            { value: "all", label: "All" }, { value: "upcoming", label: "Upcoming" },
            { value: "active", label: "Active" }, { value: "ended", label: "Ended" },
            { value: "cancelled", label: "Cancelled" },
          ] },
          { key: "source", label: "Source", options: [
            { value: "all", label: "All" }, { value: "pxl", label: "PXL" }, { value: "external", label: "External" },
          ] },
        ]}
        rowActions={(e) => (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void patchEvent(e.id, { is_featured: !e.is_featured })}
              className="text-[0.75rem] text-white/50 hover:text-gold transition-colors">
              {e.is_featured ? "Unfeature" : "Feature"}
            </button>
            {e.status !== "cancelled" && (
              <button type="button" onClick={() => void patchEvent(e.id, { status: "cancelled" })}
                className="text-[0.75rem] text-white/50 hover:text-orange-400 transition-colors">
                Cancel
              </button>
            )}
            <button type="button" onClick={() => setPendingDelete(e)}
              className="text-[0.75rem] text-white/35 hover:text-red-400 transition-colors">
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
          await fetch(`/api/admin/community/events/${pendingDelete.id}`, { method: "DELETE" })
          window.location.reload()
        }}
        title="Delete this event?"
        description="This permanently removes the event and every registration attached to it. Cancelling it instead keeps the record."
        confirmLabel="Delete"
      />
    </>
  )
}
