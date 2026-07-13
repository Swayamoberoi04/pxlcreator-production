/**
 * POST /api/preset/download
 *
 * Unified, secure download endpoint for all presets.
 *
 * Rules:
 *   • Free presets  — return Drive URL immediately (no password required)
 *   • Paid presets  — validate password OR verify existing unlock/purchase,
 *                     then return Drive URL
 *   • NA URLs       — return 503 "Coming soon"
 *   • Passwords and Drive URLs are NEVER sent to the browser from any other path
 *
 * Body: { presetName: string, password?: string }
 *
 * Returns:
 *   200  { url: string }
 *   400  { error: string }   — bad input or missing password
 *   401  { error: string }   — auth required for paid presets
 *   403  { error: string }   — wrong password
 *   404  { error: string }   — preset not in registry
 *   429  { error: string }   — rate limited
 *   503  { error: string }   — file not yet available
 */

import { NextRequest, NextResponse }         from "next/server"
import { getSecurePreset, timingSafeEqual }  from "@/lib/presets/secure-registry"
import { getFirebaseUidFromRequest }          from "@/lib/account/auth"
import { makeRateLimiter, getClientIp }       from "@/lib/api/rate-limit"
import { createAdminClient }                  from "@/lib/supabase/admin"

const passwordLimiter = makeRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 })

export async function POST(req: NextRequest) {
  /* ── Parse body ── */
  let presetName: string
  let password: string | undefined

  try {
    const body = await req.json()
    presetName = typeof body?.presetName === "string" ? body.presetName.trim() : ""
    password   = typeof body?.password   === "string" ? body.password.trim()   : undefined
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  if (!presetName) {
    return NextResponse.json({ error: "presetName is required." }, { status: 400 })
  }

  /* ── Registry lookup (server-only — Drive URL and password never leave this scope) ── */
  const securePreset = getSecurePreset(presetName)
  if (!securePreset) {
    return NextResponse.json({ error: "Preset not found." }, { status: 404 })
  }

  /* ── Coming soon ── */
  if (securePreset.downloadUrl === "NA") {
    return NextResponse.json(
      { error: "This preset is coming soon. Check back later." },
      { status: 503 }
    )
  }

  /* ── Free preset — no password or unlock check needed ── */
  if (securePreset.isFree) {
    return NextResponse.json({ url: securePreset.downloadUrl })
  }

  /* ── Paid preset — auth required ── */
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const supabase = createAdminClient()

  /* Resolve Supabase preset_id from slug (needed for user_unlocks foreign key) */
  const { data: dbPreset } = await supabase
    .from("presets")
    .select("id")
    .eq("slug", securePreset.slug)
    .maybeSingle()

  const presetId = dbPreset?.id as string | undefined

  /* ── Check existing unlock (password previously validated) ── */
  if (presetId) {
    const { data: existingUnlock } = await supabase
      .from("user_unlocks")
      .select("id")
      .eq("firebase_uid", uid)
      .eq("preset_id", presetId)
      .maybeSingle()

    if (existingUnlock) {
      return NextResponse.json({ url: securePreset.downloadUrl })
    }

    /* Check paid orders */
    const { data: orderItem } = await supabase
      .from("order_items")
      .select("id, order:orders!inner(firebase_uid, status)")
      .eq("preset_id", presetId)
      .eq("order.firebase_uid", uid)
      .eq("order.status", "paid")
      .maybeSingle()

    if (orderItem) {
      return NextResponse.json({ url: securePreset.downloadUrl })
    }
  }

  /* ── Password required but not provided ── */
  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 })
  }

  /* ── Rate limit password attempts ── */
  const ip      = getClientIp(req)
  const limited = passwordLimiter.check(`pwd:${ip}:${securePreset.slug}`)
  if (limited) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes." },
      { status: 429 }
    )
  }

  /* ── Validate password (timing-safe) ── */
  if (!securePreset.password || !timingSafeEqual(password, securePreset.password)) {
    return NextResponse.json(
      { error: "Incorrect password. Check the YouTube video again." },
      { status: 403 }
    )
  }

  /* ── Record unlock in DB (upsert — idempotent) ── */
  if (presetId) {
    await supabase
      .from("user_unlocks")
      .upsert(
        { firebase_uid: uid, preset_id: presetId, unlock_method: "password" },
        { onConflict: "firebase_uid,preset_id", ignoreDuplicates: true }
      )
  }

  return NextResponse.json({ url: securePreset.downloadUrl })
}
