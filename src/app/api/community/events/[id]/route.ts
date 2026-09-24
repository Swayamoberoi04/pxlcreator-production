/**
 * GET/PATCH/DELETE /api/community/events/[id]
 *
 * GET: public events are visible to anyone; a private event 404s to everyone
 * but its organiser (not 403 — existence isn't confirmed by status code).
 * PATCH/DELETE: organiser-only, enforced against the verified Firebase UID
 * (Firebase auth, not Supabase Auth — see migration 047's RLS note).
 *
 * DELETE cascades event_registrations/event_views via FK.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { Validator } from "@/lib/api/validate"
import { guardMutation } from "@/lib/community/guard"

export const runtime = "nodejs"

type Params = { params: Promise<{ id: string }> }

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const uid = await getFirebaseUidFromRequest(req)

  try {
    const supabase = createAdminClient()
    const { data: event, error } = await supabase
      .from("community_events")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error || !event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 })
    }
    const isOwner = uid === event.organiser_uid
    if (event.visibility === "private" && !isOwner) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 })
    }

    // Only a PXL-run event has a member organiser to show.
    let organiser = null
    if (event.source === "pxl") {
      const { data: profile } = await supabase
        .from("community_profiles")
        .select("username, display_name, avatar_url, is_verified")
        .eq("firebase_uid", event.organiser_uid)
        .maybeSingle()
      organiser = profile ?? null
    }

    let is_registered = false
    let interest_level: string | null = null
    if (uid) {
      const { data: registration } = await supabase
        .from("event_registrations")
        .select("interest_level")
        .eq("event_id", id)
        .eq("firebase_uid", uid)
        .maybeSingle()
      is_registered = !!registration
      interest_level = registration?.interest_level ?? null
    }

    return NextResponse.json({ event: { ...event, organiser, is_registered, interest_level, is_owner: isOwner } })
  } catch (err) {
    console.error("[events/[id] GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── PATCH ───────────────────────────────────────────────── */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const limited = guardMutation(req, uid, "event-edit")
  if (limited) return limited

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const v = new Validator(body)
  if (body.title !== undefined) v.maxLen("title", 150)
  if (body.description !== undefined) v.maxLen("description", 3000)
  if (body.status !== undefined) v.oneOf("status", ["upcoming", "active", "ended", "cancelled"])
  if (body.attendance_mode !== undefined) v.oneOf("attendance_mode", ["online", "offline", "hybrid"])
  if (body.registration_mode !== undefined) v.oneOf("registration_mode", ["internal", "external", "none"])
  if (body.visibility !== undefined) v.oneOf("visibility", ["public", "private"])
  if (body.registration_url) v.url("registration_url")
  if (v.hasErrors()) {
    return NextResponse.json({ errors: v.errors() }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: existing, error: fetchError } = await supabase
      .from("community_events")
      .select("id, organiser_uid, registration_mode, registration_url")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 })
    }
    if (existing.organiser_uid !== uid) {
      return NextResponse.json({ error: "You can only manage events you organise." }, { status: 403 })
    }

    // Don't let an edit leave an external-registration event with no destination.
    const nextMode = (body.registration_mode as string) ?? existing.registration_mode
    const nextUrl = body.registration_url !== undefined
      ? (body.registration_url as string | null)
      : existing.registration_url
    if (nextMode === "external" && !nextUrl) {
      return NextResponse.json(
        { error: "An externally-registered event needs a registration_url." },
        { status: 400 }
      )
    }

    const allowed = [
      "title", "description", "event_type", "banner_url", "start_date", "end_date",
      "location", "attendance_mode", "registration_mode", "registration_url", "tags",
      "visibility", "max_participants", "rules", "status", "organizer_name", "organizer_url",
    ] as const
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = body[field]
    }
    if (body.attendance_mode !== undefined) {
      updates.is_online = body.attendance_mode !== "offline"
    }

    const { data: updated, error: updateError } = await supabase
      .from("community_events")
      .update(updates as never)
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) {
      console.error("[events/[id] PATCH]", updateError)
      return NextResponse.json({ error: "Failed to update event." }, { status: 500 })
    }

    return NextResponse.json({ event: updated })
  } catch (err) {
    console.error("[events/[id] PATCH] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── DELETE ──────────────────────────────────────────────── */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const limited = guardMutation(req, uid, "event-edit")
  if (limited) return limited

  try {
    const supabase = createAdminClient()
    const { data: existing, error: fetchError } = await supabase
      .from("community_events")
      .select("id, organiser_uid")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 })
    }
    if (existing.organiser_uid !== uid) {
      return NextResponse.json({ error: "You can only delete events you organise." }, { status: 403 })
    }

    const { error: deleteError } = await supabase.from("community_events").delete().eq("id", id)
    if (deleteError) {
      console.error("[events/[id] DELETE]", deleteError)
      return NextResponse.json({ error: "Failed to delete event." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[events/[id] DELETE] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
