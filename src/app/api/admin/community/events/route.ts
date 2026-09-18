/**
 * GET/POST /api/admin/community/events
 *
 * Admin moderation/curation for community events. Covers both PXL-run events
 * and externally-organised ones listed for discovery (source='external',
 * which requires organizer_name so the listing never reads as PXL-run).
 */
import { createAdminCrudRoutes } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type EventInsert = Database["public"]["Tables"]["community_events"]["Insert"]

export const { GET, POST } = createAdminCrudRoutes<EventInsert>({
  table: "community_events",
  permission: "community",
  orderBy: "start_date",
  orderAscending: false,
  searchFields: ["title", "description", "organizer_name"],
  filterableFields: ["status", "event_type", "source", "visibility", "is_featured"],
  writableFields: [
    "title", "description", "event_type", "banner_url", "start_date", "end_date",
    "location", "attendance_mode", "registration_mode", "registration_url", "tags",
    "visibility", "max_participants", "rules", "status", "is_featured",
    "source", "organizer_name", "organizer_url", "organiser_uid",
  ],
})
