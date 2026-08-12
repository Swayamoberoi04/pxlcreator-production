/**
 * GET/PUT/PATCH/DELETE /api/admin/community/comments/[id]
 */
import { createAdminCrudItemRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type CommentInsert = Database["public"]["Tables"]["post_comments"]["Insert"]

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<CommentInsert>({
  table: "post_comments",
  permission: "community",
  writableFields: ["is_removed"],
})
