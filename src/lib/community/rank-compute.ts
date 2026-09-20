/**
 * src/lib/community/rank-compute.ts
 *
 * Gathers the real counts a creator's rank is built from and persists the
 * result to creator_rank_scores (migration 048).
 *
 * Every input is a COUNT over real rows — there is no place in this file
 * where a number is invented, defaulted upward, or estimated. If a table
 * can't be read, that component contributes zero rather than a guess.
 */

import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { computeRank, countProfileFields, type RankInputs, type RankResult } from "./ranking"

/** How long a stored score stays fresh before a read triggers a recompute. */
export const RANK_TTL_MS = 60 * 60 * 1000 // 1 hour

async function countRows(
  supabase: SupabaseClient,
  table: string,
  build: (q: ReturnType<SupabaseClient["from"]>) => unknown
): Promise<number> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = build(supabase.from(table))
    const { count, error } = await query
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

/**
 * Compute a creator's rank from live data.
 *
 * Returns null when the creator has no community profile, or is banned — a
 * banned account is never ranked (migration 048 also purges their stored row).
 */
export async function computeRankForUser(
  supabase: SupabaseClient,
  uid: string
): Promise<RankResult | null> {
  const { data: profile } = await supabase
    .from("community_profiles")
    .select("firebase_uid, bio, avatar_url, location_city, website, roles, style_tags, skills, software, follower_count, is_banned")
    .eq("firebase_uid", uid)
    .maybeSingle()

  if (!profile || profile.is_banned) return null

  // The creator's own content ids — needed to count engagement RECEIVED
  // rather than engagement they handed out.
  const [{ data: ownPosts }, { data: ownShowcases }] = await Promise.all([
    supabase.from("channel_posts").select("id, like_count, comment_count, save_count")
      .eq("author_uid", uid).eq("is_removed", false).is("channel_id", null),
    supabase.from("showcase_items").select("id, like_count, comment_count, bookmark_count")
      .eq("author_uid", uid).eq("is_removed", false),
  ])

  const posts = ownPosts ?? []
  const showcases = ownShowcases ?? []

  const sum = (rows: Record<string, unknown>[], key: string) =>
    rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0)

  // Saves received = post saves + showcase bookmarks (the same gesture on
  // two surfaces). Comments/likes likewise summed across both.
  const savesReceived = sum(posts, "save_count") + sum(showcases, "bookmark_count")
  const commentsReceived = sum(posts, "comment_count") + sum(showcases, "comment_count")
  const likesReceived = sum(posts, "like_count") + sum(showcases, "like_count")

  const [completedProjects, fiveStarReviews, upheldReports] = await Promise.all([
    countRows(supabase, "project_listings", (q) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (q as any).select("id", { count: "exact", head: true }).eq("poster_uid", uid).eq("status", "completed")),
    countRows(supabase, "project_reviews", (q) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (q as any).select("id", { count: "exact", head: true }).eq("reviewee_uid", uid).eq("rating", 5)),
    // Only reports a moderator actually upheld. A pending accusation never
    // costs anyone points.
    countRows(supabase, "content_reports", (q) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (q as any).select("id", { count: "exact", head: true })
        .eq("target_type", "profile").eq("target_id", uid).eq("status", "actioned")),
  ])

  const inputs: RankInputs = {
    profileFieldsFilled: countProfileFields(profile as Record<string, unknown>),
    showcaseCount: showcases.length,
    feedPostCount: posts.length,
    savesReceived,
    commentsReceived,
    likesReceived,
    completedProjects,
    fiveStarReviews,
    followerCount: Number(profile.follower_count) || 0,
    upheldReports,
  }

  return computeRank(inputs)
}

/** Compute and persist. Returns the freshly computed result. */
export async function recomputeAndStore(
  supabase: SupabaseClient,
  uid: string
): Promise<RankResult | null> {
  const result = await computeRankForUser(supabase, uid)
  if (!result) {
    // Not rankable (no profile, or banned) — make sure no stale row lingers.
    await supabase.from("creator_rank_scores").delete().eq("firebase_uid", uid)
    return null
  }

  await supabase.from("creator_rank_scores").upsert({
    firebase_uid: uid,
    total_score: result.total,
    profile_score: result.profile_score,
    contribution_score: result.contribution_score,
    engagement_score: result.engagement_score,
    project_score: result.project_score,
    community_score: result.community_score,
    penalty_score: result.penalty_score,
    breakdown: { components: result.components, inputs: result.inputs },
    computed_at: new Date().toISOString(),
  } as never, { onConflict: "firebase_uid" })

  return result
}
