/**
 * GET /api/admin/ai-studio — list (always 1 row — a singleton settings table)
 */
import { createAdminCrudRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type SettingsInsert = Database["public"]["Tables"]["ai_studio_settings"]["Insert"]

export const { GET, POST } = createAdminCrudRoutes<SettingsInsert>({
  table: "ai_studio_settings",
  permission: "ai_studio",
  writableFields: [
    "is_enabled", "free_edits_per_hour", "hero_badge_label", "hero_title", "hero_subtitle",
    "fine_print", "announcement", "prompt_chips", "faq_items", "tutorial_items",
  ],
})
