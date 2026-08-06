/**
 * GET/PUT/PATCH/DELETE /api/admin/homepage/[id] — single homepage section
 */
import { createAdminCrudItemRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type SectionInsert = Database["public"]["Tables"]["homepage_sections"]["Insert"]

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<SectionInsert>({
  table: "homepage_sections",
  permission: "homepage",
  writableFields: ["section_key", "label", "enabled", "order_index", "title", "subtitle", "cta_label", "cta_href", "image_url", "video_url", "content"],
})
