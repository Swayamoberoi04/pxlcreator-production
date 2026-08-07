/**
 * POST /api/admin/homepage/[id]/versions/[versionId]/restore
 */
import { createAdminVersionRestoreRoute } from "@/lib/admin/crud-factory"
import { homepageSectionCrudConfig } from "../../../route"

export const dynamic = "force-dynamic"

export const { POST } = createAdminVersionRestoreRoute(homepageSectionCrudConfig)
