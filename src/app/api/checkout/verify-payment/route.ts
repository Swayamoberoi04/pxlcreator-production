/**
 * POST /api/checkout/verify-payment
 *
 * Called by the frontend AFTER Razorpay payment succeeds.
 *
 * Flow:
 *   1. Verify Razorpay HMAC signature — proves payment actually happened
 *   2. Fetch our pending order from DB
 *   3. Record payment transaction
 *   4. Create download tokens (one per order item)
 *   5. Mark order as PAID
 *   6. Return download token data for success page
 *
 * If signature verification fails, the order stays PENDING and the
 * request is rejected — no download access granted.
 */

import { NextRequest, NextResponse }       from "next/server"
import { createAdminClient }               from "@/lib/supabase/admin"
import { verifyPaymentSignature }          from "@/lib/razorpay/client"
import { log }                             from "@/lib/api/logger"
import { getClientIp }                     from "@/lib/api/rate-limit"
import type { RazorpayVerifyPayload,
              DownloadTokenResult }        from "@/types/commerce"

export const runtime = "nodejs"

// 30-day TTL — long enough for any legitimate re-download, short enough
// that a leaked token link stops working before causing lasting damage.
const DOWNLOAD_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    const body: RazorpayVerifyPayload = await req.json()
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      our_order_id,
    } = body

    /* ── 1. Validate presence of all required fields ── */
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !our_order_id) {
      return err("Missing required payment fields", 400)
    }

    /* ── 2. Verify HMAC signature ── */
    const valid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    )
    if (!valid) {
      log.security("payment", "HMAC signature verification failed", {
        razorpay_order_id,
        razorpay_payment_id,
        our_order_id,
        ip: getClientIp(req),
      })
      return err("Payment signature verification failed", 400)
    }

    const supabase = createAdminClient()

    /* ── 3. Fetch our pending order ── */
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, status, total_inr, firebase_uid, email, razorpay_order_id, coupon_id")
      .eq("id", our_order_id)
      .single()

    if (orderErr || !order)       return err("Order not found", 404)
    if (order.status === "paid")  return err("Order already processed", 409)
    if (order.status !== "pending") return err("Order is not in a payable state", 400)

    /* ── 4. Verify the Razorpay order ID matches ── */
    if (order.razorpay_order_id !== razorpay_order_id) {
      return err("Razorpay order ID mismatch", 400)
    }

    /* ── 5. Log payment transaction ── */
    await supabase.from("payment_transactions").insert({
      order_id:            order.id,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      amount_inr:          order.total_inr,
      status:              "captured",
      captured_at:         new Date().toISOString(),
    })

    /* ── 6. Fetch order items to generate download tokens ── */
    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select("id, preset_id, preset_title, preset_slug, quantity")
      .eq("order_id", order.id)

    if (itemsErr || !items?.length) return err("Order items not found", 500)

    /* ── 7. Fetch download URLs from presets (snapshot the URL now) ── */
    const presetIds = items.map((i) => i.preset_id)
    const { data: presets } = await supabase
      .from("presets")
      .select("id, download_url")
      .in("id", presetIds)

    const downloadUrlMap = new Map(presets?.map((p) => [p.id, p.download_url]) ?? [])

    /* ── 8. Create download tokens (one per order item) ── */
    const expiresAt  = new Date(Date.now() + DOWNLOAD_TOKEN_TTL_MS).toISOString()
    const tokenResults: DownloadTokenResult[] = []

    const tokenInserts = items.map((item) => {
      const token = crypto.randomUUID()
      tokenResults.push({
        token,
        preset_title: item.preset_title,
        preset_slug:  item.preset_slug,
      })
      return {
        order_item_id: item.id,
        firebase_uid:  order.firebase_uid,
        token,
        preset_title:  item.preset_title,
        preset_slug:   item.preset_slug,
        download_url:  downloadUrlMap.get(item.preset_id) ?? null,
        expires_at:    expiresAt,
      }
    })

    await supabase.from("download_tokens").insert(tokenInserts)

    /* ── 8b. Increment purchase_count on each preset (fire-and-forget, non-blocking) ── */
    void Promise.all(
      items.map((item) =>
        supabase
          .rpc("increment_preset_purchases", { p_id: item.preset_id, qty: item.quantity })
          .then(({ error: rpcErr }) => {
            if (rpcErr) console.error("[verify-payment] purchase_count increment failed:", rpcErr)
          })
      )
    )

    /* ── 9. Mark order as PAID ── */
    await supabase
      .from("orders")
      .update({
        status:               "paid",
        razorpay_payment_id,
        paid_at:              new Date().toISOString(),
      })
      .eq("id", order.id)

    /* ── 10. Upsert user profile (if firebase_uid present) ── */
    if (order.firebase_uid) {
      await supabase
        .from("user_profiles")
        .upsert(
          { firebase_uid: order.firebase_uid, email: order.email },
          { onConflict: "firebase_uid", ignoreDuplicates: true }
        )
    }

    /* ── 11. Increment coupon used_count (if a coupon was applied) ── */
    if (order.coupon_id) {
      await supabase.rpc("increment_coupon_uses", { coupon_id: order.coupon_id })
        .then(({ error }) => {
          if (error) console.error("[verify-payment] coupon increment failed:", error)
        })
    }

    /* ── 12. Log successful payment ── */
    log.info("payment", "order verified and tokens issued", {
      order_id:      order.id,
      total_inr:     order.total_inr,
      firebase_uid:  order.firebase_uid ?? "guest",
      item_count:    tokenResults.length,
    })

    /* ── 13. Return success with download tokens ── */
    return NextResponse.json({
      order_id: order.id,
      items:    tokenResults,
    })
  } catch (e) {
    console.error("[verify-payment]", e)
    return err("Internal server error", 500)
  }
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
