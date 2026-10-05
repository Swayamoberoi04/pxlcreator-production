/**
 * src/lib/subscriptions/activate.ts — server only.
 *
 * Single, idempotent subscription activation (Phase 5.10.0), shared by
 * /api/subscriptions/verify-payment and the Razorpay webhook. The state change
 * happens in activate_subscription_payment() (migration 052): row-locked on
 * the subscription_payments row, amount-checked, and protected by a unique
 * index on subscriptions.razorpay_order_id — so a browser retry racing a
 * webhook redelivery activates exactly one subscription.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { getPlan, isPlanId, type BillingCycle } from "@/lib/subscriptions/plans"
import type { SupabaseClient } from "@supabase/supabase-js"

export class ActivateError extends Error {
  constructor(public code: "not_found" | "mismatch" | "not_payable" | "internal", message: string) {
    super(message)
  }
}

export async function activateSubscriptionPayment(args: {
  razorpayOrderId: string
  paymentId: string
  amountPaise: number
  signature?: string | null
}): Promise<{ newlyActivated: boolean; subscriptionId: string | null; periodEnd: string | null; planId: string; billingCycle: string }> {
  const supabase = createAdminClient() as unknown as SupabaseClient

  const { data: sp } = await supabase
    .from("subscription_payments")
    .select("firebase_uid, plan_id, billing_cycle")
    .eq("razorpay_order_id", args.razorpayOrderId)
    .maybeSingle()
  if (!sp) throw new ActivateError("not_found", "Payment record not found")
  if (!isPlanId(sp.plan_id)) throw new ActivateError("internal", "Invalid plan in record")

  const duration = getPlan(sp.plan_id)![sp.billing_cycle as BillingCycle].durationMs

  const { data: profile } = await supabase.from("user_profiles").select("email").eq("firebase_uid", sp.firebase_uid).maybeSingle()

  const { data, error } = await supabase.rpc("activate_subscription_payment", {
    p_razorpay_order_id: args.razorpayOrderId,
    p_payment_id: args.paymentId,
    p_amount_paise: Math.round(args.amountPaise),
    p_duration_ms: duration,
    p_signature: args.signature ?? null,
    p_email: profile?.email ?? null,
  })
  if (error) {
    const m = error.message ?? ""
    if (m.includes("not_found")) throw new ActivateError("not_found", m)
    if (m.includes("mismatch")) throw new ActivateError("mismatch", m)
    if (m.includes("not_payable")) throw new ActivateError("not_payable", m)
    throw new ActivateError("internal", m)
  }
  const row = (Array.isArray(data) ? data[0] : data) as { newly_activated: boolean; subscription_id: string | null; period_end: string | null }
  return { newlyActivated: row.newly_activated, subscriptionId: row.subscription_id, periodEnd: row.period_end, planId: sp.plan_id, billingCycle: sp.billing_cycle }
}
