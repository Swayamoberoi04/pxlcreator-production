/**
 * POST /api/checkout/verify-payment
 *
 * Called by the frontend AFTER Razorpay payment succeeds.
 *
 * Flow (Phase 5.10.0):
 *   1. Verify the Razorpay HMAC signature — proves the order↔payment pairing
 *   2. Ask Razorpay for the payment — proves it is captured/authorized, for
 *      this Razorpay order, and for how much
 *   3. finalizeOrderPayment() — the single, idempotent DB-backed finalisation
 *      shared with the webhook (row lock + amount check + unique tokens)
 *   4. Return download tokens for the success page
 *
 * Repeating this call, or racing it against the webhook, returns the same
 * order and the same tokens; it never creates a second transaction or token.
 * If any check fails the order stays unpaid and no access is granted.
 */

import { NextRequest, NextResponse }       from "next/server"
import { verifyPaymentSignature }          from "@/lib/razorpay/client"
import { log }                             from "@/lib/api/logger"
import { getClientIp }                     from "@/lib/api/rate-limit"
import { finalizeOrderPayment, fetchRazorpayPayment, FinalizeError } from "@/lib/checkout/finalize"
import type { RazorpayVerifyPayload }      from "@/types/commerce"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body: RazorpayVerifyPayload = await req.json()
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, our_order_id } = body

    /* ── 1. Required fields ── */
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !our_order_id) {
      return err("Missing required payment fields", 400)
    }

    /* ── 2. HMAC signature ── */
    if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      log.security("payment", "HMAC signature verification failed", {
        razorpay_order_id, razorpay_payment_id, our_order_id, ip: getClientIp(req),
      })
      return err("Payment signature verification failed", 400)
    }

    /* ── 3. What did Razorpay actually take? ── */
    const payment = await fetchRazorpayPayment(razorpay_payment_id)
    if (payment.orderId !== razorpay_order_id) {
      log.security("payment", "payment belongs to a different Razorpay order", { razorpay_order_id, razorpay_payment_id })
      return err("Payment does not match this order", 400)
    }
    if (payment.status !== "captured" && payment.status !== "authorized") {
      return err("Payment has not been completed", 400)
    }

    /* ── 4. Idempotent finalisation ── */
    const result = await finalizeOrderPayment({
      orderId:         our_order_id,
      razorpayOrderId: razorpay_order_id,
      paymentId:       razorpay_payment_id,
      amountPaise:     payment.amount,
      signature:       razorpay_signature,
    })

    log.info("payment", result.newlyPaid ? "order finalised" : "order already finalised (idempotent)", {
      order_id: result.orderId, tokens: result.tokens.length,
    })

    return NextResponse.json({ order_id: result.orderId, items: result.tokens })
  } catch (e) {
    if (e instanceof FinalizeError) {
      if (e.code === "not_found") return err("Order not found", 404)
      if (e.code === "mismatch") {
        log.security("payment", "order/amount mismatch at finalisation", { detail: e.message })
        return err("Payment does not match this order", 400)
      }
      if (e.code === "not_payable") return err("Order is not in a payable state", 400)
    }
    console.error("[verify-payment]", e)
    return err("Internal server error", 500)
  }
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
