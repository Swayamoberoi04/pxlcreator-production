/**
 * GET /api/admin/ai-studio/[id]/versions
 */
import { createAdminVersionsRoutes } from "@/lib/admin/crud-factory"

export const dynamic = "force-dynamic"

export const { GET } = createAdminVersionsRoutes({
  table: "ai_studio_settings",
  permission: "ai_studio",
})
