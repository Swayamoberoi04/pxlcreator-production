/**
 * GET /api/admin/settings/[id]/versions
 */
import { createAdminVersionsRoutes } from "@/lib/admin/crud-factory"

export const dynamic = "force-dynamic"

export const { GET } = createAdminVersionsRoutes({
  table: "global_settings",
  permission: "settings",
})
