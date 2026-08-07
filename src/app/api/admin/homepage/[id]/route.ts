/**
 * GET/PUT/PATCH/DELETE /api/admin/homepage/[id] — single homepage section
 *
 * `homepageSectionCrudConfig` is exported so the versions/restore route
 * (./versions/[versionId]/restore/route.ts) reuses the identical
 * writableFields allowlist instead of duplicating it.
 */
import { createAdminCrudItemRoutes, type CrudConfig } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type SectionInsert = Database["public"]["Tables"]["homepage_sections"]["Insert"]

export const homepageSectionCrudConfig: CrudConfig<SectionInsert> = {
  table: "homepage_sections",
  permission: "homepage",
  versioning: true,
  writableFields: [
    "section_key", "label", "enabled", "order_index", "title", "subtitle",
    "cta_label", "cta_href", "image_url", "video_url", "content", "items",
    "publish_at", "unpublish_at",
  ],
}

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<SectionInsert>(homepageSectionCrudConfig)
