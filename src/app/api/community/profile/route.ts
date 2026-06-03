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

  const supabase = createAdminClient()

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
    "roles", "skill_level", "availability", "username",
  ] as const

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = body[field]
    }
  }

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
