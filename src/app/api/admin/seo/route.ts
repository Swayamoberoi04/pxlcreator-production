/**
 * GET /api/admin/seo — list all page SEO entries
 * (POST is unused — pages are seeded by migration, not created ad hoc.)
 */
import { createAdminCrudRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type SeoInsert = Database["public"]["Tables"]["site_seo"]["Insert"]

export const { GET, POST } = createAdminCrudRoutes<SeoInsert>({
  table: "site_seo",
  permission: "seo",
  orderBy: "label",
  orderAscending: true,
  writableFields: [
    "page_key", "label", "path", "seo_title", "seo_description", "seo_keywords",
    "og_image_url", "og_type", "twitter_card", "canonical_url", "schema_json",
  ],
})
