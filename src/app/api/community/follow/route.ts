/**
 * POST  /api/community/follow
 *
 * Body: { target_uid: string, action: "follow" | "unfollow" }
 *
 * - Inserts/deletes from creator_follows
 * - follower_count / following_count are maintained atomically by the
 *   `trg_sync_follow_counts` database trigger (migration 043), NOT here —
 *   the previous read-modify-write drifted under concurrent follows.
 * - Duplicate follows are impossible: unique(follower_uid, following_uid)
 * - Self-follows are impossible: creator_follows_no_self_check
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
      // Counts are already updated by trg_sync_follow_counts at this point.

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
    // Counts are already decremented by trg_sync_follow_counts.
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
