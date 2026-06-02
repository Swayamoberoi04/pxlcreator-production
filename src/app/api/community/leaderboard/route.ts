/**
 * GET /api/community/leaderboard
 *
 * Top creators leaderboard.
 * Public endpoint — no auth required.
 *
 * Query params:
 *   ?type=reputation|followers|showcases|posts  (default: reputation)
 *   ?limit=20 (max 100)
 *
 * Returns top profiles sorted by the chosen metric, including badges.
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const VALID_TYPES = ["reputation", "followers", "showcases", "posts"] as const
type LeaderboardType = typeof VALID_TYPES[number]

const COLUMN_MAP: Record<LeaderboardType, string> = {
  reputation: "reputation_score",
  followers:  "follower_count",
  showcases:  "showcase_count",
  posts:      "post_count",
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const rawType = searchParams.get("type") ?? "reputation"
  const type: LeaderboardType = VALID_TYPES.includes(rawType as LeaderboardType)
    ? (rawType as LeaderboardType)
    : "reputation"

  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))

  const sortColumn = COLUMN_MAP[type]

  try {
    const supabase = createAdminClient()

    const { data: profiles, error } = await supabase
      .from("community_profiles")
      .select(
        "firebase_uid, username, display_name, avatar_url, is_verified, reputation_score, follower_count, showcase_count, post_count, review_avg, review_count, hired_count"
      )
      .order(sortColumn, { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[leaderboard GET]", error)
      return NextResponse.json({ error: "Failed to fetch leaderboard." }, { status: 500 })
    }

    const leaderboard = (profiles ?? []).map(
      (p, index) => ({
        rank: index + 1,
        ...(p as Record<string, unknown>),
      })
    )

    return NextResponse.json({ leaderboard, type, limit })
  } catch (err) {
    console.error("[leaderboard GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
