/**
 * GET  /api/community/collab-requests  — list collab requests
 * POST /api/community/collab-requests  — send a collab request
 *
 * GET query params: ?type=sent|received (default: received)
 *   Auth required. Joins requester/recipient profile.
 *
 * POST body: { recipient_uid, collab_type, role_needed, message, budget?, project_brief? }
 *   Auth required. Cannot send to self.
 *   Rate limit: 10 per hour per user.
 *   Sends community_notification type "connection_req".
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

const sendLimiter = makeRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 })

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") === "sent" ? "sent" : "received"

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from("collaboration_requests")
      .select("*")
      .order("created_at", { ascending: false })

    if (type === "sent") {
      query = query.eq("requester_uid", uid)
    } else {
      query = query.eq("recipient_uid", uid)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error("[collab-requests GET]", error)
      return NextResponse.json({ error: "Failed to fetch requests." }, { status: 500 })
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({ requests: [] })
    }

    // Collect UIDs to fetch profiles for
    const uidsToFetch = new Set<string>()
    for (const r of requests) {
      uidsToFetch.add(r.requester_uid)
      uidsToFetch.add(r.recipient_uid)
    }

    const { data: profiles } = await supabase
      .from("community_profiles")
      .select("firebase_uid, username, display_name, avatar_url, is_verified")
      .in("firebase_uid", [...uidsToFetch])

    const profileMap = new Map(
      (profiles ?? []).map((p: { firebase_uid: string }) => [p.firebase_uid, p])
    )

    const enriched = requests.map((r: Record<string, unknown>) => ({
      ...r,
      requester: profileMap.get(r.requester_uid as string) ?? null,
      recipient: profileMap.get(r.recipient_uid as string) ?? null,
    }))

    return NextResponse.json({ requests: enriched })
  } catch (err) {
    console.error("[collab-requests GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── POST ────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (sendLimiter.check(uid)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { recipient_uid, collab_type, role_needed, message, budget, project_brief } = body as {
    recipient_uid?: string
    collab_type?: string
    role_needed?: string
    message?: string
    budget?: number
    project_brief?: string
  }

  if (!recipient_uid || typeof recipient_uid !== "string") {
    return NextResponse.json({ error: "recipient_uid is required." }, { status: 400 })
  }
  if (recipient_uid === uid) {
    return NextResponse.json({ error: "You cannot send a collab request to yourself." }, { status: 400 })
  }

  const validTypes = ["paid_work", "collaboration", "internship", "team_building"]
  if (!collab_type || !validTypes.includes(collab_type)) {
    return NextResponse.json({ error: `collab_type must be one of: ${validTypes.join(", ")}.` }, { status: 400 })
  }

  if (!role_needed || typeof role_needed !== "string" || role_needed.trim().length === 0) {
    return NextResponse.json({ error: "role_needed is required." }, { status: 400 })
  }

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required." }, { status: 400 })
  }
  if (message.length < 10 || message.length > 1000) {
    return NextResponse.json({ error: "message must be between 10 and 1000 characters." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Insert collab request
    const { data: request, error: insertError } = await supabase
      .from("collaboration_requests")
      .insert({
        requester_uid: uid,
        recipient_uid,
        collab_type,
        role_needed: role_needed.trim(),
        message: message.trim(),
        budget: budget != null ? String(budget) : null,
        project_brief: project_brief ?? null,
        status: "pending",
      })
      .select("*")
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "You already sent a collab request of this type to this user." },
          { status: 409 }
        )
      }
      console.error("[collab-requests POST] insert", insertError)
      return NextResponse.json({ error: "Failed to send request." }, { status: 500 })
    }

    // Send notification to recipient
    await supabase.from("community_notifications").insert({
      recipient_uid,
      actor_uid:     uid,
      type:          "connection_req",
      title:         "New collaboration request",
      body:          `You received a ${collab_type.replace(/_/g, " ")} request.`,
    }).then(() => { /* sent */ }).then(undefined, () => null)

    return NextResponse.json({ request }, { status: 201 })
  } catch (err) {
    console.error("[collab-requests POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
