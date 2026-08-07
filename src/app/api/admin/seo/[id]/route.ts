/**
 * GET/PUT/PATCH/DELETE /api/admin/seo/[id] — single page's SEO entry
 */
import { createAdminCrudItemRoutes, type CrudConfig } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type SeoInsert = Database["public"]["Tables"]["site_seo"]["Insert"]

export const seoCrudConfig: CrudConfig<SeoInsert> = {
  table: "site_seo",
  permission: "seo",
  versioning: true,
  writableFields: [
    "page_key", "label", "path", "seo_title", "seo_description", "seo_keywords",
    "og_image_url", "og_type", "twitter_card", "canonical_url", "schema_json",
  ],
}

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<SeoInsert>(seoCrudConfig)
