/**
 * POST /api/admin/settings/[id]/versions/[versionId]/restore
 */
import { createAdminVersionRestoreRoute } from "@/lib/admin/crud-factory"
import { globalSettingsCrudConfig } from "../../../route"

export const dynamic = "force-dynamic"

export const { POST } = createAdminVersionRestoreRoute(globalSettingsCrudConfig)
