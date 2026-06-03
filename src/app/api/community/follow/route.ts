/**
 * POST  /api/community/follow
 *
 * Body: { target_uid: string, action: "follow" | "unfollow" }
 *
 * - Inserts/deletes from creator_follows
 * - Increments/decrements follower_count on target and following_count on follower
 * - On follow: sends a notification to the target user
 *
 * Returns: { following: boolean, follower_count: number }
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { ensureProfile } from "@/lib/community/ensureProfile"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 60, windowMs: 60 * 60 * 1000 })

export async function POST(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: { target_uid?: string; action?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { target_uid, action } = body

  if (!target_uid || typeof target_uid !== "string") {
    return NextResponse.json({ error: "target_uid is required." }, { status: 400 })
  }
  if (action !== "follow" && action !== "unfollow") {
    return NextResponse.json({ error: "action must be 'follow' or 'unfollow'." }, { status: 400 })
  }
  if (target_uid === uid) {
    return NextResponse.json({ error: "You cannot follow yourself." }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Ensure both profiles exist
  await ensureProfile(uid)

  // Verify target exists
  const { data: targetProfile, error: targetError } = await supabase
    .from("community_profiles")
    .select("id, firebase_uid, follower_count, display_name")
    .eq("firebase_uid", target_uid)
    .maybeSingle()

  if (targetError || !targetProfile) {
    return NextResponse.json({ error: "Target user not found." }, { status: 404 })
  }

  if (action === "follow") {
    // Insert follow relationship (ignore conflict if already following)
    const { error: insertError } = await supabase
      .from("creator_follows")
      .insert({ follower_uid: uid, following_uid: target_uid })

    if (insertError && insertError.code !== "23505") {
      // 23505 = unique_violation (already following)
      console.error("[follow POST] insert error", insertError)
      return NextResponse.json({ error: "Failed to follow user." }, { status: 500 })
    }

    const alreadyFollowing = insertError?.code === "23505"

    if (!alreadyFollowing) {
      // Increment target's follower_count
      await supabase
        .from("community_profiles")
        .update({ follower_count: (targetProfile.follower_count ?? 0) + 1 })
        .eq("firebase_uid", target_uid)

      // Increment follower's following_count
      const { data: followerProfile } = await supabase
        .from("community_profiles")
        .select("following_count")
        .eq("firebase_uid", uid)
        .maybeSingle()

      if (followerProfile) {
        await supabase
          .from("community_profiles")
          .update({ following_count: (followerProfile.following_count ?? 0) + 1 })
          .eq("firebase_uid", uid)
      }

      // Fetch actor display name for notification
      const { data: actorProfile } = await supabase
        .from("community_profiles")
        .select("display_name, username")
        .eq("firebase_uid", uid)
        .maybeSingle()

      const actorName = actorProfile?.display_name ?? actorProfile?.username ?? "Someone"

      // Send notification to target
      await supabase.from("community_notifications").insert({
        recipient_uid: target_uid,
        actor_uid: uid,
        type: "follow",
        title: `${actorName} started following you`,
        body: `${actorName} is now following you on PXL.`,
        resource_type: "profile",
        is_read: false,
      })
    }
  } else {
    // Unfollow
    const { error: deleteError } = await supabase
      .from("creator_follows")
      .delete()
      .eq("follower_uid", uid)
      .eq("following_uid", target_uid)

    if (deleteError) {
      console.error("[follow POST] delete error", deleteError)
      return NextResponse.json({ error: "Failed to unfollow user." }, { status: 500 })
    }

    // Decrement target's follower_count (floor 0)
    const newFollowerCount = Math.max(0, (targetProfile.follower_count ?? 0) - 1)
    await supabase
      .from("community_profiles")
      .update({ follower_count: newFollowerCount })
      .eq("firebase_uid", target_uid)

    // Decrement follower's following_count
    const { data: followerProfile } = await supabase
      .from("community_profiles")
      .select("following_count")
      .eq("firebase_uid", uid)
      .maybeSingle()

    if (followerProfile) {
      await supabase
        .from("community_profiles")
        .update({
          following_count: Math.max(0, (followerProfile.following_count ?? 0) - 1),
        })
        .eq("firebase_uid", uid)
    }
  }

  // Fetch fresh follower_count
  const { data: refreshed } = await supabase
    .from("community_profiles")
    .select("follower_count")
    .eq("firebase_uid", target_uid)
    .maybeSingle()

  return NextResponse.json({
    following: action === "follow",
    follower_count: refreshed?.follower_count ?? 0,
  })
}
