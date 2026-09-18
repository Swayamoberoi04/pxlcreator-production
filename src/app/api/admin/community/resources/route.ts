/**
 * GET/POST /api/admin/community/resources
 *
 * Admin curation for the creator resource directory — the no-code path to
 * add a resource. `source` distinguishes PXL-built resources from external
 * third-party tools; `url` is required and unique (a resource is its
 * destination).
 */
import { createAdminCrudRoutes } from "@/lib/admin/crud-factory"
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

export const { GET, POST } = createAdminCrudRoutes<ResourceInsert>({
  table: "creator_resources",
  permission: "community",
  schema,
  orderBy: "display_order",
  orderAscending: true,
  searchFields: ["title", "description", "url"],
  filterableFields: ["category", "resource_type", "source", "status", "is_featured"],
  writableFields: [
    "title", "description", "url", "category", "resource_type", "source",
    "tags", "icon", "is_featured", "display_order", "status",
  ],
})
