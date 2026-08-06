/**
 * src/lib/blog/adapter.ts
 *
 * Maps a `blog_posts` DB row to the public `BlogPost` shape (src/types/blog.ts).
 * `content` passes straight through — the DB stores the exact same typed
 * ContentBlock[] shape the public renderer already expects.
 */

import type { Database } from "@/types/database"
import type { BlogPost, ContentBlock } from "@/types/blog"

type PostRow = Database["public"]["Tables"]["blog_posts"]["Row"]

export function adaptPost(row: PostRow): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    category: row.category,
    author: { name: row.author_name, role: row.author_role, initials: row.author_initials },
    publishedAt: row.published_at ?? row.created_at,
    readTime: row.reading_time_minutes,
    featured: row.is_featured,
    coverGradient: row.cover_gradient ?? "from-[#141414] via-[#1a1a1a] to-[#0a0a0a]",
    coverImage: row.cover_image_url ?? undefined,
    tags: row.tags,
    content: (row.content as unknown as ContentBlock[]) ?? [],
  }
}

export function adaptPosts(rows: PostRow[]): BlogPost[] {
  return rows.map(adaptPost)
}
