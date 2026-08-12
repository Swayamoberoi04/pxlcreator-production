/**
 * GET  /api/admin/editor-presets — list quick-look presets
 * POST /api/admin/editor-presets — create
 */
import { z } from "zod"
import { createAdminCrudRoutes } from "@/lib/admin/crud-factory"
import { slugSchema, titleSchema } from "@/lib/admin/validation"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type PresetInsert = Database["public"]["Tables"]["editor_quick_presets"]["Insert"]

const presetSchema = z.object({
  name: titleSchema,
  preset_key: slugSchema,
})

export const { GET, POST } = createAdminCrudRoutes<PresetInsert>({
  table: "editor_quick_presets",
  permission: "editor",
  orderBy: "order_index",
  orderAscending: true,
  searchFields: ["name", "preset_key"],
  writableFields: ["preset_key", "name", "adjustments", "order_index", "is_active"],
  schema: presetSchema,
})
