/**
 * GET/PUT/PATCH/DELETE /api/admin/courses/[id]
 */
import { z } from "zod"
import { createAdminCrudItemRoutes } from "@/lib/admin/crud-factory"
import { slugSchema, titleSchema, priceSchema, currencySchema } from "@/lib/admin/validation"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"]

const courseSchema = z.object({
  title: titleSchema,
  slug: slugSchema,
  price: priceSchema.optional(),
  discount_price: priceSchema.optional(),
  currency: currencySchema.optional(),
})

const WRITABLE_FIELDS = [
  "title", "slug", "subtitle", "description", "category", "difficulty", "instructor",
  "duration_minutes", "lesson_count", "thumbnail_url", "banner_url", "gallery", "trailer_video_url",
  "price", "discount_price", "currency", "badge", "is_bestseller", "is_featured", "is_coming_soon",
  "is_published", "is_archived", "access_level", "tags", "curriculum",
  "seo_title", "seo_description", "seo_keywords",
  "students_count", "sales_count", "revenue_cached", "rating", "review_count", "completion_avg_pct",
  "order_index",
] as const

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<CourseInsert>({
  table: "courses",
  permission: "courses",
  writableFields: WRITABLE_FIELDS,
  schema: courseSchema,
})
