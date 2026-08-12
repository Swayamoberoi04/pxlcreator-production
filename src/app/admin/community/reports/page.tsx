"use client"

/**
 * Reports queue — reviews content_reports (see migration 012). Note: no
 * public "Report" UI exists yet anywhere on the site, so this queue will
 * stay empty until a report-submission flow is added to the community
 * pages — flagged as a known gap, not silently missing.
 */

import { AdminListPage } from "@/components/admin/AdminListPage"
import { StatusBadge } from "@/components/admin/ui/StatusBadge"
import type { DataTableColumn } from "@/components/admin/ui/AdminDataTable"
import type { Database } from "@/types/database"

type Report = Database["public"]["Tables"]["content_reports"]["Row"]

function statusTone(status: string): "warning" | "success" | "neutral" | "danger" {
  if (status === "pending") return "warning"
  if (status === "actioned") return "danger"
  if (status === "dismissed") return "neutral"
  return "success"
}

async function setStatus(id: string, status: string, adminEmail?: string) {
  await fetch(`/api/admin/community/reports/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reviewed_by: adminEmail ?? "admin", reviewed_at: new Date().toISOString() }),
  })
  window.location.reload()
}

export default function CommunityReportsPage() {
  const columns: DataTableColumn<Report>[] = [
    {
      key: "target", header: "Reported",
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-white/85">{r.target_type} · {r.target_id.slice(0, 8)}</p>
          <p className="truncate text-[0.7rem] text-white/35">{r.reason}</p>
        </div>
      ),
    },
    { key: "reporter_uid", header: "Reported By", render: (r) => r.reporter_uid },
    { key: "created_at", header: "Date", render: (r) => new Date(r.created_at).toLocaleDateString() },
    { key: "status", header: "Status", render: (r) => <StatusBadge label={r.status} tone={statusTone(r.status)} /> },
  ]

  return (
    <AdminListPage<Report>
      title="Reports Queue"
      description="User-flagged content awaiting review."
      breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Community", href: "/admin/community" }, { label: "Reports" }]}
      basePath="/api/admin/community/reports"
      columns={columns}
      getId={(r) => r.id}
      searchPlaceholder="Search reports…"
      filters={[
        { key: "status", label: "Status", options: [
          { value: "all", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "reviewed", label: "Reviewed" },
          { value: "dismissed", label: "Dismissed" },
          { value: "actioned", label: "Actioned" },
        ] },
      ]}
      rowActions={(r) => (
        <div className="flex items-center gap-2">
          {r.status === "pending" && (
            <>
              <button type="button" onClick={() => void setStatus(r.id, "actioned")} className="text-[0.75rem] text-red-400 hover:text-red-300 transition-colors">
                Action
              </button>
              <button type="button" onClick={() => void setStatus(r.id, "dismissed")} className="text-[0.75rem] text-white/50 hover:text-white/85 transition-colors">
                Dismiss
              </button>
            </>
          )}
        </div>
      )}
    />
  )
}
