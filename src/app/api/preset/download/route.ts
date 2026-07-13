/**
 * POST /api/preset/download
 *
 * Unified, secure download endpoint for all presets.
 *
 * Body: { slug: string, password?: string }
 * Returns 200 { url } on success, 4xx/5xx { error, received? } on failure.
 */

import { NextRequest, NextResponse }         from "next/server"
import { getSecurePreset, timingSafeEqual }  from "@/lib/presets/secure-registry"
import { getFirebaseUidFromRequest }          from "@/lib/account/auth"
import { makeRateLimiter, getClientIp }       from "@/lib/api/rate-limit"
import { createAdminClient }                  from "@/lib/supabase/admin"

const passwordLimiter = makeRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 })

export async function POST(req: NextRequest) {

  /* ── Parse body ── */
  let slug: string
  let password: string | undefined
  let rawBody: unknown

  try {
    rawBody  = await req.json()
    const body = rawBody as Record<string, unknown>
    slug     = typeof body?.slug       === "string" ? body.slug.trim()       :
               typeof body?.presetName === "string" ? body.presetName.trim() : ""
    password = typeof body?.password   === "string" ? body.password.trim()   : undefined
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  console.log("[preset/download] RECEIVED BODY:", JSON.stringify(rawBody))
  console.log("[preset/download] PARSED SLUG:", JSON.stringify(slug))

  if (!slug) {
    return NextResponse.json(
      { error: "slug is required.", received: rawBody },
      { status: 400 }
    )
  }

  /* ── Registry lookup ── */
  const securePreset = getSecurePreset(slug)

  console.log("[preset/download] REGISTRY LOOKUP:", slug, "->", securePreset ? `FOUND: ${securePreset.title}` : "NOT FOUND")

  if (!securePreset) {
    return NextResponse.json(
      { error: "Preset not found.", received_slug: slug },
      { status: 404 }
    )
  }

  /* ── Coming soon ── */
  if (securePreset.downloadUrl === "NA") {
    return NextResponse.json(
      { error: "This preset is coming soon. Check back later." },
      { status: 503 }
    )
  }

  /* ── Free preset — no auth or password needed ── */
  if (securePreset.isFree) {
    console.log("[preset/download] FREE PRESET — returning URL for:", securePreset.title)
    return NextResponse.json({ url: securePreset.downloadUrl })
  }

  /* ── Paid preset — auth required ── */
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    )
  }

  const supabase = createAdminClient()

  /* Resolve Supabase preset_id from slug */
  const { data: dbPreset } = await supabase
    .from("presets")
    .select("id")
    .eq("slug", securePreset.slug)
    .maybeSingle()

  const presetId = dbPreset?.id as string | undefined
  console.log("[preset/download] SUPABASE preset_id for slug", securePreset.slug, "->", presetId ?? "NOT FOUND IN DB")

  /* Check existing unlock */
  if (presetId) {
    const { data: existingUnlock } = await supabase
      .from("user_unlocks")
      .select("id")
      .eq("firebase_uid", uid)
      .eq("preset_id", presetId)
      .maybeSingle()

    if (existingUnlock) {
      console.log("[preset/download] ALREADY UNLOCKED — returning URL")
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
      console.log("[preset/download] PAID ORDER — returning URL")
      return NextResponse.json({ url: securePreset.downloadUrl })
    }
  }

  /* ── Password required but not provided ── */
  if (!password) {
    return NextResponse.json(
      { error: "Password is required." },
      { status: 400 }
    )
  }

  /* ── Rate limit ── */
  const ip      = getClientIp(req)
  const limited = passwordLimiter.check(`pwd:${ip}:${securePreset.slug}`)
  if (limited) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes." },
      { status: 429 }
    )
  }

  /* ── Validate password (timing-safe) ── */
  console.log("[preset/download] VALIDATING PASSWORD for:", securePreset.title)
  if (!securePreset.password || !timingSafeEqual(password, securePreset.password)) {
    return NextResponse.json(
      { error: "Incorrect password. Check the YouTube video again." },
      { status: 403 }
    )
  }

  /* ── Record unlock ── */
  if (presetId) {
    await supabase
      .from("user_unlocks")
      .upsert(
        { firebase_uid: uid, preset_id: presetId, unlock_method: "password" },
        { onConflict: "firebase_uid,preset_id", ignoreDuplicates: true }
      )
  }

  console.log("[preset/download] PASSWORD VALID — returning URL for:", securePreset.title)
  return NextResponse.json({ url: securePreset.downloadUrl })
}
