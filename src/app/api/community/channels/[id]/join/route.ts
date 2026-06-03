/**
 * POST  /api/community/channels/[id]/join
 *
 * Body: { action: "join" | "leave" }
 *
 * - join: inserts channel_members row, increments channel.member_count
 * - leave: deletes channel_members row, decrements member_count (owner cannot leave)
 *
 * Returns: { is_member: boolean, member_count: number }
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { ensureProfile } from "@/lib/community/ensureProfile"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 30, windowMs: 60 * 60 * 1000 })

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: channelId } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: { action?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { action } = body
  if (action !== "join" && action !== "leave") {
    return NextResponse.json({ error: "action must be 'join' or 'leave'." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Fetch channel
    const { data: channel, error: channelError } = await supabase
      .from("community_channels")
      .select("id, owner_uid, member_count, visibility")
      .eq("id", channelId)
      .maybeSingle()

    if (channelError || !channel) {
      return NextResponse.json({ error: "Channel not found." }, { status: 404 })
    }

    if (action === "join") {
      await ensureProfile(uid)

      // Insert member row (ignore conflict)
      const { error: insertError } = await supabase.from("channel_members").insert({
        channel_id: channelId,
        firebase_uid: uid,
        role: "member",
      })

      if (insertError && insertError.code !== "23505") {
        console.error("[channels/join POST] insert", insertError)
        return NextResponse.json({ error: "Failed to join channel." }, { status: 500 })
      }

      const alreadyMember = insertError?.code === "23505"
      if (!alreadyMember) {
        // Increment member_count
        await supabase
          .from("community_channels")
          .update({ member_count: (channel.member_count ?? 0) + 1 })
          .eq("id", channelId)
      }
    } else {
      // Leave — owner cannot leave
      if (channel.owner_uid === uid) {
        return NextResponse.json(
          { error: "Channel owner cannot leave. Transfer ownership or delete the channel." },
          { status: 403 }
        )
      }

      const { error: deleteError } = await supabase
        .from("channel_members")
        .delete()
        .eq("channel_id", channelId)
        .eq("firebase_uid", uid)

      if (deleteError) {
        console.error("[channels/join POST] delete", deleteError)
        return NextResponse.json({ error: "Failed to leave channel." }, { status: 500 })
      }

      // Decrement member_count
      await supabase
        .from("community_channels")
        .update({ member_count: Math.max(0, (channel.member_count ?? 0) - 1) })
        .eq("id", channelId)
    }

    // Return fresh member_count
    const { data: refreshed } = await supabase
      .from("community_channels")
      .select("member_count")
      .eq("id", channelId)
      .maybeSingle()

    return NextResponse.json({
      is_member: action === "join",
      member_count: refreshed?.member_count ?? 0,
    })
  } catch (err) {
    console.error("[channels/join POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
