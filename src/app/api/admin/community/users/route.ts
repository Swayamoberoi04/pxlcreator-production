/**
 * GET /api/admin/community/users — list community profiles for moderation
 */
import { createAdminCrudRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type ProfileInsert = Database["public"]["Tables"]["community_profiles"]["Insert"]

export const { GET, POST } = createAdminCrudRoutes<ProfileInsert>({
  table: "community_profiles",
  permission: "community",
  orderBy: "created_at",
  orderAscending: false,
  searchFields: ["username", "display_name", "bio"],
  filterableFields: ["is_banned", "is_verified"],
  // Moderation + light curation only — never lets admin rewrite profile content.
  writableFields: ["is_banned", "banned_reason", "banned_at", "is_verified", "is_premium"],
})
