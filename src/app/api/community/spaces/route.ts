/**
 * GET  /api/community/spaces  — list all community spaces
 * POST /api/community/spaces  — join or leave a space
 *
 * GET: public, no auth required. Returns spaces ordered by display_order.
 *      If authenticated, includes is_member per space.
 *
 * POST body: { space_id: string, action: "join" | "leave" }
 *   Auth required. Join inserts membership row and increments member_count.
 *   Leave deletes membership row and decrements member_count.
 *   Owner (uid in moderator_uids[0]) cannot leave.
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

const joinLimiter = makeRateLimiter({ max: 30, windowMs: 60 * 60 * 1000 })

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req) // optional

  try {
    const supabase = createAdminClient()

    const { data: spaces, error } = await supabase
      .from("community_spaces")
      .select("*")
      .order("display_order", { ascending: true })

    if (error) {
      console.error("[spaces GET]", error)
      return NextResponse.json({ error: "Failed to fetch spaces." }, { status: 500 })
    }

    if (!spaces || spaces.length === 0) {
      return NextResponse.json({ spaces: [] })
    }

    // If auth'd, check which spaces the user is a member of
    let memberSet = new Set<string>()
    if (uid) {
      const spaceIds = spaces.map((s: { id: string }) => s.id)
      const { data: memberships } = await supabase
        .from("community_space_members")
        .select("space_id")
        .eq("firebase_uid", uid)
        .in("space_id", spaceIds)
      memberSet = new Set((memberships ?? []).map((m: { space_id: string }) => m.space_id))
    }

    const enriched = spaces.map((space: Record<string, unknown>) => ({
      ...space,
      is_member: memberSet.has(space.id as string),
    }))

    return NextResponse.json({ spaces: enriched })
  } catch (err) {
    console.error("[spaces GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── POST ────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (joinLimiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { space_id, action } = body as { space_id?: string; action?: string }

  if (!space_id || typeof space_id !== "string") {
    return NextResponse.json({ error: "space_id is required." }, { status: 400 })
  }
  if (action !== "join" && action !== "leave") {
    return NextResponse.json({ error: "action must be 'join' or 'leave'." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Fetch space
    const { data: space, error: spaceError } = await supabase
      .from("community_spaces")
      .select("id, member_count, moderator_uids")
      .eq("id", space_id)
      .maybeSingle()

    if (spaceError || !space) {
      return NextResponse.json({ error: "Space not found." }, { status: 404 })
    }

    if (action === "join") {
      // Upsert membership row
      const { error: insertError } = await supabase
        .from("community_space_members")
        .upsert(
          { space_id, firebase_uid: uid, role: "member" },
          { onConflict: "space_id,firebase_uid", ignoreDuplicates: true }
        )

      if (insertError) {
        console.error("[spaces POST join]", insertError)
        return NextResponse.json({ error: "Failed to join space." }, { status: 500 })
      }

      // Increment member_count
      const newCount = (space.member_count ?? 0) + 1
      await supabase
        .from("community_spaces")
        .update({ member_count: newCount } as never)
        .eq("id", space_id)

      return NextResponse.json({ is_member: true, member_count: newCount })
    }

    // action === "leave"
    // Check if user is the space owner (first moderator uid)
    const moderators: string[] = space.moderator_uids ?? []
    if (moderators[0] === uid) {
      return NextResponse.json({ error: "Space owner cannot leave." }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from("community_space_members")
      .delete()
      .eq("space_id", space_id)
      .eq("firebase_uid", uid)

    if (deleteError) {
      console.error("[spaces POST leave]", deleteError)
      return NextResponse.json({ error: "Failed to leave space." }, { status: 500 })
    }

    const newCount = Math.max(0, (space.member_count ?? 1) - 1)
    await supabase
      .from("community_spaces")
      .update({ member_count: newCount } as never)
      .eq("id", space_id)

    return NextResponse.json({ is_member: false, member_count: newCount })
  } catch (err) {
    console.error("[spaces POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
