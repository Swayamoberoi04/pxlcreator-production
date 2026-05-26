/**
 * GET  /api/account/profile  — fetch user profile
 * POST /api/account/profile  — upsert user profile (create on first login)
 *
 * Requires:  Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse }  from "next/server"
import { createAdminClient }          from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }  from "@/lib/account/auth"

export const runtime = "nodejs"

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const firebaseUid = await getFirebaseUidFromRequest(req)
  if (!firebaseUid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("firebase_uid", firebaseUid)
    .maybeSingle()

  if (error) {
    console.error("[profile GET]", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}

/* ── POST ────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const firebaseUid = await getFirebaseUidFromRequest(req)
  if (!firebaseUid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { email?: string; display_name?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { email, display_name } = body
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 })
  }

  const supabase = createAdminClient()

  /* Upsert — creates on first login, updates on subsequent calls */
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        firebase_uid: firebaseUid,
        email,
        display_name: display_name ?? null,
      },
      { onConflict: "firebase_uid" }
    )
    .select()
    .single()

  if (error) {
    console.error("[profile POST]", error)
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}
