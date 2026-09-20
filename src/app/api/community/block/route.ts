/**
 * GET    /api/community/block — list who you've blocked or muted
 * POST   /api/community/block — block or mute a creator
 * DELETE /api/community/block — unblock / unmute
 *
 * block = mutual invisibility; neither of you sees the other, and follows
 *         between you are removed in both directions.
 * mute  = one-way; you stop seeing them, they are told nothing and their
 *         follow of you is left intact.
 *
 * Body (POST):   { target_uid, block_type?: "block" | "mute" }
 * Body (DELETE): { target_uid }
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 40, windowMs: 60 * 60 * 1000 })

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  try {
    const supabase = createAdminClient()
    // Only ever the viewer's OWN list — who blocked *them* is never disclosed.
    const { data: blocks, error } = await supabase
      .from("user_blocks")
      .select("id, blocked_uid, block_type, created_at")
      .eq("blocker_uid", uid)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[community/block GET]", error)
      return NextResponse.json({ error: "Failed to load blocks." }, { status: 500 })
    }
    if (!blocks || blocks.length === 0) return NextResponse.json({ blocks: [] })

    const { data: profiles } = await supabase
      .from("community_profiles")
      .select("firebase_uid, username, display_name, avatar_url")
      .in("firebase_uid", blocks.map((b) => b.blocked_uid))
    const profileMap = new Map((profiles ?? []).map((p) => [p.firebase_uid, p]))

    return NextResponse.json({
      blocks: blocks.map((b) => ({ ...b, profile: profileMap.get(b.blocked_uid) ?? null })),
    })
  } catch (err) {
    console.error("[community/block GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── POST ────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: { target_uid?: string; block_type?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { target_uid } = body
  const blockType = body.block_type === "mute" ? "mute" : "block"

  if (!target_uid || typeof target_uid !== "string") {
    return NextResponse.json({ error: "target_uid is required." }, { status: 400 })
  }
  if (target_uid === uid) {
    return NextResponse.json({ error: "You can't block yourself." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { data: target } = await supabase
      .from("community_profiles")
      .select("firebase_uid")
      .eq("firebase_uid", target_uid)
      .maybeSingle()
    if (!target) {
      return NextResponse.json({ error: "Creator not found." }, { status: 404 })
    }

    const { error: upsertError } = await supabase
      .from("user_blocks")
      .upsert(
        { blocker_uid: uid, blocked_uid: target_uid, block_type: blockType },
        { onConflict: "blocker_uid,blocked_uid" }
      )
    if (upsertError) {
      console.error("[community/block POST]", upsertError)
      return NextResponse.json({ error: "Failed to block." }, { status: 500 })
    }

    // A full block severs the follow graph both ways — otherwise the blocked
    // party keeps receiving the blocker's activity through their following
    // feed. A mute leaves follows alone by design: it's a quiet, one-way act.
    if (blockType === "block") {
      await supabase
        .from("creator_follows")
        .delete()
        .or(`and(follower_uid.eq.${uid},following_uid.eq.${target_uid}),and(follower_uid.eq.${target_uid},following_uid.eq.${uid})`)
    }

    return NextResponse.json({ blocked: true, block_type: blockType })
  } catch (err) {
    console.error("[community/block POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── DELETE ──────────────────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  let body: { target_uid?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }
  if (!body.target_uid) {
    return NextResponse.json({ error: "target_uid is required." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_uid", uid)
      .eq("blocked_uid", body.target_uid)

    if (error) {
      console.error("[community/block DELETE]", error)
      return NextResponse.json({ error: "Failed to unblock." }, { status: 500 })
    }
    // Follows are not restored — unblocking undoes the block, not the past.
    return NextResponse.json({ blocked: false })
  } catch (err) {
    console.error("[community/block DELETE] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
