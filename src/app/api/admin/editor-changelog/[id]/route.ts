/**
 * GET/PUT/PATCH/DELETE /api/admin/editor-changelog/[id]
 */
import { z } from "zod"
import { createAdminCrudItemRoutes } from "@/lib/admin/crud-factory"
import { titleSchema } from "@/lib/admin/validation"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type ChangelogInsert = Database["public"]["Tables"]["editor_changelog"]["Insert"]

const changelogSchema = z.object({
  title: titleSchema,
  version_label: z.string().trim().min(1).max(40),
})

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<ChangelogInsert>({
  table: "editor_changelog",
  permission: "editor",
  writableFields: ["version_label", "title", "description", "released_at", "is_published"],
  schema: changelogSchema,
})
