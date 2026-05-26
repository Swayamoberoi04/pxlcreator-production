/**
 * POST /api/subscriptions/create-order
 *
 * Creates a Razorpay order for a subscription plan purchase.
 *
 * Flow:
 *   1. Validate authenticated user + plan/cycle
 *   2. Look up canonical price from PLANS (never trust client)
 *   3. Create a pending subscription_payments row
 *   4. Create Razorpay order
 *   5. Return { razorpay_order_id, amount_paise, key_id, payment_id }
 *
 * The frontend uses razorpay_order_id + key_id to open the modal.
 * payment_id is sent back at verify-payment time.
 */

import { NextRequest, NextResponse }      from "next/server"
import { createAdminClient }             from "@/lib/supabase/admin"
import { getRazorpayClient }             from "@/lib/razorpay/client"
import { getPlan, isPlanId }             from "@/lib/subscriptions/plans"
import { makeRateLimiter, getClientIp }  from "@/lib/api/rate-limit"
import type { BillingCycle }             from "@/lib/subscriptions/plans"

export const runtime = "nodejs"

// 10 subscription order attempts per hour per IP
const subOrderLimiter = makeRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 })

interface CreateSubscriptionOrderPayload {
  plan_id:      string
  billing_cycle: string
  firebase_uid: string
  email:        string
  name:         string
}

export async function POST(req: NextRequest) {
  /* ── Rate limit ── */
  const ip = getClientIp(req)
  if (subOrderLimiter.check(ip)) {
    return err("Too many subscription attempts. Please wait before trying again.", 429)
  }

  try {
    const body: CreateSubscriptionOrderPayload = await req.json()
    const { plan_id, billing_cycle, firebase_uid, email } = body

    /* ── 1. Validate inputs ── */
    if (!firebase_uid?.trim()) return err("Authentication required", 401)
    if (!email?.includes("@")) return err("Valid email required", 400)
    if (!isPlanId(plan_id))    return err("Invalid plan", 400)
    if (billing_cycle !== "monthly" && billing_cycle !== "yearly")
      return err("Invalid billing cycle", 400)

    /* ── 2. Resolve canonical price (never trust client-sent amounts) ── */
    const plan      = getPlan(plan_id)!
    const pricing   = plan[billing_cycle as BillingCycle]
    const { usd: amount_usd, inr: amount_inr, paise: amount_paise } = pricing

    const supabase  = createAdminClient()

    /* ── 3. Check if user already has an active subscription ── */
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id, plan_id, billing_cycle, current_period_end, status")
      .eq("firebase_uid", firebase_uid)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Allow upgrade/downgrade — we don't block if they already have a plan
    // (the UI warns them; verify-payment handles the upsert logic)

    /* ── 4. Create Razorpay order ── */
    const rzp      = getRazorpayClient()
    const rzpOrder = await rzp.orders.create({
      amount:   Math.round(amount_paise),
      currency: "INR",
      receipt:  `pxl_sub_${firebase_uid.slice(0, 8)}_${Date.now()}`,
      notes: {
        type:          "subscription",
        plan_id,
        billing_cycle,
        firebase_uid,
        customer_email: email,
      },
    })

    /* ── 5. Record pending payment ── */
    const { data: payment, error: paymentErr } = await supabase
      .from("subscription_payments")
      .insert({
        firebase_uid,
        plan_id,
        billing_cycle,
        razorpay_order_id: rzpOrder.id,
        amount_usd,
        amount_inr,
        status: "pending",
      })
      .select("id")
      .single()

    if (paymentErr || !payment) {
      console.error("[subscriptions/create-order] DB error:", paymentErr)
      return err("Failed to record payment", 500)
    }

    /* ── 6. Return to frontend ── */
    return NextResponse.json({
      razorpay_order_id: rzpOrder.id,
      amount_paise:      Math.round(amount_paise),
      key_id:            process.env.RAZORPAY_KEY_ID,
      payment_id:        payment.id,      // our subscription_payments row
      plan_name:         plan.name,
      existing_plan:     existing?.plan_id ?? null,
    })
  } catch (e) {
    console.error("[subscriptions/create-order]", e)
    return err("Internal server error", 500)
  }
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
