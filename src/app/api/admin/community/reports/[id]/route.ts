/**
 * GET/PUT/PATCH/DELETE /api/admin/community/reports/[id]
 */
import { createAdminCrudItemRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type ReportInsert = Database["public"]["Tables"]["content_reports"]["Row"]

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<ReportInsert>({
  table: "content_reports",
  permission: "community",
  writableFields: ["status", "reviewed_by", "reviewed_at"],
})
