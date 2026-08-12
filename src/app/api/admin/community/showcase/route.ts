/**
 * GET /api/admin/community/showcase — list showcase items for moderation
 */
import { createAdminCrudRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type ShowcaseInsert = Database["public"]["Tables"]["showcase_items"]["Insert"]

export const { GET, POST } = createAdminCrudRoutes<ShowcaseInsert>({
  table: "showcase_items",
  permission: "community",
  orderBy: "created_at",
  orderAscending: false,
  searchFields: ["title", "description"],
  filterableFields: ["is_removed", "is_featured", "category"],
  writableFields: ["is_featured", "is_removed"],
})
