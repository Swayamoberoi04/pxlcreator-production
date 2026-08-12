/**
 * GET/PUT/PATCH/DELETE /api/admin/community/users/[id]
 * DELETE exists (permission-gated) but is not exposed in the admin UI —
 * banning is the intended moderation action, not deleting a user's profile.
 */
import { createAdminCrudItemRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type ProfileInsert = Database["public"]["Tables"]["community_profiles"]["Insert"]

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<ProfileInsert>({
  table: "community_profiles",
  permission: "community",
  writableFields: ["is_banned", "banned_reason", "banned_at", "is_verified", "is_premium"],
})
