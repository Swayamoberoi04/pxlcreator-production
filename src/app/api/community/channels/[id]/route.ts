/**
 * GET    /api/community/channels/[id]  — channel detail
 * PATCH  /api/community/channels/[id]  — update channel (owner/moderator only)
 * DELETE /api/community/channels/[id]  — delete channel (owner only)
 *
 * Auth: GET is public; PATCH/DELETE require auth.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

export const runtime = "nodejs"

const patchLimiter = makeRateLimiter({ max: 30, windowMs: 60 * 60 * 1000 })

type Params = { params: Promise<{ id: string }> }

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const uid = await getFirebaseUidFromRequest(req) // optional

  try {
    const supabase = createAdminClient()

    const { data: channel, error } = await supabase
      .from("community_channels")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error("[channels/[id] GET]", error)
      return NextResponse.json({ error: "Failed to fetch channel." }, { status: 500 })
    }
    if (!channel) {
      return NextResponse.json({ error: "Channel not found." }, { status: 404 })
    }

    // Membership check
    let is_member = false
    if (uid) {
      const { data: memberRow } = await supabase
        .from("channel_members")
        .select("role")
        .eq("channel_id", id)
        .eq("firebase_uid", uid)
        .maybeSingle()
      is_member = !!memberRow
    }

    // Owner profile
    const { data: ownerProfile } = await supabase
      .from("community_profiles")
      .select("username, display_name, avatar_url, is_verified")
      .eq("firebase_uid", channel.owner_uid)
      .maybeSingle()

    return NextResponse.json({
      channel: {
        ...channel,
        is_member,
        owner: ownerProfile ?? null,
      },
    })
  } catch (err) {
    console.error("[channels/[id] GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── PATCH ───────────────────────────────────────────────── */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (patchLimiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Fetch channel for permission check
    const { data: channel, error: fetchError } = await supabase
      .from("community_channels")
      .select("owner_uid, moderator_uids")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !channel) {
      return NextResponse.json({ error: "Channel not found." }, { status: 404 })
    }

    const isModerator = (channel.moderator_uids ?? []).includes(uid)
    const isOwner = channel.owner_uid === uid
    if (!isOwner && !isModerator) {
      return NextResponse.json({ error: "Forbidden. Only owners and moderators can update this channel." }, { status: 403 })
    }

    const allowed = ["name", "description", "banner_url", "rules", "tags"] as const
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updates[field] = body[field]
      }
    }

    // Only owner can update moderator_uids
    if (isOwner && Object.prototype.hasOwnProperty.call(body, "moderator_uids")) {
      updates["moderator_uids"] = body["moderator_uids"]
    }

    const { data: updated, error: updateError } = await supabase
      .from("community_channels")
      .update(updates as never)
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) {
      console.error("[channels/[id] PATCH]", updateError)
      return NextResponse.json({ error: "Failed to update channel." }, { status: 500 })
    }

    return NextResponse.json({ channel: updated })
  } catch (err) {
    console.error("[channels/[id] PATCH] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── DELETE ──────────────────────────────────────────────── */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  try {
    const supabase = createAdminClient()

    const { data: channel, error: fetchError } = await supabase
      .from("community_channels")
      .select("owner_uid")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !channel) {
      return NextResponse.json({ error: "Channel not found." }, { status: 404 })
    }
    if (channel.owner_uid !== uid) {
      return NextResponse.json({ error: "Forbidden. Only the channel owner can delete it." }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from("community_channels")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[channels/[id] DELETE]", deleteError)
      return NextResponse.json({ error: "Failed to delete channel." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[channels/[id] DELETE] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
