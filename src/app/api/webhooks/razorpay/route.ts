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
import type { BillingCycle }          from "@/lib/subscriptions/plans"

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
          await handleSubscriptionCaptured(supabase, rzpOrderId, rzpPayId, notes)
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
   Called when a subscription Razorpay order is captured.
   Creates/extends the subscription row if frontend never ran.
──────────────────────────────────────────────────────────── */
async function handleSubscriptionCaptured(
  supabase:    ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  rzpOrderId:  string,
  rzpPayId:    string,
  notes:       Record<string, string>
) {
  const { data: subPayment } = await supabase
    .from("subscription_payments")
    .select("id, firebase_uid, plan_id, billing_cycle, amount_usd, amount_inr, status")
    .eq("razorpay_order_id", rzpOrderId)
    .single()

  if (!subPayment || subPayment.status !== "pending") return

  const { getPlan, isPlanId } = await import("@/lib/subscriptions/plans")
  if (!isPlanId(subPayment.plan_id)) return

  const plan        = getPlan(subPayment.plan_id)!
  const cycle       = subPayment.billing_cycle as "monthly" | "yearly"
  const pricing     = plan[cycle]
  const now         = new Date()
  const periodStart = now.toISOString()
  const periodEnd   = new Date(now.getTime() + pricing.durationMs).toISOString()

  /* Cancel existing active subscription */
  await supabase
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: now.toISOString(), updated_at: now.toISOString() })
    .eq("firebase_uid", subPayment.firebase_uid)
    .eq("status", "active")

  /* Create new active subscription */
  const { data: newSub } = await supabase
    .from("subscriptions")
    .insert({
      firebase_uid:         subPayment.firebase_uid,
      email:                notes.customer_email ?? "",
      plan_id:              subPayment.plan_id,
      billing_cycle:        subPayment.billing_cycle as BillingCycle,
      status:               "active",
      amount_usd:           subPayment.amount_usd,
      amount_inr:           subPayment.amount_inr,
      current_period_start: periodStart,
      current_period_end:   periodEnd,
      razorpay_order_id:    rzpOrderId,
      razorpay_payment_id:  rzpPayId,
      updated_at:           now.toISOString(),
    })
    .select("id")
    .single()

  if (newSub) {
    await supabase
      .from("subscription_payments")
      .update({
        subscription_id:     newSub.id,
        razorpay_payment_id: rzpPayId,
        status:              "captured",
        period_start:        periodStart,
        period_end:          periodEnd,
      })
      .eq("id", subPayment.id)
  }
}

/* ── Preset order payment captured ─────────────────────────
   Creates download tokens and marks order as paid.
──────────────────────────────────────────────────────────── */
async function handlePresetOrderCaptured(
  supabase:    ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  rzpOrderId:  string,
  rzpPayId:    string,
  amountPaise: number
) {
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, total_inr, firebase_uid, email")
    .eq("razorpay_order_id", rzpOrderId)
    .single()

  if (!order || order.status === "paid") return

  /* Log transaction */
  await supabase.from("payment_transactions").upsert(
    {
      order_id:            order.id,
      razorpay_payment_id: rzpPayId,
      razorpay_order_id:   rzpOrderId,
      amount_inr:          amountPaise / 100,
      status:              "captured",
      captured_at:         new Date().toISOString(),
    },
    { onConflict: "razorpay_payment_id" }
  )

  /* Create download tokens if frontend never ran */
  const { data: existingTokens } = await supabase
    .from("download_tokens")
    .select("id")
    .in("order_item_id",
      (await supabase.from("order_items").select("id").eq("order_id", order.id))
        .data?.map((i) => i.id) ?? []
    )
    .limit(1)

  if (!existingTokens?.length) {
    const { data: items } = await supabase
      .from("order_items")
      .select("id, preset_id, preset_title, preset_slug")
      .eq("order_id", order.id)

    if (items?.length) {
      const presetIds = items.map((i) => i.preset_id)
      const { data: presets } = await supabase
        .from("presets").select("id, download_url").in("id", presetIds)

      const urlMap    = new Map(presets?.map((p) => [p.id, p.download_url]) ?? [])
      // 30-day TTL — matches verify-payment endpoint for consistency
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await supabase.from("download_tokens").insert(
        items.map((item) => ({
          order_item_id: item.id,
          firebase_uid:  order.firebase_uid,
          token:         crypto.randomUUID(),
          preset_title:  item.preset_title,
          preset_slug:   item.preset_slug,
          download_url:  urlMap.get(item.preset_id) ?? null,
          expires_at:    expiresAt,
        }))
      )
    }
  }

  /* Mark order paid */
  await supabase.from("orders").update({
    status:              "paid",
    razorpay_payment_id: rzpPayId,
    paid_at:             new Date().toISOString(),
  }).eq("id", order.id)
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
