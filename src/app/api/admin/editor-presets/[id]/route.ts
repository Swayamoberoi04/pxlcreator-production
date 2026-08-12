/**
 * GET/PUT/PATCH/DELETE /api/admin/editor-presets/[id]
 */
import { z } from "zod"
import { createAdminCrudItemRoutes } from "@/lib/admin/crud-factory"
import { slugSchema, titleSchema } from "@/lib/admin/validation"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type PresetInsert = Database["public"]["Tables"]["editor_quick_presets"]["Insert"]

const presetSchema = z.object({
  name: titleSchema,
  preset_key: slugSchema,
})

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<PresetInsert>({
  table: "editor_quick_presets",
  permission: "editor",
  writableFields: ["preset_key", "name", "adjustments", "order_index", "is_active"],
  schema: presetSchema,
})
