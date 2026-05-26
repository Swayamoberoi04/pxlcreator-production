/**
 * GET /api/subscriptions/status
 *
 * Returns the current active subscription + payment history for the
 * authenticated user.
 *
 * Auth: Firebase ID token in Authorization: Bearer <token> header.
 * The uid is extracted server-side from the verified token — it is
 * NEVER accepted from query params or request body to prevent IDOR
 * (Insecure Direct Object Reference) attacks.
 */

import { NextRequest, NextResponse }         from "next/server"
import { createAdminClient }                 from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }         from "@/lib/account/auth"

export const runtime  = "nodejs"
export const dynamic  = "force-dynamic"

export async function GET(req: NextRequest) {
  /* ── 1. Verify Firebase token — never trust uid from query params ── */
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) {
    return NextResponse.json(
      { error: "Authentication required. Please sign in to view your subscription." },
      { status: 401 }
    )
  }

  try {
    const supabase = createAdminClient()

    /* ── 2. Active subscription — must belong to this user ── */
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select(
        "id, plan_id, billing_cycle, status, " +
        "current_period_start, current_period_end, " +
        "amount_usd, amount_inr, created_at"
      )
      .eq("firebase_uid", uid)          // locked to authenticated user
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    /* ── 3. Payment history (last 12) — same uid lock ── */
    const { data: payments } = await supabase
      .from("subscription_payments")
      .select(
        "id, plan_id, billing_cycle, amount_usd, amount_inr, " +
        "status, period_start, period_end, created_at"
      )
      .eq("firebase_uid", uid)          // locked to authenticated user
      .eq("status", "captured")
      .order("created_at", { ascending: false })
      .limit(12)

    return NextResponse.json({
      subscription: subscription ?? null,
      history:      payments     ?? [],
    })
  } catch (e) {
    console.error("[subscriptions/status]", e)
    return NextResponse.json(
      { error: "Failed to retrieve subscription status." },
      { status: 500 }
    )
  }
}
