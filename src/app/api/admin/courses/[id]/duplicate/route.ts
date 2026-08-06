/**
 * POST /api/admin/courses/[id]/duplicate
 */
import { createAdminDuplicateRoute } from "@/lib/admin/crud-factory"

export const dynamic = "force-dynamic"

export const { POST } = createAdminDuplicateRoute({
  table: "courses",
  permission: "courses",
  titleField: "title",
  slugField: "slug",
  copyFields: [
    "subtitle", "description", "category", "difficulty", "instructor",
    "duration_minutes", "lesson_count", "thumbnail_url", "banner_url", "gallery", "trailer_video_url",
    "price", "discount_price", "currency", "badge", "access_level", "tags", "curriculum",
    "seo_title", "seo_description", "seo_keywords", "order_index",
  ],
  overrides: {
    is_published: false,
    is_featured: false,
    is_bestseller: false,
    students_count: 0,
    sales_count: 0,
    revenue_cached: 0,
    rating: 0,
    review_count: 0,
    completion_avg_pct: 0,
  },
})
