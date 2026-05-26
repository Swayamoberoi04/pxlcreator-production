/**
 * POST /api/checkout/create-order
 *
 * Creates a Razorpay order and a PENDING order in our database.
 *
 * Flow:
 *   1. Validate items — re-fetch real prices from Supabase (never trust client prices)
 *   2. Calculate total in INR paise
 *   3. Create PENDING order in our DB
 *   4. Create Razorpay order
 *   5. Return { razorpay_order_id, amount_paise, key_id, our_order_id }
 *
 * The frontend uses razorpay_order_id + key_id to open the Razorpay modal.
 * our_order_id is sent back at verify-payment time to locate the pending order.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient }          from "@/lib/supabase/admin"
import { getRazorpayClient }          from "@/lib/razorpay/client"
import { toInr }                       from "@/lib/currency/format"
import { USD_TO_INR }                 from "@/lib/currency/config"
import { validateCoupon }             from "@/lib/checkout/coupons"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import type { CreateOrderPayload }    from "@/types/commerce"

export const runtime = "nodejs"

// 20 order attempts per hour per IP — allows real checkout retries
// while blocking automated order-spam / DoS on the Razorpay API.
const orderLimiter = makeRateLimiter({ max: 20, windowMs: 60 * 60 * 1000 })

export async function POST(req: NextRequest) {
  /* ── Rate limit ── */
  const ip = getClientIp(req)
  if (orderLimiter.check(ip)) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Please try again in an hour." },
      { status: 429 }
    )
  }
  try {
    const body: CreateOrderPayload = await req.json()
    const { items, email, name, firebase_uid, coupon_code } = body

    /* ── 1. Basic validation ── */
    if (!items?.length)         return err("Cart is empty", 400)
    if (!email?.includes("@"))  return err("Valid email required", 400)
    if (!name?.trim())          return err("Name required", 400)

    /* ── 2. Re-fetch real prices from Supabase ── */
    const supabase   = createAdminClient()
    const preset_ids = items.map((i) => i.preset_id)

    const { data: presets, error: dbErr } = await supabase
      .from("presets")
      .select("id, title, slug, price, is_free, download_url, download_file_name, is_published")
      .in("id", preset_ids)

    if (dbErr) return err("Failed to fetch product data", 500)
    if (!presets?.length) return err("No valid products found", 400)

    /* ── 3. Build validated line items ── */
    type LineItem = {
      preset_id:    string
      preset_slug:  string
      preset_title: string
      price_usd:    number
      price_inr:    number
      quantity:     number
      download_url: string | null
    }

    const lineItems: LineItem[] = []
    for (const cartItem of items) {
      const preset = presets.find((p) => p.id === cartItem.preset_id)
      if (!preset)              continue   // skip unknown presets
      if (!preset.is_published) continue   // skip unpublished
      if (preset.is_free)       continue   // free presets have their own download gate

      const qty = Math.max(1, Math.min(cartItem.quantity, 1)) // digital goods: qty capped at 1
      lineItems.push({
        preset_id:    preset.id,
        preset_slug:  preset.slug,
        preset_title: preset.title,
        price_usd:    Number(preset.price),
        price_inr:    toInr(Number(preset.price)),
        quantity:     qty,
        download_url: preset.download_url,
      })
    }

    if (!lineItems.length) return err("No purchasable items in cart", 400)

    /* ── 4. Calculate totals ── */
    const subtotal_usd = lineItems.reduce((s, i) => s + i.price_usd * i.quantity, 0)
    const subtotal_inr = lineItems.reduce((s, i) => s + i.price_inr * i.quantity, 0)

    /* ── 4a. Validate coupon (server-side — never trust client discount) ── */
    let discount_amount_inr = 0
    let coupon_id: string | null = null

    if (coupon_code?.trim()) {
      const couponResult = await validateCoupon(coupon_code.trim(), subtotal_inr)
      if (!couponResult.valid) {
        return err(couponResult.error, 400)
      }
      discount_amount_inr = couponResult.discount_amount_inr
      coupon_id           = couponResult.coupon_id
    }

    const total_inr    = subtotal_inr - discount_amount_inr
    const amount_paise = total_inr * 100    // Razorpay expects paise

    if (amount_paise < 100) return err("Minimum order is ₹1", 400)

    /* ── 5. Create PENDING order in our DB ── */
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        firebase_uid:        firebase_uid ?? null,
        email:               email.toLowerCase().trim(),
        customer_name:       name.trim(),
        status:              "pending",
        currency_display:    "INR",
        usd_to_inr_rate:     USD_TO_INR,
        subtotal_usd,
        subtotal_inr,
        discount_amount_inr,
        total_inr,
        coupon_id,
      })
      .select("id")
      .single()

    if (orderErr || !order) return err("Failed to create order record", 500)

    /* ── 6. Create PENDING order_items ── */
    await supabase.from("order_items").insert(
      lineItems.map((li) => ({
        order_id:      order.id,
        preset_id:     li.preset_id,
        preset_slug:   li.preset_slug,
        preset_title:  li.preset_title,
        price_usd:     li.price_usd,
        price_inr:     li.price_inr,
        quantity:      li.quantity,
      }))
    )

    /* ── 7. Create Razorpay order ── */
    const rzp = getRazorpayClient()
    const rzpOrder = await rzp.orders.create({
      amount:   Math.round(amount_paise),
      currency: "INR",
      receipt:  `pxl_${order.id.slice(0, 8)}`,
      notes:    { our_order_id: order.id, customer_email: email },
    })

    /* ── 8. Save Razorpay order ID on our order ── */
    await supabase
      .from("orders")
      .update({ razorpay_order_id: rzpOrder.id })
      .eq("id", order.id)

    /* ── 9. Return to frontend ── */
    return NextResponse.json({
      razorpay_order_id: rzpOrder.id,
      amount_paise:      Math.round(amount_paise),
      key_id:            process.env.RAZORPAY_KEY_ID,
      our_order_id:      order.id,
    })
  } catch (e) {
    console.error("[create-order]", e)
    return err("Internal server error", 500)
  }
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
