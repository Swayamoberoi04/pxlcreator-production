/**
 * GET /api/admin/community/reports — user-flagged content queue
 */
import { createAdminCrudRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

// Row (not Insert) — reviewed_by/reviewed_at are Update-only fields, and
// writableFields needs to reference both create- and update-time columns.
type ReportInsert = Database["public"]["Tables"]["content_reports"]["Row"]

export const { GET, POST } = createAdminCrudRoutes<ReportInsert>({
  table: "content_reports",
  permission: "community",
  orderBy: "created_at",
  orderAscending: false,
  searchFields: ["reason", "details", "target_type"],
  filterableFields: ["status", "target_type"],
  writableFields: ["status", "reviewed_by", "reviewed_at"],
})
