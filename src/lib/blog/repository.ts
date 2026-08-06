/**
 * src/lib/blog/repository.ts
 *
 * Data access layer for the public blog (/blog, /blog/[slug]). Mirrors
 * src/lib/presets/repository.ts and src/lib/courses/repository.ts exactly:
 * falls back to the static ALL_POSTS catalog when Supabase isn't
 * configured, or when the query fails (e.g. migration not run yet), so
 * the site never breaks during cutover.
 *
 * "Live" = is_published AND (published_at is null OR in the past) — a
 * scheduled post with a future published_at is excluded here even though
 * is_published is true, matching the DB RLS policy in migration 032.
 *
 * Used in Server Components only.
 */

import type { BlogPost } from "@/types/blog"
import { adaptPosts, adaptPost } from "./adapter"
import { ALL_POSTS as STATIC_POSTS } from "@/data/posts"

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co"
  )
}

/** All live posts, newest first. */
export async function getPosts(): Promise<BlogPost[]> {
  if (!isSupabaseConfigured()) return STATIC_POSTS

  try {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const supabase = await createServerSupabaseClient()

    const nowIso = new Date().toISOString()
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("is_published", true)
      .or(`published_at.is.null,published_at.lte.${nowIso}`)
      .order("published_at", { ascending: false })

    if (error || !data || data.length === 0) return STATIC_POSTS
    return adaptPosts(data)
  } catch {
    return STATIC_POSTS
  }
}

/** Single live post by slug, or null if not found / not yet live. */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!isSupabaseConfigured()) {
    return STATIC_POSTS.find((p) => p.slug === slug) ?? null
  }

  try {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const supabase = await createServerSupabaseClient()

    const nowIso = new Date().toISOString()
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .or(`published_at.is.null,published_at.lte.${nowIso}`)
      .maybeSingle()

    if (error || !data) {
      return STATIC_POSTS.find((p) => p.slug === slug) ?? null
    }
    return adaptPost(data)
  } catch {
    return STATIC_POSTS.find((p) => p.slug === slug) ?? null
  }
}
