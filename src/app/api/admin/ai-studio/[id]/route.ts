/**
 * GET/PUT/PATCH/DELETE /api/admin/ai-studio/[id] — [id] is always "default"
 */
import { createAdminCrudItemRoutes, type CrudConfig } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type SettingsInsert = Database["public"]["Tables"]["ai_studio_settings"]["Insert"]

export const aiStudioCrudConfig: CrudConfig<SettingsInsert> = {
  table: "ai_studio_settings",
  permission: "ai_studio",
  versioning: true,
  writableFields: [
    "is_enabled", "free_edits_per_hour", "hero_badge_label", "hero_title", "hero_subtitle",
    "fine_print", "announcement", "prompt_chips", "faq_items", "tutorial_items",
  ],
}

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<SettingsInsert>(aiStudioCrudConfig)
