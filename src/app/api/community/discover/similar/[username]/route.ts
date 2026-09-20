/**
 * GET /api/community/discover/similar/[username]
 *
 * Creators similar to the given profile, by real overlap of roles,
 * style_tags and skills. Scored by shared-tag count, not by any invented
 * "similarity score" — the number returned is literally how many tags they
 * have in common.
 *
 * Query params:
 *   ?limit=8 (max 24)
 *
 * Returns: { creators: (CommunityProfile & { shared_tags: number })[] }
 *
 * Auth: none — public. Only public profiles are ever compared or returned.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { getHiddenUids } from "@/lib/community/visibility"

export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const viewerUid = await getFirebaseUidFromRequest(req) // optional
  const { searchParams } = new URL(req.url)
  const limit = Math.min(24, Math.max(1, parseInt(searchParams.get("limit") ?? "8", 10) || 8))

  try {
    const supabase = createAdminClient()

    const { data: source, error: sourceError } = await supabase
      .from("community_profiles")
      .select("firebase_uid, roles, style_tags, skills, visibility")
      .eq("username", username.toLowerCase())
      .maybeSingle()

    if (sourceError) {
      console.error("[discover/similar GET] source", sourceError)
      return NextResponse.json({ error: "Failed to load profile." }, { status: 500 })
    }
    if (!source || source.visibility !== "public") {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 })
    }

    const tags = [
      ...(source.roles ?? []),
      ...(source.style_tags ?? []),
      ...(source.skills ?? []),
    ]
    if (tags.length === 0) {
      return NextResponse.json({ creators: [] })
    }

    // overlaps() against a combined tag pool isn't a single-column operator,
    // so pull an over-fetched candidate pool with combined array overlap on
    // each dimension separately, then score/re-rank in memory.
    const { data: candidates, error: candError } = await supabase
      .from("community_profiles")
      .select(
        "id, firebase_uid, username, display_name, bio, avatar_url, roles, style_tags, skills, skill_level, availability, location_city, location_country, is_verified, follower_count, showcase_count, reputation_score, visibility"
      )
      .eq("visibility", "public")
      .neq("firebase_uid", source.firebase_uid)
      .or(
        [
          source.roles?.length ? `roles.ov.{${source.roles.join(",")}}` : null,
          source.style_tags?.length ? `style_tags.ov.{${source.style_tags.join(",")}}` : null,
          source.skills?.length ? `skills.ov.{${source.skills.join(",")}}` : null,
        ].filter(Boolean).join(",")
      )
      .limit(limit * 5)

    if (candError) {
      console.error("[discover/similar GET] candidates", candError)
      return NextResponse.json({ error: "Failed to load similar creators." }, { status: 500 })
    }

    // Banned creators and anyone blocked/muted are never "similar creators".
    const hidden = await getHiddenUids(supabase, viewerUid)

    const tagSet = new Set(tags)
    const scored = (candidates ?? [])
      .filter((c) => !hidden.uids.has(c.firebase_uid))
      .map((c) => {
        const cTags = [...(c.roles ?? []), ...(c.style_tags ?? []), ...(c.skills ?? [])]
        const shared_tags = cTags.filter((t) => tagSet.has(t)).length
        return { ...c, shared_tags }
      })
      .filter((c) => c.shared_tags > 0)
      .sort((a, b) => b.shared_tags - a.shared_tags || b.follower_count - a.follower_count)
      .slice(0, limit)

    return NextResponse.json({ creators: scored })
  } catch (err) {
    console.error("[discover/similar GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
