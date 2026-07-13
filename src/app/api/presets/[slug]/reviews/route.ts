/**
 * GET  /api/presets/[slug]/reviews  — public, approved reviews only
 * POST /api/presets/[slug]/reviews  — auth required, access-gated
 */

import { NextRequest, NextResponse }    from "next/server"
import { createAdminClient }            from "@/lib/supabase/admin"
import { createServerSupabaseClient }   from "@/lib/supabase/server"
import { getFirebaseUidFromRequest }    from "@/lib/account/auth"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

export const runtime = "nodejs"

type Params = { params: Promise<{ slug: string }> }

const reviewPostLimiter = makeRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 })
const MAX_TEXT = 2000

/* ── GET — public ─────────────────────────────────────────── */

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: preset, error: presetErr } = await supabase
    .from("presets")
    .select("id")
    .eq("slug", slug)
    .maybeSingle()

  if (presetErr || !preset) {
    return NextResponse.json({ error: "Preset not found" }, { status: 404 })
  }

  const { data: reviews, error } = await supabase
    .from("preset_reviews")
    .select("id, rating, title, review_text, created_at, email, is_verified_purchase")
    .eq("preset_id", preset.id)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("[reviews GET]", error.message)
    // Table may not exist yet — return empty rather than 500
    return NextResponse.json({ reviews: [], avgRating: null, count: 0 })
  }

  const count = reviews?.length ?? 0
  const avgRating = count > 0
    ? Math.round((reviews!.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
    : null

  return NextResponse.json({ reviews: reviews ?? [], avgRating, count })
}

/* ── POST — authenticated, access-gated ───────────────────── */

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params

  const ip = getClientIp(req)
  if (reviewPostLimiter.check(`review:${ip}`)) {
    return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 })
  }

  const firebaseUid = await getFirebaseUidFromRequest(req)
  if (!firebaseUid) {
    return NextResponse.json({ error: "Sign in to leave a review." }, { status: 401 })
  }

  let body: { rating?: number; title?: string; review_text?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { rating, title, review_text } = body

  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
    return NextResponse.json({ error: "rating must be 1-5." }, { status: 400 })
  }
  if (title && title.length > 120) {
    return NextResponse.json({ error: "Title must be 120 characters or fewer." }, { status: 400 })
  }
  if (review_text && review_text.length > MAX_TEXT) {
    return NextResponse.json({ error: `Review must be ${MAX_TEXT} characters or fewer.` }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: preset } = await admin
    .from("presets")
    .select("id")
    .eq("slug", slug)
    .maybeSingle()

  if (!preset) {
    return NextResponse.json({ error: "Preset not found." }, { status: 404 })
  }

  /* User must have purchased OR YouTube-unlocked the preset */
  const [{ data: order }, { data: unlock }] = await Promise.all([
    admin
      .from("order_items")
      .select("id, orders!inner(firebase_uid, status)")
      .eq("preset_id", preset.id)
      .eq("orders.firebase_uid", firebaseUid)
      .eq("orders.status", "paid")
      .limit(1)
      .maybeSingle(),
    admin
      .from("user_unlocks")
      .select("id")
      .eq("preset_id", preset.id)
      .eq("firebase_uid", firebaseUid)
      .maybeSingle(),
  ])

  if (!order && !unlock) {
    return NextResponse.json(
      { error: "You must purchase or unlock this preset before reviewing it." },
      { status: 403 }
    )
  }

  const { data: profile } = await admin
    .from("user_profiles")
    .select("email")
    .eq("firebase_uid", firebaseUid)
    .maybeSingle()

  const { data, error } = await admin
    .from("preset_reviews")
    .insert({
      preset_id:            preset.id,
      firebase_uid:         firebaseUid,
      email:                profile?.email ?? "",
      rating,
      title:                title?.trim() || null,
      review_text:          review_text?.trim() || null,
      is_verified_purchase: !!order,
      is_approved:          false,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You have already reviewed this preset." }, { status: 409 })
    }
    console.error("[reviews POST]", error)
    return NextResponse.json({ error: "Failed to submit review." }, { status: 500 })
  }

  return NextResponse.json(
    { review: data, message: "Review submitted - pending moderation." },
    { status: 201 }
  )
}
