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

    const isOwner = uid === profile.firebase_uid

    // Check is_following early — 'followers' visibility depends on it.
    let is_following = false
    if (uid && !isOwner) {
      const { data: followRow } = await supabase
        .from("creator_follows")
        .select("follower_uid")
        .eq("follower_uid", uid)
        .eq("following_uid", profile.firebase_uid)
        .maybeSingle()
      is_following = !!followRow
    }

    // Respect the owner's visibility choice. A private profile is a 404 to
    // everyone but its owner — not a 403, which would confirm it exists.
    const visibility = (profile as { visibility?: string }).visibility ?? "public"
    if (!isOwner) {
      if (visibility === "private") {
        return NextResponse.json({ error: "Profile not found." }, { status: 404 })
      }
      if (visibility === "followers" && !is_following) {
        // Return only the identity needed to render a "follow to view" card.
        return NextResponse.json({
          profile: {
            id:            profile.id,
            firebase_uid:  profile.firebase_uid,
            username:      profile.username,
            display_name:  profile.display_name,
            avatar_url:    profile.avatar_url,
            is_verified:   profile.is_verified,
            visibility,
            is_following:  false,
            restricted:    true,
          },
        })
      }
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

    return NextResponse.json({
      profile: {
        ...profile,
        badges,
        is_following,
        restricted: false,
      },
    })
  } catch (err) {
    console.error("[community/profile/[username] GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
