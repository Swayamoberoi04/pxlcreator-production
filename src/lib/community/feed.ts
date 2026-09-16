/**
 * src/lib/community/feed.ts
 *
 * Shared enrichment + ranking helpers for the creator feed (Phase 5.3).
 * Used by both the feed list route and the single-post route so author/media/
 * reaction/save joins are written once.
 */

import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface RawFeedPost {
  id: string
  author_uid: string
  channel_id: string | null
  like_count: number
  comment_count: number
  save_count: number
  share_count: number
  created_at: string
  content_kind: string
  [key: string]: unknown
}

/**
 * Attach author profile, the viewer's own reaction/save state, and ordered
 * media to a page of posts. One batched query per relation — never N+1.
 */
export async function enrichPosts<T extends RawFeedPost>(
  supabase: SupabaseClient,
  posts: T[],
  viewerUid: string | null
): Promise<Array<T & {
  author: Record<string, unknown> | null
  user_reaction: string | null
  user_saved: boolean
  media: Record<string, unknown>[]
}>> {
  if (posts.length === 0) return []

  const postIds = posts.map((p) => p.id)
  const authorUids = [...new Set(posts.map((p) => p.author_uid))]

  const [authorsRes, mediaRes, reactionsRes, savesRes] = await Promise.all([
    supabase
      .from("community_profiles")
      .select("firebase_uid, username, display_name, avatar_url, is_verified")
      .in("firebase_uid", authorUids),
    supabase
      .from("post_media")
      .select("*")
      .in("post_id", postIds)
      .order("position", { ascending: true }),
    viewerUid
      ? supabase.from("post_reactions").select("post_id, reaction").eq("firebase_uid", viewerUid).in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string; reaction: string }[] }),
    viewerUid
      ? supabase.from("post_saves").select("post_id").eq("firebase_uid", viewerUid).in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
  ])

  const authorMap = new Map(
    (authorsRes.data ?? []).map((a: { firebase_uid: string }) => [a.firebase_uid, a])
  )
  const mediaMap = new Map<string, Record<string, unknown>[]>()
  for (const m of (mediaRes.data ?? []) as Record<string, unknown>[]) {
    const list = mediaMap.get(m.post_id as string) ?? []
    list.push(m)
    mediaMap.set(m.post_id as string, list)
  }
  const reactionMap = new Map(
    ((reactionsRes.data ?? []) as { post_id: string; reaction: string }[]).map((r) => [r.post_id, r.reaction])
  )
  const savedSet = new Set(((savesRes.data ?? []) as { post_id: string }[]).map((s) => s.post_id))

  return posts.map((p) => ({
    ...p,
    author: authorMap.get(p.author_uid) ?? null,
    user_reaction: reactionMap.get(p.id) ?? null,
    user_saved: savedSet.has(p.id),
    media: mediaMap.get(p.id) ?? [],
  }))
}

/**
 * Real-signal feed score. Every input is a real, persisted count or a real
 * timestamp — nothing here is a fabricated "virality" number.
 *
 *   recency:    decays from 100 to 0 over 7 days (a week-old post with zero
 *               engagement sinks to the bottom; nothing here fakes freshness)
 *   engagement: like*2 + comment*3 + save*4 + share*5 — weighted by how much
 *               intent each action represents, capped so one viral post can't
 *               permanently dominate every feed
 *   followBoost: +50 if the viewer follows the author — the single strongest
 *               real signal of relevance this feed has
 *   tagMatch:   +6 per role/style tag the author and viewer share, capped
 */
export function scorePost(
  post: { like_count: number; comment_count: number; save_count: number; share_count: number; created_at: string; author_uid: string },
  ctx: { viewerUid: string | null; following: Set<string>; viewerTags: Set<string>; authorTags: Map<string, string[]> }
): number {
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / 3_600_000
  const recency = Math.max(0, 100 - (ageHours / 168) * 100) // linear decay over 7 days

  const engagement = Math.min(
    150,
    post.like_count * 2 + post.comment_count * 3 + post.save_count * 4 + post.share_count * 5
  )

  const followBoost = ctx.viewerUid && ctx.following.has(post.author_uid) ? 50 : 0

  const authorTagList = ctx.authorTags.get(post.author_uid) ?? []
  const sharedTags = authorTagList.filter((t) => ctx.viewerTags.has(t)).length
  const tagMatch = Math.min(30, sharedTags * 6)

  return recency + engagement + followBoost + tagMatch
}
