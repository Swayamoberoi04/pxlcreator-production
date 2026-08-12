/**
 * GET  /api/admin/editor-changelog — list changelog entries
 * POST /api/admin/editor-changelog — create
 */
import { z } from "zod"
import { createAdminCrudRoutes } from "@/lib/admin/crud-factory"
import { titleSchema } from "@/lib/admin/validation"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type ChangelogInsert = Database["public"]["Tables"]["editor_changelog"]["Insert"]

const changelogSchema = z.object({
  title: titleSchema,
  version_label: z.string().trim().min(1).max(40),
})

export const { GET, POST } = createAdminCrudRoutes<ChangelogInsert>({
  table: "editor_changelog",
  permission: "editor",
  orderBy: "released_at",
  orderAscending: false,
  searchFields: ["title", "version_label", "description"],
  filterableFields: ["is_published"],
  writableFields: ["version_label", "title", "description", "released_at", "is_published"],
  schema: changelogSchema,
})
