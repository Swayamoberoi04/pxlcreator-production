/**
 * GET  /api/community/profile  — fetch own community profile (auto-creates if missing)
 * PUT  /api/community/profile  — update own community profile
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { Validator } from "@/lib/api/validate"
import { ensureProfile } from "@/lib/community/ensureProfile"

export const runtime = "nodejs"

const putLimiter = makeRateLimiter({ max: 30, windowMs: 60 * 60 * 1000 })

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  try {
    const profile = await ensureProfile(uid)
    if (!profile) {
      return NextResponse.json({ error: "Failed to load profile." }, { status: 500 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("community_profiles")
      .select("*")
      .eq("firebase_uid", uid)
      .single()

    if (error) {
      console.error("[community/profile GET]", error)
      return NextResponse.json({ error: "Failed to fetch profile." }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch (err) {
    console.error("[community/profile GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── PUT ─────────────────────────────────────────────────── */
export async function PUT(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (putLimiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const v = new Validator(body)
  v.maxLen("display_name", 60)
  v.maxLen("bio", 500)
  if (v.hasErrors()) {
    return NextResponse.json({ errors: v.errors() }, { status: 400 })
  }

  // Username validation if provided
  const username = body.username as string | undefined
  if (username !== undefined) {
    if (typeof username !== "string" || !/^[a-z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3-30 characters: lowercase letters, numbers, underscores only." },
        { status: 400 }
      )
    }
  }

  // Visibility must be one of the three states the DB constraint allows.
  if (body.visibility !== undefined) {
    if (!["public", "followers", "private"].includes(body.visibility as string)) {
      return NextResponse.json(
        { error: "visibility must be 'public', 'followers' or 'private'." },
        { status: 400 }
      )
    }
  }

  // roles / style_tags must be arrays of strings; anything else is rejected
  // rather than silently written, so a bad client can't corrupt discovery.
  for (const field of ["roles", "style_tags", "skills"] as const) {
    const value = body[field]
    if (value === undefined) continue
    if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
      return NextResponse.json({ error: `${field} must be an array of strings.` }, { status: 400 })
    }
    if (value.length > 20) {
      return NextResponse.json({ error: `${field} allows at most 20 entries.` }, { status: 400 })
    }
  }

  const supabase = createAdminClient()

  // roles and style_tags must come from the live creator_tags vocabulary.
  for (const [field, kind] of [["roles", "role"], ["style_tags", "style"]] as const) {
    const value = body[field] as string[] | undefined
    if (!value || value.length === 0) continue
    const { data: known, error: tagError } = await supabase
      .from("creator_tags")
      .select("id")
      .eq("kind", kind)
      .eq("is_active", true)
      .in("id", value)
    // Table absent = migration 043 not applied yet; skip validation rather
    // than reject every tag the user picks.
    if (tagError) continue
    const knownIds = new Set((known ?? []).map((t: { id: string }) => t.id))
    const unknown = value.filter((v) => !knownIds.has(v))
    if (unknown.length > 0) {
      return NextResponse.json(
        { error: `Unknown ${field}: ${unknown.join(", ")}` },
        { status: 400 }
      )
    }
  }

  // Check username uniqueness if changing it
  if (username) {
    const { data: conflict } = await supabase
      .from("community_profiles")
      .select("id, firebase_uid")
      .eq("username", username)
      .maybeSingle()

    if (conflict && conflict.firebase_uid !== uid) {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 })
    }
  }

  const allowed = [
    "display_name", "bio", "avatar_url", "banner_url",
    "location_city", "location_country", "website",
    "instagram_url", "youtube_url", "behance_url", "portfolio_url",
    "roles", "style_tags", "skills", "skill_level", "availability",
    "visibility", "username",
  ] as const

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = body[field]
    }
  }

  // The update below matches by firebase_uid. Without a row it matched zero
  // rows and .single() turned that into a 500 — a signed-in member who saves
  // before the row exists (GET creates it) got "Failed to update profile".
  await ensureProfile(uid)

  const { data, error } = await supabase
    .from("community_profiles")
    .update(updates as never)
    .eq("firebase_uid", uid)
    .select("*")
    .single()

  if (error) {
    console.error("[community/profile PUT]", error)
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}
