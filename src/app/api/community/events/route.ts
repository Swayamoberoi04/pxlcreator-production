/**
 * GET  /api/community/events — event discovery
 * POST /api/community/events — create an event (authenticated; the creator
 *                              becomes its organiser and can manage it)
 *
 * GET query params:
 *   ?status=upcoming|active|ended|cancelled  (default: upcoming)
 *   ?upcoming=true   — everything starting from now, regardless of status
 *   ?q=              — title/description search
 *   ?event_type=     — challenge|contest|meetup|workshop|webinar
 *   ?attendance=     — online|offline|hybrid
 *   ?location=       — matches location text
 *   ?tags=           — repeatable, matches ANY (real overlap)
 *   ?from= ?to=      — ISO dates bounding start_date
 *   ?source=         — pxl|external
 *   ?page=1 ?limit=20
 *
 * Only visibility='public' events are ever listed; a private event is
 * reachable solely via its direct link by its organiser.
 *
 * Auth: GET optional (is_registered needs auth); POST requires auth.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { Validator } from "@/lib/api/validate"
import { ensureProfile } from "@/lib/community/ensureProfile"

export const runtime = "nodejs"

const createLimiter = makeRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 })

const EVENT_TYPES = ["challenge", "contest", "meetup", "workshop", "webinar"]
const ATTENDANCE_MODES = ["online", "offline", "hybrid"]
const REGISTRATION_MODES = ["internal", "external", "none"]

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const uid = await getFirebaseUidFromRequest(req) // optional

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const upcomingOnly = searchParams.get("upcoming") === "true"
  const q = (searchParams.get("q") ?? "").trim().replace(/[,()]/g, "")
  const eventType = searchParams.get("event_type")
  const attendance = searchParams.get("attendance")
  const location = searchParams.get("location")
  const source = searchParams.get("source")
  const tags = searchParams.getAll("tags").filter(Boolean)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20))
  const offset = (page - 1) * limit

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from("community_events")
      .select("*", { count: "exact" })
      .eq("visibility", "public")

    if (upcomingOnly) {
      query = query.gte("start_date", new Date().toISOString()).neq("status", "cancelled")
    } else if (status) {
      query = query.eq("status", status)
    }
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    if (eventType) query = query.eq("event_type", eventType)
    if (attendance) query = query.eq("attendance_mode", attendance)
    if (source) query = query.eq("source", source)
    if (location) query = query.ilike("location", `%${location}%`)
    if (tags.length) query = query.overlaps("tags", tags)
    if (from) query = query.gte("start_date", from)
    if (to) query = query.lte("start_date", to)

    query = query.order("start_date", { ascending: true }).range(offset, offset + limit - 1)

    const { data: events, error, count } = await query
    if (error) {
      console.error("[events GET]", error)
      return NextResponse.json({ error: "Failed to load events." }, { status: 500 })
    }
    if (!events || events.length === 0) {
      return NextResponse.json({ events: [], total: count ?? 0, page, limit, hasMore: false })
    }

    // Organiser profiles — only for PXL-run events. An external event's
    // organiser is described by organizer_name/organizer_url and must never
    // be dressed up as a member profile.
    const organiserUids = [...new Set(events.filter((e) => e.source === "pxl").map((e) => e.organiser_uid))]
    let organiserMap = new Map<string, Record<string, unknown>>()
    if (organiserUids.length > 0) {
      const { data: profiles } = await supabase
        .from("community_profiles")
        .select("firebase_uid, username, display_name, avatar_url, is_verified")
        .in("firebase_uid", organiserUids)
      organiserMap = new Map((profiles ?? []).map((p) => [p.firebase_uid, p]))
    }

    // The viewer's own registrations — real rows, never assumed.
    let registrationMap = new Map<string, string>()
    if (uid) {
      const { data: registrations } = await supabase
        .from("event_registrations")
        .select("event_id, interest_level")
        .eq("firebase_uid", uid)
        .in("event_id", events.map((e) => e.id))
      registrationMap = new Map((registrations ?? []).map((r) => [r.event_id, r.interest_level]))
    }

    const enriched = events.map((e) => ({
      ...e,
      organiser: e.source === "pxl" ? (organiserMap.get(e.organiser_uid) ?? null) : null,
      is_registered: registrationMap.has(e.id),
      interest_level: registrationMap.get(e.id) ?? null,
      is_owner: uid === e.organiser_uid,
    }))

    return NextResponse.json({
      events: enriched,
      total: count ?? 0,
      page,
      limit,
      hasMore: offset + limit < (count ?? 0),
    })
  } catch (err) {
    console.error("[events GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── POST ────────────────────────────────────────────────── */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (createLimiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const v = new Validator(body)
  v.required("title").maxLen("title", 150)
    .required("description").maxLen("description", 3000)
    .required("start_date")
  if (body.event_type !== undefined) v.oneOf("event_type", EVENT_TYPES)
  if (body.attendance_mode !== undefined) v.oneOf("attendance_mode", ATTENDANCE_MODES)
  if (body.registration_mode !== undefined) v.oneOf("registration_mode", REGISTRATION_MODES)
  if (body.visibility !== undefined) v.oneOf("visibility", ["public", "private"])
  if (body.registration_url) v.url("registration_url")
  if (body.organizer_url) v.url("organizer_url")
  if (v.hasErrors()) {
    return NextResponse.json({ errors: v.errors() }, { status: 400 })
  }

  const {
    title, description, event_type, banner_url, start_date, end_date, location,
    attendance_mode, registration_mode, registration_url, tags, visibility,
    max_participants, rules, source, organizer_name, organizer_url,
  } = body as Record<string, never> & {
    title: string; description: string; event_type?: string; banner_url?: string
    start_date: string; end_date?: string; location?: string
    attendance_mode?: string; registration_mode?: string; registration_url?: string
    tags?: string[]; visibility?: string; max_participants?: number; rules?: string
    source?: string; organizer_name?: string; organizer_url?: string
  }

  const mode = registration_mode ?? "internal"
  if (mode === "external" && !registration_url) {
    return NextResponse.json(
      { error: "An externally-registered event needs a registration_url." },
      { status: 400 }
    )
  }

  const eventSource = source === "external" ? "external" : "pxl"
  if (eventSource === "external" && !organizer_name) {
    return NextResponse.json(
      { error: "An external event must name its organiser (organizer_name) so it is never shown as PXL-run." },
      { status: 400 }
    )
  }

  const attendance = attendance_mode ?? "online"

  try {
    const supabase = createAdminClient()
    await ensureProfile(uid)

    const { data: event, error: insertError } = await supabase
      .from("community_events")
      .insert({
        organiser_uid: uid,
        title,
        description,
        event_type: event_type ?? "meetup",
        banner_url: banner_url ?? null,
        start_date,
        end_date: end_date ?? null,
        location: location ?? null,
        is_online: attendance !== "offline",
        attendance_mode: attendance,
        registration_mode: mode,
        registration_url: registration_url ?? null,
        tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
        visibility: visibility === "private" ? "private" : "public",
        max_participants: typeof max_participants === "number" ? max_participants : null,
        rules: rules ?? null,
        source: eventSource,
        organizer_name: organizer_name ?? null,
        organizer_url: organizer_url ?? null,
        status: new Date(start_date) > new Date() ? "upcoming" : "active",
      })
      .select("*")
      .single()

    if (insertError || !event) {
      console.error("[events POST] insert", insertError)
      return NextResponse.json({ error: "Failed to create event." }, { status: 500 })
    }

    return NextResponse.json({ event }, { status: 201 })
  } catch (err) {
    console.error("[events POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
