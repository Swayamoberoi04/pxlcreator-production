/**
 * GET/PUT/PATCH/DELETE /api/admin/community/posts/[id]
 */
import { createAdminCrudItemRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type PostInsert = Database["public"]["Tables"]["channel_posts"]["Insert"]

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<PostInsert>({
  table: "channel_posts",
  permission: "community",
  writableFields: ["is_pinned", "is_locked", "is_removed"],
})
