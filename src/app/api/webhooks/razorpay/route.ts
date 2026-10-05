/**
 * POST /api/webhooks/razorpay
 *
 * Belt-and-suspenders webhook handler.
 *
 * Why this exists: the frontend verify-payment call can fail (network error,
 * user closes browser). Razorpay retries webhooks for up to 24h, so even if
 * the user's browser died, this handler catches the payment and finalises it.
 *
 * Handles two payment types (distinguished by Razorpay order notes.type):
 *   • "subscription" — activates a PXL Premium subscription
 *   • everything else — marks a preset order as paid + issues download tokens
 *
 * Setup in Razorpay Dashboard:
 *   Webhooks → Add Webhook URL → https://yoursite.com/api/webhooks/razorpay
 *   Events: payment.captured, payment.failed
 *   Secret: RAZORPAY_WEBHOOK_SECRET in .env.local
 */

import { NextRequest, NextResponse }  from "next/server"
import { verifyWebhookSignature }     from "@/lib/razorpay/client"
import { createAdminClient }          from "@/lib/supabase/admin"
import { finalizeOrderPayment, FinalizeError } from "@/lib/checkout/finalize"
import { activateSubscriptionPayment, ActivateError } from "@/lib/subscriptions/activate"
import { log }                        from "@/lib/api/logger"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    /* ── 1. Read raw body for signature verification ── */
    const rawBody   = await req.text()
    const sigHeader = req.headers.get("x-razorpay-signature") ?? ""

    if (!sigHeader) return NextResponse.json({ ok: false }, { status: 400 })

    /* ── 2. Verify webhook signature ── */
    const valid = verifyWebhookSignature(rawBody, sigHeader)
    if (!valid) {
      console.warn("[webhook/razorpay] Invalid signature")
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const event    = JSON.parse(rawBody) as RazorpayWebhookEvent
    const supabase = createAdminClient()

    /* ── 3. Route by event type ── */
    switch (event.event) {

      /* ════════════════════════════════════════════════
         payment.captured
         Route sub-type by Razorpay order notes.type
      ════════════════════════════════════════════════ */
      case "payment.captured": {
        const payment    = event.payload.payment.entity
        const rzpOrderId = payment.order_id
        const rzpPayId   = payment.id
        const notes      = (payment as RazorpayPaymentWithNotes).notes ?? {}

        /* ── Branch A: Subscription payment ── */
        if (notes.type === "subscription") {
          await handleSubscriptionCaptured(rzpOrderId, rzpPayId, payment.amount)
          break
        }

        /* ── Branch B: Preset order payment ── */
        await handlePresetOrderCaptured(supabase, rzpOrderId, rzpPayId, payment.amount)
        break
      }

      /* ════════════════════════════════════════════════
         payment.failed — mark both order types as failed
      ════════════════════════════════════════════════ */
      case "payment.failed": {
        const payment    = event.payload.payment.entity
        const rzpOrderId = payment.order_id
        const notes      = (payment as RazorpayPaymentWithNotes).notes ?? {}

        if (notes.type === "subscription") {
          /* Mark subscription payment as failed */
          await supabase
            .from("subscription_payments")
            .update({ status: "failed" })
            .eq("razorpay_order_id", rzpOrderId)
            .eq("status", "pending")
          break
        }

        /* Preset order failed */
        const { data: order } = await supabase
          .from("orders")
          .select("id")
          .eq("razorpay_order_id", rzpOrderId)
          .single()

        if (!order) break

        await supabase.from("payment_transactions").upsert(
          {
            order_id:             order.id,
            razorpay_payment_id:  payment.id,
            razorpay_order_id:    rzpOrderId,
            amount_inr:           payment.amount / 100,
            status:               "failed",
            error_code:           payment.error_code ?? null,
            error_description:    payment.error_description ?? null,
          },
          { onConflict: "razorpay_payment_id" }
        )

        await supabase
          .from("orders")
          .update({ status: "failed" })
          .eq("id", order.id)
          .eq("status", "pending")

        break
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[webhook/razorpay]", e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

/* ── Subscription payment captured ─────────────────────────
   Phase 5.10.0: delegates to the single idempotent activation path shared
   with /api/subscriptions/verify-payment.
──────────────────────────────────────────────────────────── */
async function handleSubscriptionCaptured(rzpOrderId: string, rzpPayId: string, amountPaise: number) {
  try {
    await activateSubscriptionPayment({ razorpayOrderId: rzpOrderId, paymentId: rzpPayId, amountPaise })
  } catch (e) {
    if (e instanceof ActivateError && e.code === "mismatch") {
      log.security("webhook", "subscription amount mismatch", { rzpOrderId, rzpPayId })
      return
    }
    if (e instanceof ActivateError && (e.code === "not_found" || e.code === "not_payable")) return
    throw e
  }
}

/* ── Preset order payment captured ─────────────────────────
   Phase 5.10.0: delegates to finalizeOrderPayment(), the same DB-backed,
   row-locked, amount-checked path verify-payment uses. Safe to redeliver
   and safe to race against verify-payment.
──────────────────────────────────────────────────────────── */
async function handlePresetOrderCaptured(
  supabase:    ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  rzpOrderId:  string,
  rzpPayId:    string,
  amountPaise: number
) {
  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("razorpay_order_id", rzpOrderId)
    .maybeSingle()
  if (!order) return

  try {
    await finalizeOrderPayment({ orderId: order.id, razorpayOrderId: rzpOrderId, paymentId: rzpPayId, amountPaise })
  } catch (e) {
    if (e instanceof FinalizeError && e.code === "mismatch") {
      log.security("webhook", "order amount mismatch — not finalised", { orderId: order.id, rzpPayId })
      return
    }
    if (e instanceof FinalizeError && (e.code === "not_found" || e.code === "not_payable")) return
    throw e // 500 → Razorpay retries
  }
}
/* ── Types ─────────────────────────────────────────────────── */
interface RazorpayWebhookEvent {
  event:   string
  payload: {
    payment: {
      entity: {
        id:                  string
        order_id:            string
        amount:              number
        error_code?:         string
        error_description?:  string
      }
    }
  }
}

interface RazorpayPaymentWithNotes {
  notes?: Record<string, string>
}
