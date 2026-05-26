/**
 * POST /api/subscriptions/verify-payment
 *
 * Called by the frontend AFTER Razorpay payment succeeds.
 *
 * Flow:
 *   1. Verify HMAC signature — proves payment actually happened
 *   2. Fetch our pending payment row
 *   3. Compute subscription period (start = now, end = now + duration)
 *   4. Cancel any previous active subscription for this user (graceful upgrade)
 *   5. Insert new active subscription row
 *   6. Mark payment row as captured
 *   7. Return subscription summary to frontend
 *
 * Security: signature verification cannot be bypassed. Any order that
 * fails verification stays "pending" — no access granted.
 */

import { NextRequest, NextResponse }    from "next/server"
import { createAdminClient }             from "@/lib/supabase/admin"
import { verifyPaymentSignature }        from "@/lib/razorpay/client"
import { getPlan, isPlanId }             from "@/lib/subscriptions/plans"
import type { BillingCycle }             from "@/lib/subscriptions/plans"

export const runtime = "nodejs"

interface VerifySubscriptionPayload {
  razorpay_payment_id: string
  razorpay_order_id:   string
  razorpay_signature:  string
  payment_id:          string   // our subscription_payments row id
}

export async function POST(req: NextRequest) {
  try {
    const body: VerifySubscriptionPayload = await req.json()
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, payment_id } = body

    /* ── 1. Validate required fields ── */
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !payment_id) {
      return err("Missing required payment fields", 400)
    }

    /* ── 2. Verify HMAC signature ── */
    const valid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if (!valid) return err("Payment signature verification failed", 400)

    const supabase = createAdminClient()

    /* ── 3. Fetch our pending payment record ── */
    const { data: payment, error: payErr } = await supabase
      .from("subscription_payments")
      .select("id, firebase_uid, plan_id, billing_cycle, amount_usd, amount_inr, status, razorpay_order_id")
      .eq("id", payment_id)
      .single()

    if (payErr || !payment)           return err("Payment record not found", 404)
    if (payment.status === "captured") return err("Payment already processed", 409)
    if (payment.status !== "pending")  return err("Payment is not in a processable state", 400)
    if (payment.razorpay_order_id !== razorpay_order_id)
                                       return err("Order ID mismatch", 400)

    const { firebase_uid, plan_id, billing_cycle, amount_usd, amount_inr } = payment

    /* ── 4. Validate plan + calculate period ── */
    if (!isPlanId(plan_id)) return err("Invalid plan in record", 500)

    const plan         = getPlan(plan_id)!
    const planPricing  = plan[billing_cycle as BillingCycle]
    const now          = new Date()
    const periodStart  = now.toISOString()
    const periodEnd    = new Date(now.getTime() + planPricing.durationMs).toISOString()

    /* ── 5. Gracefully cancel any existing active subscription ── */
    // We keep the old row for billing history; just mark it cancelled.
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled", cancelled_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("firebase_uid", firebase_uid)
      .eq("status", "active")

    /* ── 6. Create new active subscription ── */
    const { data: subscription, error: subErr } = await supabase
      .from("subscriptions")
      .insert({
        firebase_uid,
        plan_id,
        billing_cycle:        billing_cycle as BillingCycle,
        status:               "active",
        amount_usd,
        amount_inr,
        current_period_start: periodStart,
        current_period_end:   periodEnd,
        razorpay_order_id,
        razorpay_payment_id,
        updated_at:           now.toISOString(),
      })
      .select("id")
      .single()

    if (subErr || !subscription) {
      console.error("[subscriptions/verify-payment] Failed to create subscription:", subErr)
      return err("Failed to activate subscription", 500)
    }

    /* ── 7. Fetch email from user_profiles for the subscription row ── */
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("firebase_uid", firebase_uid)
      .single()

    if (profile?.email) {
      await supabase
        .from("subscriptions")
        .update({ email: profile.email })
        .eq("id", subscription.id)
    }

    /* ── 8. Link payment row to subscription + mark captured ── */
    await supabase
      .from("subscription_payments")
      .update({
        subscription_id:    subscription.id,
        razorpay_payment_id,
        razorpay_signature,
        status:             "captured",
        period_start:       periodStart,
        period_end:         periodEnd,
      })
      .eq("id", payment_id)

    /* ── 9. Return success ── */
    return NextResponse.json({
      subscription_id:    subscription.id,
      plan_id,
      plan_name:          plan.name,
      billing_cycle,
      current_period_end: periodEnd,
      amount_usd,
      amount_inr,
    })
  } catch (e) {
    console.error("[subscriptions/verify-payment]", e)
    return err("Internal server error", 500)
  }
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
