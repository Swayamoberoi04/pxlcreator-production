/**
 * GET/PUT/PATCH/DELETE /api/admin/community/events/[id]
 */
import { createAdminCrudItemRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type EventInsert = Database["public"]["Tables"]["community_events"]["Insert"]

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<EventInsert>({
  table: "community_events",
  permission: "community",
  writableFields: [
    "title", "description", "event_type", "banner_url", "start_date", "end_date",
    "location", "attendance_mode", "registration_mode", "registration_url", "tags",
    "visibility", "max_participants", "rules", "status", "is_featured",
    "source", "organizer_name", "organizer_url",
  ],
})
