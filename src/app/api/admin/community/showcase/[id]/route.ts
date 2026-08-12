/**
 * GET/PUT/PATCH/DELETE /api/admin/community/showcase/[id]
 */
import { createAdminCrudItemRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type ShowcaseInsert = Database["public"]["Tables"]["showcase_items"]["Insert"]

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<ShowcaseInsert>({
  table: "showcase_items",
  permission: "community",
  writableFields: ["is_featured", "is_removed"],
})
