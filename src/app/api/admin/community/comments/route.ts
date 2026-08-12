/**
 * GET /api/admin/community/comments — list post comments for moderation
 */
import { createAdminCrudRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type CommentInsert = Database["public"]["Tables"]["post_comments"]["Insert"]

export const { GET, POST } = createAdminCrudRoutes<CommentInsert>({
  table: "post_comments",
  permission: "community",
  orderBy: "created_at",
  orderAscending: false,
  searchFields: ["body"],
  filterableFields: ["is_removed", "post_id"],
  writableFields: ["is_removed"],
})
