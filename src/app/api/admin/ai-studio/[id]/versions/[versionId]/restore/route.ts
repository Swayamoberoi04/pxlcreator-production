/**
 * POST /api/admin/ai-studio/[id]/versions/[versionId]/restore
 */
import { createAdminVersionRestoreRoute } from "@/lib/admin/crud-factory"
import { aiStudioCrudConfig } from "../../../route"

export const dynamic = "force-dynamic"

export const { POST } = createAdminVersionRestoreRoute(aiStudioCrudConfig)
