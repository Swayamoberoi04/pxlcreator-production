/**
 * GET /api/admin/community/posts — list channel posts for moderation
 */
import { createAdminCrudRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type PostInsert = Database["public"]["Tables"]["channel_posts"]["Insert"]

export const { GET, POST } = createAdminCrudRoutes<PostInsert>({
  table: "channel_posts",
  permission: "community",
  orderBy: "created_at",
  orderAscending: false,
  searchFields: ["title", "body"],
  filterableFields: ["is_removed", "is_pinned", "channel_id"],
  // Moderation only — never lets admin rewrite a user's post body.
  writableFields: ["is_pinned", "is_locked", "is_removed"],
})
