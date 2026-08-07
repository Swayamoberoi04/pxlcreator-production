/**
 * GET /api/admin/homepage/[id]/versions — list version snapshots for a section
 */
import { createAdminVersionsRoutes } from "@/lib/admin/crud-factory"

export const dynamic = "force-dynamic"

export const { GET } = createAdminVersionsRoutes({
  table: "homepage_sections",
  permission: "homepage",
})
