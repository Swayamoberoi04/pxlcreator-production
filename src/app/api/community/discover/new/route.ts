/**
 * GET /api/community/discover/new
 *
 * Newest public profiles, by real created_at — no invented "joined" dates,
 * no synthetic activity.
 *
 * Query params:
 *   ?limit=12 (max 50)
 *
 * Returns: { creators: CommunityProfile[] }
 *
 * Auth: none — public.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { getHiddenUids, filterHidden } from "@/lib/community/visibility"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const viewerUid = await getFirebaseUidFromRequest(req) // optional
  const { searchParams } = new URL(req.url)
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10) || 12))

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("community_profiles")
      .select(
        "id, firebase_uid, username, display_name, bio, avatar_url, roles, style_tags, skills, skill_level, availability, location_city, location_country, is_verified, follower_count, showcase_count, reputation_score, visibility, created_at"
      )
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[discover/new GET]", error)
      return NextResponse.json({ error: "Failed to load new creators." }, { status: 500 })
    }

    // Banned creators and anyone blocked/muted are never "new creators".
    const hidden = await getHiddenUids(supabase, viewerUid)
    const creators = filterHidden(
      (data ?? []) as Record<string, unknown>[],
      hidden.uids,
      "firebase_uid"
    )

    return NextResponse.json({ creators })
  } catch (err) {
    console.error("[discover/new GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
