/**
 * GET   /api/admin/reviews          — list reviews (pending or all)
 * PATCH /api/admin/reviews          — approve or reject a review
 *
 * Admin-only. Uses HMAC cookie session (same as all other admin routes).
 *
 * GET query params:
 *   status: "pending" | "approved" | "all"  (default "pending")
 *   page, limit
 *
 * PATCH body: { id: string; action: "approve" | "reject" }
 */

import { NextRequest, NextResponse }      from "next/server"
import { createAdminClient }              from "@/lib/supabase/admin"
import { verifySessionToken,
         ADMIN_COOKIE_NAME }              from "@/lib/admin/auth"
import { cookies }                        from "next/headers"

export const runtime = "nodejs"

async function checkAdmin() {
  const cookieStore  = await cookies()
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value ?? ""
  return verifySessionToken(sessionToken)
}

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sp     = req.nextUrl.searchParams
  const status = sp.get("status") ?? "pending"
  const page   = Math.max(1, parseInt(sp.get("page")  ?? "1",  10))
  const limit  = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20", 10)))
  const from   = (page - 1) * limit
  const to     = from + limit - 1

  const supabase = createAdminClient()

  let query = supabase
    .from("preset_reviews")
    .select(`
      id,
      preset_id,
      firebase_uid,
      email,
      rating,
      review_text,
      is_approved,
      is_verified_purchase,
      created_at,
      presets ( title, slug )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (status === "pending")  query = query.eq("is_approved", false)
  if (status === "approved") query = query.eq("is_approved", true)
  // "all" — no filter

  const { data, error, count } = await query

  if (error) {
    console.error("[admin/reviews GET]", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }

  return NextResponse.json({
    reviews:     data ?? [],
    total:       count ?? 0,
    page,
    limit,
    total_pages: Math.ceil((count ?? 0) / limit),
  })
}

/* ── PATCH ───────────────────────────────────────────────── */
export async function PATCH(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { id?: string; action?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { id, action } = body
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (action === "approve") {
    const { error } = await supabase
      .from("preset_reviews")
      .update({ is_approved: true })
      .eq("id", id)

    if (error) {
      console.error("[admin/reviews PATCH approve]", error)
      return NextResponse.json({ error: "Failed to approve review" }, { status: 500 })
    }
    return NextResponse.json({ success: true, action: "approved" })
  }

  /* reject = hard delete */
  const { error } = await supabase
    .from("preset_reviews")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[admin/reviews PATCH reject]", error)
    return NextResponse.json({ error: "Failed to reject review" }, { status: 500 })
  }

  return NextResponse.json({ success: true, action: "rejected" })
}
