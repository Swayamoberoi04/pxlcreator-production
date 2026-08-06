/**
 * POST /api/admin/blog/[id]/duplicate
 */
import { createAdminDuplicateRoute } from "@/lib/admin/crud-factory"

export const dynamic = "force-dynamic"

export const { POST } = createAdminDuplicateRoute({
  table: "blog_posts",
  permission: "blog",
  titleField: "title",
  slugField: "slug",
  copyFields: [
    "excerpt", "content", "category", "author_name", "author_role", "author_initials",
    "cover_image_url", "banner_url", "cover_gradient", "tags", "reading_time_minutes",
    "seo_title", "seo_description", "seo_keywords", "og_image_url", "canonical_url",
  ],
  overrides: {
    is_published: false,
    is_featured: false,
    published_at: null,
    views_count: 0,
    likes_count: 0,
    shares_count: 0,
  },
})
