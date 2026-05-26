/**
 * src/lib/currency/format.ts
 *
 * Price formatting utility for dual USD/INR display.
 *
 * Usage:
 *   import { formatPrice, toInrPaise } from "@/lib/currency/format"
 *   formatPrice(29, "USD")  → "$29.00"
 *   formatPrice(29, "INR")  → "₹2,436"
 *   toInrPaise(29)          → 243600  (for Razorpay)
 */

import { USD_TO_INR } from "./config"
import type { SupportedCurrency } from "@/types/commerce"

export function formatPrice(usdAmount: number, currency: SupportedCurrency): string {
  if (currency === "INR") {
    const inr = Math.round(usdAmount * USD_TO_INR)
    return "₹" + inr.toLocaleString("en-IN")
  }
  return "$" + usdAmount.toFixed(2)
}

/** Returns INR amount (not paise). Used for display at checkout. */
export function toInr(usdAmount: number): number {
  return Math.round(usdAmount * USD_TO_INR)
}

/** Returns paise (INR × 100). Used as Razorpay `amount` field. */
export function toInrPaise(usdAmount: number): number {
  return Math.round(usdAmount * USD_TO_INR * 100)
}

/** Compact dual-label: "$29 / ₹2,436" for cart/checkout display */
export function formatDual(usdAmount: number): string {
  return `$${usdAmount.toFixed(2)} / ₹${Math.round(usdAmount * USD_TO_INR).toLocaleString("en-IN")}`
}
