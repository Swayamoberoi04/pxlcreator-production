/**
 * src/lib/checkout/coupons.ts
 *
 * Shared coupon validation logic used by:
 *   - POST /api/checkout/validate-coupon  (preview discount)
 *   - POST /api/checkout/create-order     (apply discount)
 *
 * Returns a typed result — never throws.
 */

import { createAdminClient }   from "@/lib/supabase/admin"
import { USD_TO_INR }          from "@/lib/currency/config"
import type {
  CouponValidationResult,
  CouponValidationError,
} from "@/types/commerce"

export type CouponResult = CouponValidationResult | CouponValidationError

/**
 * Validate a coupon code against the given subtotal.
 *
 * @param code         - The coupon string entered by the user (case-insensitive)
 * @param subtotal_inr - Cart subtotal in INR (before any discount)
 */
export async function validateCoupon(
  code:         string,
  subtotal_inr: number
): Promise<CouponResult> {
  if (!code?.trim()) {
    return { valid: false, error: "No code provided" }
  }

  const supabase = createAdminClient()

  const { data: coupon, error } = await supabase
    .from("coupon_codes")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .eq("is_active", true)
    .maybeSingle()

  if (error || !coupon) {
    return { valid: false, error: "Invalid or expired coupon code" }
  }

  /* Expiry check */
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: "This coupon has expired" }
  }

  /* Usage limit check */
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, error: "This coupon has reached its usage limit" }
  }

  /* Minimum order check */
  if (coupon.min_order_inr !== null && subtotal_inr < coupon.min_order_inr) {
    return {
      valid: false,
      error: `Minimum order of ₹${coupon.min_order_inr} required for this coupon`,
    }
  }

  /* Calculate discount in INR */
  let discount_amount_inr = 0

  if (coupon.discount_type === "percentage") {
    discount_amount_inr = Math.round((subtotal_inr * coupon.discount_value) / 100)
  } else if (coupon.discount_type === "fixed_inr") {
    discount_amount_inr = Math.min(coupon.discount_value, subtotal_inr)
  } else if (coupon.discount_type === "fixed_usd") {
    const inrEquiv      = Math.round(coupon.discount_value * USD_TO_INR)
    discount_amount_inr = Math.min(inrEquiv, subtotal_inr)
  }

  /* Cap discount at subtotal (never go negative) */
  discount_amount_inr = Math.max(0, Math.min(discount_amount_inr, subtotal_inr))

  return {
    valid:               true,
    coupon_id:           coupon.id,
    code:                coupon.code,
    discount_type:       coupon.discount_type,
    discount_value:      coupon.discount_value,
    discount_amount_inr,
    final_total_inr:     subtotal_inr - discount_amount_inr,
  }
}
