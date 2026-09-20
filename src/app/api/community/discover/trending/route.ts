/**
 * GET /api/community/discover/trending
 *
 * "Trending" = real follower growth over a real time window — the count of
 * creator_follows rows created in the last `days` days, grouped by
 * following_uid. Nothing here is invented: a creator with zero new follows
 * in the window simply does not appear.
 *
 * Query params:
 *   ?days=7    window size (1-30)
 *   ?limit=12  max results (1-50)
 *
 * Returns: { creators: (CommunityProfile & { recent_follows: number })[], windowDays }
 *
 * Auth: none — public.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { getHiddenUids } from "@/lib/community/visibility"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const viewerUid = await getFirebaseUidFromRequest(req) // optional
  const { searchParams } = new URL(req.url)
  const days = Math.min(30, Math.max(1, parseInt(searchParams.get("days") ?? "7", 10) || 7))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10) || 12))

  try {
    const supabase = createAdminClient()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Real recent-follow counts, grouped server-side.
    const { data: rows, error: followError } = await supabase
      .from("creator_follows")
      .select("following_uid")
      .gte("created_at", since)

    if (followError) {
      console.error("[discover/trending GET] follows", followError)
      return NextResponse.json({ error: "Failed to compute trending." }, { status: 500 })
    }

    const counts = new Map<string, number>()
    for (const row of (rows ?? []) as { following_uid: string }[]) {
      counts.set(row.following_uid, (counts.get(row.following_uid) ?? 0) + 1)
    }

    if (counts.size === 0) {
      // Genuinely nobody gained a follow in this window — an honest empty
      // list, not a fallback to "popular overall" dressed up as trending.
      return NextResponse.json({ creators: [], windowDays: days })
    }

    const topUids = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([uid]) => uid)

    const { data: profiles, error: profileError } = await supabase
      .from("community_profiles")
      .select(
        "id, firebase_uid, username, display_name, bio, avatar_url, roles, style_tags, skills, skill_level, availability, location_city, location_country, is_verified, follower_count, showcase_count, reputation_score, visibility"
      )
      .in("firebase_uid", topUids)
      .eq("visibility", "public")

    if (profileError) {
      console.error("[discover/trending GET] profiles", profileError)
      return NextResponse.json({ error: "Failed to load trending creators." }, { status: 500 })
    }

    // Banned creators and anyone blocked/muted must not trend.
    const hidden = await getHiddenUids(supabase, viewerUid)

    const byUid = new Map((profiles ?? []).map((p) => [p.firebase_uid, p]))
    const creators = topUids
      .map((uid) => {
        const p = byUid.get(uid)
        if (!p) return null // e.g. their profile went private since — exclude, don't fake
        if (hidden.uids.has(uid)) return null
        return { ...p, recent_follows: counts.get(uid) ?? 0 }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    return NextResponse.json({ creators, windowDays: days })
  } catch (err) {
    console.error("[discover/trending GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
