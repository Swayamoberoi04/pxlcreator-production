/**
 * POST /api/presets/[slug]/validate-password
 *
 * Validates a user-supplied password against the preset's unlock_password.
 * On success, records the unlock in user_unlocks and returns access = true.
 *
 * Password is NEVER returned to the client.
 * Requires Firebase Bearer token (user must be signed in).
 */

import { NextRequest, NextResponse }       from "next/server"
import { createAdminClient }              from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }      from "@/lib/account/auth"
import { makeRateLimiter, getClientIp }   from "@/lib/api/rate-limit"

/* One shared limiter instance per server process (10 attempts / 15 min) */
const passwordLimiter = makeRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 })

type Params = { params: Promise<{ slug: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  /* ── Rate limit: 10 attempts / 15 min per IP ── */
  const ip      = getClientIp(req)
  const limited = passwordLimiter.check(`pwd:${ip}`)
  if (limited) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes." },
      { status: 429 }
    )
  }

  /* ── Auth ── */
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  /* ── Input ── */
  let password: string
  try {
    const body = await req.json()
    password   = typeof body?.password === "string" ? body.password.trim() : ""
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }
  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 })
  }

  const { slug } = await params

  const supabase = createAdminClient()

  /* ── Fetch preset (only fields we need — never return password to client) ── */
  const { data: preset, error: fetchErr } = await supabase
    .from("presets")
    .select("id, unlock_password, is_free, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .single()

  if (fetchErr || !preset) {
    return NextResponse.json({ error: "Preset not found." }, { status: 404 })
  }

  if (preset.is_free) {
    return NextResponse.json({ error: "This preset is free — no password needed." }, { status: 400 })
  }

  if (!preset.unlock_password) {
    return NextResponse.json({ error: "Password unlock is not available for this preset." }, { status: 400 })
  }

  /* ── Constant-time comparison to prevent timing attacks ── */
  const correct = timingSafeEqual(password, preset.unlock_password)
  if (!correct) {
    return NextResponse.json({ error: "Incorrect password. Check the YouTube video again." }, { status: 403 })
  }

  /* ── Record unlock (upsert — idempotent) ── */
  const { error: insertErr } = await supabase
    .from("user_unlocks")
    .upsert(
      { firebase_uid: uid, preset_id: preset.id, unlock_method: "password" },
      { onConflict: "firebase_uid,preset_id", ignoreDuplicates: true }
    )

  if (insertErr) {
    console.error("[validate-password] insert error:", insertErr)
    return NextResponse.json({ error: "Failed to record unlock. Please try again." }, { status: 500 })
  }

  return NextResponse.json({ success: true, access: true })
}

/** String comparison that takes the same time regardless of where strings differ. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a dummy comparison so timing is consistent
    let diff = 0
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      diff |= (a.charCodeAt(i) ?? 0) ^ (b.charCodeAt(i) ?? 0)
    }
    return false
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
