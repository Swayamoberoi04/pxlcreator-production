/**
 * POST /api/community/events/[id]/view
 *
 * Logs a real page view; view_count is synced by trg_sync_event_view_count
 * (migration 047), never a client-supplied number. A page-view count, not a
 * unique-visitor count. The organiser's own visits are not counted.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 180, windowMs: 60 * 60 * 1000 })

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: eventId } = await params
  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  const uid = await getFirebaseUidFromRequest(req)

  try {
    const supabase = createAdminClient()
    const { data: event } = await supabase
      .from("community_events")
      .select("id, organiser_uid, visibility")
      .eq("id", eventId)
      .maybeSingle()
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 })

    if (uid === event.organiser_uid) {
      return NextResponse.json({ counted: false })
    }

    const { error } = await supabase.from("event_views").insert({ event_id: eventId, viewer_uid: uid ?? null })
    if (error) {
      console.error("[events/[id]/view POST]", error)
      return NextResponse.json({ error: "Failed to log view." }, { status: 500 })
    }

    return NextResponse.json({ counted: true })
  } catch (err) {
    console.error("[events/[id]/view POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
