/**
 * POST /api/community/events/[id]/register
 *
 * Register or unregister for a community event.
 * Auth required.
 * Body: { action: "register" | "unregister" }
 *   register:   insert event_registrations row, increment community_events.participant_count
 *   unregister: delete row, decrement participant_count
 * Returns: { is_registered, participant_count }
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

const regLimiter = makeRateLimiter({ max: 20, windowMs: 60 * 60 * 1000 })

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: eventId } = await params

  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (regLimiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { action } = body as { action?: string }

  if (action !== "register" && action !== "unregister") {
    return NextResponse.json({ error: "action must be 'register' or 'unregister'." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Fetch event
    const { data: event, error: eventError } = await supabase
      .from("community_events")
      .select("id, status, participant_count")
      .eq("id", eventId)
      .maybeSingle()

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 })
    }

    if (action === "register") {
      // Upsert registration
      const { error: insertError } = await supabase
        .from("event_registrations")
        .upsert(
          { event_id: eventId, firebase_uid: uid },
          { onConflict: "event_id,firebase_uid", ignoreDuplicates: true }
        )

      if (insertError) {
        console.error("[event register POST]", insertError)
        return NextResponse.json({ error: "Failed to register for event." }, { status: 500 })
      }

      const newCount = (event.participant_count ?? 0) + 1
      await supabase
        .from("community_events")
        .update({ participant_count: newCount } as never)
        .eq("id", eventId)

      return NextResponse.json({ is_registered: true, participant_count: newCount })
    }

    // Unregister
    const { error: deleteError } = await supabase
      .from("event_registrations")
      .delete()
      .eq("event_id", eventId)
      .eq("firebase_uid", uid)

    if (deleteError) {
      console.error("[event unregister POST]", deleteError)
      return NextResponse.json({ error: "Failed to unregister from event." }, { status: 500 })
    }

    const newCount = Math.max(0, (event.participant_count ?? 1) - 1)
    await supabase
      .from("community_events")
      .update({ participant_count: newCount } as never)
      .eq("id", eventId)

    return NextResponse.json({ is_registered: false, participant_count: newCount })
  } catch (err) {
    console.error("[event register POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
