/**
 * GET  /api/admin/courses — list (search + pagination)
 * POST /api/admin/courses — create
 */
import { z } from "zod"
import { createAdminCrudRoutes } from "@/lib/admin/crud-factory"
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
  "instructor_role", "instructor_initials",
  "duration_minutes", "lesson_count", "thumbnail_url", "banner_url", "cover_gradient", "gallery", "trailer_video_url",
  "price", "discount_price", "currency", "badge", "what_you_learn", "includes",
  "is_bestseller", "is_featured", "is_coming_soon",
  "is_published", "is_archived", "access_level", "tags", "curriculum",
  "seo_title", "seo_description", "seo_keywords",
  "students_count", "sales_count", "revenue_cached", "rating", "review_count", "completion_avg_pct",
  "order_index",
] as const

export const { GET, POST } = createAdminCrudRoutes<CourseInsert>({
  table: "courses",
  permission: "courses",
  orderBy: "order_index",
  orderAscending: true,
  searchFields: ["title", "slug", "instructor", "category"],
  filterableFields: ["difficulty", "access_level", "is_published"],
  writableFields: WRITABLE_FIELDS,
  schema: courseSchema,
})
