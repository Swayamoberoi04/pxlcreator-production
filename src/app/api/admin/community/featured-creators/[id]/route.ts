/**
 * GET/PUT/PATCH/DELETE /api/admin/community/featured-creators/[id]
 */
import { createAdminCrudItemRoutes } from "@/lib/admin/crud-factory"
import { z } from "zod"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type FeaturedCreatorInsert = Database["public"]["Tables"]["featured_creators"]["Insert"]

const schema = z.object({
  name:        z.string().min(1).max(120),
  handle:      z.string().max(60).nullable().optional(),
  bio:         z.string().max(1000).optional(),
  avatar_url:  z.string().url().nullable().optional(),
  source_url:  z.string().url(),
  platform:    z.string().max(60).optional(),
  role_tags:   z.array(z.string()).max(10).optional(),
  style_tags:  z.array(z.string()).max(10).optional(),
  source_note: z.string().max(500).optional(),
  sort_order:  z.number().int().optional(),
  is_active:   z.boolean().optional(),
})

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<FeaturedCreatorInsert>({
  table: "featured_creators",
  permission: "community",
  schema,
  writableFields: [
    "name", "handle", "bio", "avatar_url", "source_url", "platform",
    "role_tags", "style_tags", "source_note", "sort_order", "is_active",
  ],
})
