/**
 * GET /api/admin/homepage — list all homepage sections (ordered)
 * (POST is unused — sections are seeded by migration, not created ad hoc.)
 */
import { createAdminCrudRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type SectionInsert = Database["public"]["Tables"]["homepage_sections"]["Insert"]

export const { GET, POST } = createAdminCrudRoutes<SectionInsert>({
  table: "homepage_sections",
  permission: "homepage",
  orderBy: "order_index",
  orderAscending: true,
  writableFields: ["section_key", "label", "enabled", "order_index", "title", "subtitle", "cta_label", "cta_href", "image_url", "video_url", "content"],
})
