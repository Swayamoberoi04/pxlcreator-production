/**
 * POST /api/checkout/validate-coupon
 *
 * Called by the checkout form when the user enters a coupon code.
 * Returns the discount amount so the frontend can preview the saving.
 *
 * Body: { code: string; subtotal_inr: number }
 *
 * Does NOT increment used_count — that happens only after successful payment.
 */

import { NextRequest, NextResponse } from "next/server"
import { validateCoupon }            from "@/lib/checkout/coupons"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  let body: { code?: string; subtotal_inr?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { code, subtotal_inr } = body

  if (!code?.trim()) {
    return NextResponse.json({ valid: false, error: "Code is required" })
  }
  if (!subtotal_inr || subtotal_inr <= 0) {
    return NextResponse.json({ valid: false, error: "Invalid subtotal" })
  }

  const result = await validateCoupon(code, subtotal_inr)
  return NextResponse.json(result)
}
