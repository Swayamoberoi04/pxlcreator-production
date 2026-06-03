/**
 * GET  /api/community/profile/[username]  — public profile by username
 *
 * Includes earned badges and whether the requesting user follows them.
 * Auth is optional — unauthenticated requests still get public data.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params

  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "Username is required." }, { status: 400 })
  }

  const uid = await getFirebaseUidFromRequest(req) // optional auth

  try {
    const supabase = createAdminClient()

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from("community_profiles")
      .select("*")
      .eq("username", username.toLowerCase())
      .maybeSingle()

    if (profileError) {
      console.error("[community/profile/[username] GET]", profileError)
      return NextResponse.json({ error: "Failed to fetch profile." }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 })
    }

    // Fetch earned badges with joined badge details
    const { data: badgeRows } = await supabase
      .from("user_earned_badges")
      .select("id, awarded_at, badge_id, community_badges(id, name, description, icon, color, slug)")
      .eq("firebase_uid", profile.firebase_uid)

    const badges = (badgeRows ?? []).map((row) => ({
      id:         row.id,
      awarded_at: row.awarded_at,
      badge_id:   row.badge_id,
      badge:      row.community_badges,
    }))

    // Check is_following if caller is authenticated
    let is_following = false
    if (uid && uid !== profile.firebase_uid) {
      const { data: followRow } = await supabase
        .from("creator_follows")
        .select("follower_uid")
        .eq("follower_uid", uid)
        .eq("following_uid", profile.firebase_uid)
        .maybeSingle()
      is_following = !!followRow
    }

    return NextResponse.json({
      profile: {
        ...profile,
        badges,
        is_following,
      },
    })
  } catch (err) {
    console.error("[community/profile/[username] GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
