/**
 * POST /api/community/recommended/dismiss
 *
 * "Don't show me this again." Records a real dismissal so recommendations
 * stop surfacing a creator/project/event the user has already said no to
 * (Phase 5.6 requirement 7).
 *
 * Body: { target_type: "creator" | "project" | "event" | "post", target_id }
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 120, windowMs: 60 * 60 * 1000 })
const TARGET_TYPES = ["creator", "project", "event", "post"]

export async function POST(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: { target_type?: string; target_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { target_type, target_id } = body
  if (!target_type || !TARGET_TYPES.includes(target_type)) {
    return NextResponse.json({ error: `target_type must be one of: ${TARGET_TYPES.join(", ")}.` }, { status: 400 })
  }
  if (!target_id) {
    return NextResponse.json({ error: "target_id is required." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("recommendation_dismissals")
      .upsert(
        { firebase_uid: uid, target_type, target_id },
        { onConflict: "firebase_uid,target_type,target_id" }
      )
    if (error) {
      console.error("[recommended/dismiss POST]", error)
      return NextResponse.json({ error: "Failed to dismiss." }, { status: 500 })
    }
    return NextResponse.json({ dismissed: true })
  } catch (err) {
    console.error("[recommended/dismiss POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
