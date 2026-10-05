/**
 * POST /api/subscriptions/verify-payment
 *
 * Called by the frontend AFTER Razorpay payment succeeds.
 *
 * Flow:
 *   1. Verify HMAC signature — proves payment actually happened
 *   2. Fetch our payment row and Razorpay's record of the payment (amount,
 *      status, order)
 *   3. activateSubscriptionPayment() — Phase 5.10.0's single idempotent
 *      activation, shared with the webhook: cancels any previous active
 *      subscription, creates exactly one new one, marks the payment captured
 *   4. Return subscription summary to frontend
 *
 * Security: signature verification cannot be bypassed. Any order that
 * fails verification stays "pending" — no access granted.
 */

import { NextRequest, NextResponse }    from "next/server"
import { createAdminClient }             from "@/lib/supabase/admin"
import { verifyPaymentSignature }        from "@/lib/razorpay/client"
import { fetchRazorpayPayment } from "@/lib/checkout/finalize"
import { activateSubscriptionPayment, ActivateError } from "@/lib/subscriptions/activate"
import { getPlan, isPlanId }             from "@/lib/subscriptions/plans"

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

    /* ── 3. Our payment record must be the one being paid ── */
    const supabase = createAdminClient()
    const { data: payment } = await supabase
      .from("subscription_payments")
      .select("id, razorpay_order_id")
      .eq("id", payment_id)
      .maybeSingle()
    if (!payment) return err("Payment record not found", 404)
    if (payment.razorpay_order_id !== razorpay_order_id) return err("Order ID mismatch", 400)

    /* ── 4. What did Razorpay actually take? ── */
    const rzp = await fetchRazorpayPayment(razorpay_payment_id)
    if (rzp.orderId !== razorpay_order_id) return err("Payment does not match this order", 400)
    if (rzp.status !== "captured" && rzp.status !== "authorized") return err("Payment has not been completed", 400)

    /* ── 5. Idempotent activation (shared with the webhook, migration 052) ── */
    try {
      const r = await activateSubscriptionPayment({
        razorpayOrderId: razorpay_order_id,
        paymentId:       razorpay_payment_id,
        amountPaise:     rzp.amount,
        signature:       razorpay_signature,
      })
      const plan = isPlanId(r.planId) ? getPlan(r.planId) : null
      return NextResponse.json({
        subscription_id:    r.subscriptionId,
        plan_id:            r.planId,
        plan_name:          plan?.name ?? r.planId,
        billing_cycle:      r.billingCycle,
        current_period_end: r.periodEnd,
      })
    } catch (e) {
      if (e instanceof ActivateError) {
        if (e.code === "not_found")   return err("Payment record not found", 404)
        if (e.code === "mismatch")    return err("Payment does not match this plan", 400)
        if (e.code === "not_payable") return err("Payment is not in a processable state", 400)
      }
      throw e
    }  } catch (e) {
    console.error("[subscriptions/verify-payment]", e)
    return err("Internal server error", 500)
  }
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
