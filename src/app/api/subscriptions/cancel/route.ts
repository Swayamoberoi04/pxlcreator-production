/**
 * POST /api/subscriptions/cancel
 *
 * Cancels a user's active subscription.
 *
 * Important: we do NOT revoke access immediately.
 * The user keeps access until `current_period_end`.
 * We just mark `status = 'cancelled'` so no renewal is expected.
 *
 * Body: { firebase_uid: string, subscription_id: string }
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient }          from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const { firebase_uid, subscription_id } = await req.json()

    if (!firebase_uid)    return err("Authentication required", 401)
    if (!subscription_id) return err("Subscription ID required", 400)

    const supabase = createAdminClient()

    /* Fetch to confirm ownership — CRITICAL: never trust the client */
    const { data: sub, error: fetchErr } = await supabase
      .from("subscriptions")
      .select("id, firebase_uid, status, current_period_end")
      .eq("id", subscription_id)
      .single()

    if (fetchErr || !sub)              return err("Subscription not found", 404)
    if (sub.firebase_uid !== firebase_uid) return err("Unauthorised", 403)
    if (sub.status === "cancelled")    return err("Already cancelled", 409)
    if (sub.status !== "active")       return err("Subscription is not active", 400)

    const { error: updateErr } = await supabase
      .from("subscriptions")
      .update({
        status:       "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      })
      .eq("id", subscription_id)

    if (updateErr) {
      console.error("[subscriptions/cancel] DB error:", updateErr)
      return err("Failed to cancel subscription", 500)
    }

    return NextResponse.json({
      cancelled:          true,
      access_until:       sub.current_period_end,
    })
  } catch (e) {
    console.error("[subscriptions/cancel]", e)
    return err("Internal server error", 500)
  }
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
