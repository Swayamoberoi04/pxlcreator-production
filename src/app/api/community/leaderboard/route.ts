/**
 * GET /api/community/leaderboard
 *
 * Top creators, ranked by the transparent score defined in
 * src/lib/community/ranking.ts and persisted to creator_rank_scores.
 *
 * Bug this fixes (Phase 5.6 audit): this endpoint previously sorted by
 * community_profiles.reputation_score, a column only ever written by the
 * project-review route (+5 per 4–5★ review). The documented scoring formula
 * in /api/community/reputation computed a score and never wrote it back, so
 * in practice the leaderboard ranked almost everyone at zero and ordered them
 * arbitrarily. It now reads real, itemised, recomputed scores.
 *
 * Query params:
 *   ?type=rank|followers|showcases|posts   (default: rank)
 *   ?limit=20 (max 100)
 *
 * Every row carries the score's component breakdown so the UI can explain
 * the placement rather than asserting it.
 *
 * Public — no auth required.
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { getHiddenUids } from "@/lib/community/visibility"
import { recomputeAndStore, RANK_TTL_MS } from "@/lib/community/rank-compute"
import { RANK_EXPLAINER } from "@/lib/community/ranking"

const VALID_TYPES = ["rank", "followers", "showcases", "posts"] as const
type LeaderboardType = typeof VALID_TYPES[number]

const PROFILE_COLUMN: Record<Exclude<LeaderboardType, "rank">, string> = {
  followers: "follower_count",
  showcases: "showcase_count",
  posts:     "post_count",
}

/** How many stale rows to refresh per request — bounded so a cold cache
 *  can't turn one page load into hundreds of recomputes. */
const MAX_REFRESH_PER_REQUEST = 10

export async function GET(req: NextRequest) {
  const viewerUid = await getFirebaseUidFromRequest(req) // optional
  const { searchParams } = new URL(req.url)

  const rawType = searchParams.get("type") ?? "rank"
  const type: LeaderboardType = VALID_TYPES.includes(rawType as LeaderboardType)
    ? (rawType as LeaderboardType)
    : "rank"
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))

  try {
    const supabase = createAdminClient()
    const hidden = await getHiddenUids(supabase, viewerUid)

    if (type === "rank") {
      // Over-fetch so hidden creators can be removed without leaving gaps.
      const { data: scores, error } = await supabase
        .from("creator_rank_scores")
        .select("*")
        .order("total_score", { ascending: false })
        .limit(limit + hidden.uids.size + 20)

      if (error) {
        console.error("[leaderboard GET] scores", error)
        return NextResponse.json({ error: "Failed to fetch leaderboard." }, { status: 500 })
      }

      // Refresh the stalest entries, bounded per request.
      const stale = (scores ?? [])
        .filter((s) => Date.now() - new Date(s.computed_at).getTime() > RANK_TTL_MS)
        .slice(0, MAX_REFRESH_PER_REQUEST)
      if (stale.length > 0) {
        await Promise.all(stale.map((s) => recomputeAndStore(supabase, s.firebase_uid)))
        const { data: refreshed } = await supabase
          .from("creator_rank_scores")
          .select("*")
          .order("total_score", { ascending: false })
          .limit(limit + hidden.uids.size + 20)
        if (refreshed) scores!.splice(0, scores!.length, ...refreshed)
      }

      const visible = (scores ?? []).filter((s) => !hidden.uids.has(s.firebase_uid)).slice(0, limit)
      if (visible.length === 0) {
        return NextResponse.json({ leaderboard: [], type, limit, explainer: RANK_EXPLAINER })
      }

      const { data: profiles } = await supabase
        .from("community_profiles")
        .select("firebase_uid, username, display_name, avatar_url, is_verified, follower_count, showcase_count, post_count")
        .in("firebase_uid", visible.map((s) => s.firebase_uid))
        .eq("visibility", "public")
        .eq("is_banned", false)
      const profileMap = new Map((profiles ?? []).map((p) => [p.firebase_uid, p]))

      const leaderboard = visible
        .filter((s) => profileMap.has(s.firebase_uid))
        .map((s, index) => {
          const breakdown = (s.breakdown ?? {}) as { components?: unknown }
          return {
            rank: index + 1,
            ...profileMap.get(s.firebase_uid),
            total_score: s.total_score,
            components: breakdown.components ?? [],
            computed_at: s.computed_at,
          }
        })

      return NextResponse.json({ leaderboard, type, limit, explainer: RANK_EXPLAINER })
    }

    // The other tabs are plain, self-explanatory counts — no scoring involved.
    const sortColumn = PROFILE_COLUMN[type]
    const { data: profiles, error } = await supabase
      .from("community_profiles")
      .select("firebase_uid, username, display_name, avatar_url, is_verified, follower_count, showcase_count, post_count, review_avg, review_count, hired_count")
      .eq("visibility", "public")
      .eq("is_banned", false)
      .order(sortColumn, { ascending: false })
      .limit(limit + hidden.uids.size)

    if (error) {
      console.error("[leaderboard GET]", error)
      return NextResponse.json({ error: "Failed to fetch leaderboard." }, { status: 500 })
    }

    const leaderboard = (profiles ?? [])
      .filter((p) => !hidden.uids.has(p.firebase_uid))
      .slice(0, limit)
      .map((p, index) => ({ rank: index + 1, ...p }))

    return NextResponse.json({ leaderboard, type, limit })
  } catch (err) {
    console.error("[leaderboard GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
