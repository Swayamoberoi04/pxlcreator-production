/**
 * POST /api/community/events/[id]/register
 *
 * Register for, or express interest in, a community event.
 * Auth required.
 *
 * Body: { action: "register" | "unregister", interest_level?: "registered" | "interested" }
 *
 * participant_count is maintained by the trg_sync_event_participant_count
 * trigger (migration 047) from real event_registrations rows.
 *
 * This route previously incremented participant_count unconditionally while
 * upserting with ignoreDuplicates — so registering twice inflated the count
 * without creating a row. Duplicates are now a no-op on both the row (unique
 * constraint from migration 013) and the count (trigger fires only on a real
 * INSERT/DELETE).
 *
 * Returns: { is_registered, interest_level, participant_count }
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { ensureProfile } from "@/lib/community/ensureProfile"

const regLimiter = makeRateLimiter({ max: 30, windowMs: 60 * 60 * 1000 })

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

  const { action, interest_level } = body as { action?: string; interest_level?: string }

  if (action !== "register" && action !== "unregister") {
    return NextResponse.json({ error: "action must be 'register' or 'unregister'." }, { status: 400 })
  }
  const level = interest_level === "interested" ? "interested" : "registered"

  try {
    const supabase = createAdminClient()

    const { data: event, error: eventError } = await supabase
      .from("community_events")
      .select("id, status, participant_count, max_participants, registration_mode, visibility")
      .eq("id", eventId)
      .maybeSingle()

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 })
    }

    if (action === "register") {
      // Registration only makes sense for events that actually accept it here.
      if (event.registration_mode === "none") {
        return NextResponse.json({ error: "This event does not take registrations." }, { status: 400 })
      }
      if (event.registration_mode === "external") {
        return NextResponse.json(
          { error: "This event registers on the organiser's own site." },
          { status: 400 }
        )
      }
      if (event.status === "ended" || event.status === "cancelled") {
        return NextResponse.json({ error: "This event is no longer open." }, { status: 400 })
      }

      // A real capacity check against the real current count.
      const { data: existing } = await supabase
        .from("event_registrations")
        .select("id, interest_level")
        .eq("event_id", eventId)
        .eq("firebase_uid", uid)
        .maybeSingle()

      if (!existing && event.max_participants !== null && (event.participant_count ?? 0) >= event.max_participants) {
        return NextResponse.json({ error: "This event is full." }, { status: 409 })
      }

      await ensureProfile(uid)

      if (existing) {
        // Already registered — only the interest level can change. No count
        // change, because no row is created.
        if (existing.interest_level !== level) {
          await supabase
            .from("event_registrations")
            .update({ interest_level: level } as never)
            .eq("id", existing.id)
        }
      } else {
        const { error: insertError } = await supabase
          .from("event_registrations")
          .insert({ event_id: eventId, firebase_uid: uid, interest_level: level })
        // 23505 = unique_violation from a concurrent double-click; the row
        // already exists, which is exactly the desired end state.
        if (insertError && insertError.code !== "23505") {
          console.error("[event register POST]", insertError)
          return NextResponse.json({ error: "Failed to register for event." }, { status: 500 })
        }
      }
    } else {
      const { error: deleteError } = await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", eventId)
        .eq("firebase_uid", uid)

      if (deleteError) {
        console.error("[event unregister POST]", deleteError)
        return NextResponse.json({ error: "Failed to unregister from event." }, { status: 500 })
      }
    }

    // Read the trigger-maintained count back rather than computing it here.
    const { data: refreshed } = await supabase
      .from("community_events")
      .select("participant_count")
      .eq("id", eventId)
      .maybeSingle()

    return NextResponse.json({
      is_registered: action === "register",
      interest_level: action === "register" ? level : null,
      participant_count: refreshed?.participant_count ?? 0,
    })
  } catch (err) {
    console.error("[event register POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
