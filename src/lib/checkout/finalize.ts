/**
 * src/lib/checkout/finalize.ts — server only.
 *
 * THE single path that turns a captured Razorpay payment into a paid order
 * (Phase 5.10.0). Both /api/checkout/verify-payment and the Razorpay webhook
 * call this; neither writes orders / payment_transactions / download_tokens
 * directly any more.
 *
 * The state change itself happens in the database function
 * finalize_order_payment() (migration 052): one transaction, row-locked on the
 * order, amount + Razorpay-order checked, unique-constrained token issue. So
 * repeated or concurrent calls — browser retry, webhook redelivery, both at
 * once — converge on exactly one paid order, one transaction row and one
 * token per line.
 *
 * Side effects that must happen once (purchase counters, coupon usage) run
 * only for the caller the database reports as the winner.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { getRazorpayClient } from "@/lib/razorpay/client"
import type { SupabaseClient } from "@supabase/supabase-js"

export class FinalizeError extends Error {
  constructor(public code: "not_found" | "mismatch" | "not_payable" | "payment_not_captured" | "internal", message: string) {
    super(message)
  }
}

/**
 * Ask Razorpay what was actually paid. The checkout HMAC proves the
 * order↔payment pairing but says nothing about amount or capture state.
 */
export async function fetchRazorpayPayment(paymentId: string): Promise<{ amount: number; orderId: string; status: string }> {
  const p = (await getRazorpayClient().payments.fetch(paymentId)) as { amount: number | string; order_id: string; status: string }
  return { amount: Number(p.amount), orderId: p.order_id, status: p.status }
}

export interface FinalizeResult {
  newlyPaid: boolean
  orderId: string
  tokens: { token: string; preset_title: string; preset_slug: string }[]
}

export async function finalizeOrderPayment(args: {
  orderId: string
  razorpayOrderId: string
  paymentId: string
  amountPaise: number
  signature?: string | null
}): Promise<FinalizeResult> {
  // finalize_order_payment is newer than src/types/database.ts.
  const supabase = createAdminClient() as unknown as SupabaseClient

  const { data, error } = await supabase.rpc("finalize_order_payment", {
    p_order_id: args.orderId,
    p_razorpay_order_id: args.razorpayOrderId,
    p_payment_id: args.paymentId,
    p_amount_paise: Math.round(args.amountPaise),
    p_signature: args.signature ?? null,
  })

  if (error) {
    const m = error.message ?? ""
    if (m.includes("order_not_found")) throw new FinalizeError("not_found", "Order not found")
    if (m.includes("mismatch")) throw new FinalizeError("mismatch", m)
    if (m.includes("order_not_payable")) throw new FinalizeError("not_payable", m)
    throw new FinalizeError("internal", m)
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    { newly_paid: boolean; order_id: string; firebase_uid: string | null; coupon_id: string | null } | undefined
  if (!row) throw new FinalizeError("internal", "finalize returned no row")

  if (row.newly_paid) {
    const { data: items } = await supabase.from("order_items").select("preset_id, quantity").eq("order_id", row.order_id)
    if (row.firebase_uid) {
      const { data: o } = await supabase.from("orders").select("email").eq("id", row.order_id).maybeSingle()
      if (o?.email) {
        await supabase.from("user_profiles").upsert(
          { firebase_uid: row.firebase_uid, email: o.email },
          { onConflict: "firebase_uid", ignoreDuplicates: true },
        )
      }
    }
    await Promise.all([
      ...(items ?? []).map((i: { preset_id: string; quantity: number }) =>
        supabase.rpc("increment_preset_purchases", { p_id: i.preset_id, qty: i.quantity })),
      row.coupon_id ? supabase.rpc("increment_coupon_uses", { coupon_id: row.coupon_id }) : Promise.resolve(),
    ])
  }

  const { data: tokens } = await supabase
    .from("download_tokens")
    .select("token, preset_title, preset_slug, order_items!inner(order_id)")
    .eq("order_items.order_id", row.order_id)

  return {
    newlyPaid: row.newly_paid,
    orderId: row.order_id,
    tokens: ((tokens ?? []) as { token: string; preset_title: string; preset_slug: string }[])
      .map(({ token, preset_title, preset_slug }) => ({ token, preset_title, preset_slug })),
  }
}
