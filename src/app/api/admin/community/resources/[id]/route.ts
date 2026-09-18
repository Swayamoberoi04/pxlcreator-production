/**
 * GET/PUT/PATCH/DELETE /api/admin/community/resources/[id]
 */
import { createAdminCrudItemRoutes } from "@/lib/admin/crud-factory"
import { z } from "zod"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type ResourceInsert = Database["public"]["Tables"]["creator_resources"]["Insert"]

const schema = z.object({
  title:         z.string().min(1).max(150),
  description:   z.string().min(1).max(600),
  url:           z.string().url(),
  category:      z.string().max(40).optional(),
  resource_type: z.enum(["tools", "learning", "communities", "references", "templates", "services"]).optional(),
  source:        z.enum(["pxl", "external"]).optional(),
  tags:          z.array(z.string()).max(10).optional(),
  icon:          z.string().max(8).optional(),
  is_featured:   z.boolean().optional(),
  display_order: z.number().int().optional(),
  status:        z.enum(["draft", "published", "archived"]).optional(),
})

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<ResourceInsert>({
  table: "creator_resources",
  permission: "community",
  schema,
  writableFields: [
    "title", "description", "url", "category", "resource_type", "source",
    "tags", "icon", "is_featured", "display_order", "status",
  ],
})
