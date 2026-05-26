/**
 * POST /api/reviews
 *
 * Submit a review for a preset.
 * Rules:
 *   - User must be signed in (verified via Bearer token)
 *   - User must have a paid order containing this preset (verified purchase)
 *   - One review per user per preset (DB UNIQUE constraint)
 *
 * Body: { preset_id, rating (1-5), review_text? }
 *
 * Requires:  Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse }     from "next/server"
import { createAdminClient }             from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }     from "@/lib/account/auth"
import { makeRateLimiter, getClientIp }  from "@/lib/api/rate-limit"

export const runtime = "nodejs"

// 5 review submissions per hour per IP — prevents spam flooding
const reviewLimiter = makeRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 })

const MAX_REVIEW_TEXT = 2000   // characters

export async function POST(req: NextRequest) {
  /* ── Rate limit ── */
  const ip = getClientIp(req)
  if (reviewLimiter.check(ip)) {
    return NextResponse.json(
      { error: "Too many review submissions. Please wait before trying again." },
      { status: 429 }
    )
  }

  /* ── Auth ── */
  const firebaseUid = await getFirebaseUidFromRequest(req)
  if (!firebaseUid) {
    return NextResponse.json(
      { error: "You must be signed in to submit a review." },
      { status: 401 }
    )
  }

  /* ── Body ── */
  let body: { preset_id?: string; rating?: number; review_text?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { preset_id, rating, review_text } = body

  if (!preset_id || typeof preset_id !== "string") {
    return NextResponse.json({ error: "preset_id is required." }, { status: 400 })
  }
  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
    return NextResponse.json({ error: "rating must be a whole number between 1 and 5." }, { status: 400 })
  }
  if (review_text && String(review_text).length > MAX_REVIEW_TEXT) {
    return NextResponse.json(
      { error: `Review text must be ${MAX_REVIEW_TEXT} characters or fewer.` },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  /* ── Verified purchase check ── */
  /* Look for a paid order that contains this preset for this user */
  const { data: purchaseCheck } = await supabase
    .from("order_items")
    .select(`
      id,
      orders!inner ( firebase_uid, status )
    `)
    .eq("preset_id", preset_id)
    .eq("orders.firebase_uid", firebaseUid)
    .eq("orders.status", "paid")
    .limit(1)
    .maybeSingle()

  const isVerifiedPurchase = !!purchaseCheck

  /* ── Get email for snapshot ── */
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("email")
    .eq("firebase_uid", firebaseUid)
    .maybeSingle()

  const email = profile?.email ?? ""

  /* ── Insert review ── */
  const { data, error } = await supabase
    .from("preset_reviews")
    .insert({
      preset_id,
      firebase_uid:          firebaseUid,
      email,
      rating,
      review_text:           review_text?.trim() || null,
      is_verified_purchase:  isVerifiedPurchase,
      is_approved:           false,   // admin must approve
    })
    .select()
    .single()

  if (error) {
    /* Unique constraint = already reviewed */
    if (error.code === "23505") {
      return NextResponse.json({ error: "You have already reviewed this preset" }, { status: 409 })
    }
    console.error("[reviews POST]", error)
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 })
  }

  return NextResponse.json({ review: data, message: "Review submitted — pending approval" }, { status: 201 })
}
