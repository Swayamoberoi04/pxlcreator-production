/**
 * POST /api/community/events/[id]/submit
 *
 * Submit work to an event challenge.
 * Auth required.
 * Body: { title, description?, media_url, media_type }
 *   Must be registered for the event.
 *   Event status must be "active".
 *   One submission per user per event (UNIQUE constraint).
 * Returns: { submission }
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

const submitLimiter = makeRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 })

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: eventId } = await params

  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (submitLimiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { title, description, media_url, media_type } = body as {
    title?: string
    description?: string
    media_url?: string
    media_type?: string
  }

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title is required." }, { status: 400 })
  }
  if (!media_url || typeof media_url !== "string") {
    return NextResponse.json({ error: "media_url is required." }, { status: 400 })
  }
  if (!media_type || typeof media_type !== "string") {
    return NextResponse.json({ error: "media_type is required." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Fetch event and check status
    const { data: event, error: eventError } = await supabase
      .from("community_events")
      .select("id, status")
      .eq("id", eventId)
      .maybeSingle()

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 })
    }
    if (event.status !== "active") {
      return NextResponse.json({ error: "Submissions are only accepted for active events." }, { status: 400 })
    }

    // Check user is registered
    const { data: registration } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", eventId)
      .eq("firebase_uid", uid)
      .maybeSingle()

    if (!registration) {
      return NextResponse.json({ error: "You must register for the event before submitting." }, { status: 403 })
    }

    // Insert submission
    const { data: submission, error: insertError } = await supabase
      .from("event_submissions")
      .insert({
        event_id: eventId,
        firebase_uid: uid,
        title: title.trim(),
        description: description ?? null,
        media_url,
        media_type,
        vote_count: 0,
        is_winner: false,
        winner_rank: null,
      })
      .select("*")
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "You have already submitted to this event." },
          { status: 409 }
        )
      }
      console.error("[event submit POST] insert", insertError)
      return NextResponse.json({ error: "Failed to submit entry." }, { status: 500 })
    }

    return NextResponse.json({ submission }, { status: 201 })
  } catch (err) {
    console.error("[event submit POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
