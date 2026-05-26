/**
 * src/types/commerce.ts
 *
 * TypeScript types for PXL Creator's commerce system.
 * These types are used across API routes, components, and utilities.
 */

/* ── Currency ─────────────────────────────────────────────── */

export type SupportedCurrency = "USD" | "INR"

export interface CurrencyConfig {
  code:       SupportedCurrency
  symbol:     string
  locale:     string
}

/* ── Cart checkout payload ────────────────────────────────── */

export interface CheckoutItem {
  preset_id: string
  quantity:  number
}

export interface CreateOrderPayload {
  items:        CheckoutItem[]
  email:        string
  name:         string
  firebase_uid?: string
  coupon_code?:  string        // optional — validated server-side
}

/* ── Coupon ───────────────────────────────────────────────── */

export type CouponDiscountType = "percentage" | "fixed_inr" | "fixed_usd"

export interface CouponValidationResult {
  valid:                true
  coupon_id:            string
  code:                 string
  discount_type:        CouponDiscountType
  discount_value:       number
  discount_amount_inr:  number   // computed discount in INR for this cart
  final_total_inr:      number   // subtotal_inr - discount_amount_inr
}

export interface CouponValidationError {
  valid:   false
  error:   string
}

/* ── Razorpay API responses ───────────────────────────────── */

export interface RazorpayOrderResponse {
  razorpay_order_id: string
  amount_paise:      number    // INR × 100
  key_id:            string
  our_order_id:      string    // pending order in our DB (before payment)
}

export interface RazorpayVerifyPayload {
  razorpay_payment_id: string
  razorpay_order_id:   string
  razorpay_signature:  string
  our_order_id:        string
}

/* ── Order status lifecycle ───────────────────────────────── */

export type OrderStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded"

export type PaymentTransactionStatus =
  | "created"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"

/* ── Download token ───────────────────────────────────────── */

export interface DownloadTokenResult {
  token:        string
  preset_title: string
  preset_slug:  string
}

/* ── Verify payment success response ─────────────────────── */

export interface VerifyPaymentSuccess {
  order_id:  string
  items:     DownloadTokenResult[]
}

/* ── Order summary (for account library & success page) ──── */

export interface OrderSummary {
  id:               string
  status:           OrderStatus
  total_inr:        number
  subtotal_usd:     number
  created_at:       string
  paid_at:          string | null
  items:            OrderItemSummary[]
}

export interface OrderItemSummary {
  id:            string
  preset_id:     string
  preset_slug:   string
  preset_title:  string
  price_usd:     number
  price_inr:     number
  quantity:      number
  download:      DownloadInfo | null
}

export interface DownloadInfo {
  token:          string
  expires_at:     string
  download_count: number
  max_downloads:  number
}

/* ── Admin metrics ────────────────────────────────────────── */

export interface CommerceMetrics {
  total_orders:       number
  paid_orders:        number
  total_revenue_inr:  number
  total_revenue_usd:  number
  this_month_inr:     number
  avg_order_inr:      number
}

/* ── Subscription (future PXL Premium) ───────────────────── */

export type SubscriptionPlan   = "premium" | "pro" | "creator"
export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trial" | "inactive"

export interface SubscriptionSummary {
  plan:               SubscriptionPlan
  status:             SubscriptionStatus
  current_period_end: string | null
}
