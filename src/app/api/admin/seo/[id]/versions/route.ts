/**
 * GET /api/admin/seo/[id]/versions — list version snapshots
 */
import { createAdminVersionsRoutes } from "@/lib/admin/crud-factory"

export const dynamic = "force-dynamic"

export const { GET } = createAdminVersionsRoutes({
  table: "site_seo",
  permission: "seo",
})
