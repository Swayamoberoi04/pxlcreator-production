/**
 * POST /api/admin/seo/[id]/versions/[versionId]/restore
 */
import { createAdminVersionRestoreRoute } from "@/lib/admin/crud-factory"
import { seoCrudConfig } from "../../../route"

export const dynamic = "force-dynamic"

export const { POST } = createAdminVersionRestoreRoute(seoCrudConfig)
