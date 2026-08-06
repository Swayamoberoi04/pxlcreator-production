/**
 * GET  /api/admin/blog — list (search + pagination)
 * POST /api/admin/blog — create
 */
import { z } from "zod"
import { createAdminCrudRoutes } from "@/lib/admin/crud-factory"
import { slugSchema, titleSchema } from "@/lib/admin/validation"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type PostInsert = Database["public"]["Tables"]["blog_posts"]["Insert"]

const postSchema = z.object({
  title: titleSchema,
  slug: slugSchema,
})

const WRITABLE_FIELDS = [
  "title", "slug", "excerpt", "content", "category",
  "author_name", "author_role", "author_initials",
  "cover_image_url", "banner_url", "cover_gradient", "tags", "reading_time_minutes",
  "is_featured", "is_published", "published_at",
  "views_count", "likes_count", "shares_count",
  "seo_title", "seo_description", "seo_keywords", "og_image_url", "canonical_url",
] as const

export const { GET, POST } = createAdminCrudRoutes<PostInsert>({
  table: "blog_posts",
  permission: "blog",
  orderBy: "published_at",
  orderAscending: false,
  searchFields: ["title", "slug", "excerpt"],
  filterableFields: ["category", "is_published", "is_featured"],
  writableFields: WRITABLE_FIELDS,
  schema: postSchema,
})
