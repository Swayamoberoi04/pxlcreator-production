/**
 * GET    /api/admin/coupons           — list all coupons
 * POST   /api/admin/coupons           — create a new coupon
 * PATCH  /api/admin/coupons           — update a coupon (toggle active, edit)
 * DELETE /api/admin/coupons?id=xxx    — delete a coupon
 *
 * Admin-only — HMAC cookie session.
 */

import { NextRequest, NextResponse }  from "next/server"
import { createAdminClient }          from "@/lib/supabase/admin"
import { requireAdmin, getAdminSession } from "@/lib/admin/guard"
import { audit }                      from "@/lib/admin/audit"
import type { Database }              from "@/types/database"

type CouponUpdate = Database["public"]["Tables"]["coupon_codes"]["Update"]

export const runtime = "nodejs"

/* ── GET ─────────────────────────────────────────────────── */
export async function GET() {
  const deny = await requireAdmin()
  if (deny) return deny

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("coupon_codes")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[admin/coupons GET]", error)
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 })
  }

  return NextResponse.json({ coupons: data ?? [] })
}

/* ── POST ────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const deny = await requireAdmin()
  if (deny) return deny

  let body: {
    code?:           string
    discount_type?:  string
    discount_value?: number
    min_order_inr?:  number | null
    max_uses?:       number | null
    expires_at?:     string | null
    is_active?:      boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { code, discount_type, discount_value } = body

  if (!code?.trim()) {
    return NextResponse.json({ error: "Coupon code is required." }, { status: 400 })
  }
  if (code.trim().length > 50) {
    return NextResponse.json({ error: "Coupon code must be 50 characters or fewer." }, { status: 400 })
  }
  if (!["percentage", "fixed_inr", "fixed_usd"].includes(discount_type ?? "")) {
    return NextResponse.json(
      { error: "discount_type must be 'percentage', 'fixed_inr', or 'fixed_usd'." },
      { status: 400 }
    )
  }
  if (!discount_value || discount_value <= 0) {
    return NextResponse.json({ error: "discount_value must be greater than 0." }, { status: 400 })
  }
  if (discount_type === "percentage" && discount_value > 100) {
    return NextResponse.json({ error: "Percentage discount cannot exceed 100%." }, { status: 400 })
  }
  if (discount_type === "fixed_inr" && discount_value > 100_000) {
    return NextResponse.json({ error: "Fixed INR discount cannot exceed ₹1,00,000." }, { status: 400 })
  }
  if (discount_type === "fixed_usd" && discount_value > 10_000) {
    return NextResponse.json({ error: "Fixed USD discount cannot exceed $10,000." }, { status: 400 })
  }
  if (body.min_order_inr != null && (Number(body.min_order_inr) < 0)) {
    return NextResponse.json({ error: "min_order_inr must be 0 or greater." }, { status: 400 })
  }
  if (body.max_uses != null && (!Number.isInteger(Number(body.max_uses)) || Number(body.max_uses) < 1)) {
    return NextResponse.json({ error: "max_uses must be a positive integer." }, { status: 400 })
  }
  if (body.expires_at) {
    const expiryDate = new Date(body.expires_at)
    if (isNaN(expiryDate.getTime())) {
      return NextResponse.json({ error: "expires_at must be a valid date." }, { status: 400 })
    }
    if (expiryDate <= new Date()) {
      return NextResponse.json({ error: "expires_at must be a future date." }, { status: 400 })
    }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("coupon_codes")
    .insert({
      code:           code.trim().toUpperCase(),
      discount_type:  body.discount_type as "percentage" | "fixed_inr" | "fixed_usd",
      discount_value: body.discount_value!,
      min_order_inr:  body.min_order_inr  ?? null,
      max_uses:       body.max_uses       ?? null,
      expires_at:     body.expires_at     ?? null,
      is_active:      body.is_active      ?? true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 })
    }
    console.error("[admin/coupons POST]", error)
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 })
  }

  const s = await getAdminSession()
  await audit({ event: "coupon.create", email: s?.email, targetId: data?.id, meta: { code: data?.code } })
  return NextResponse.json({ coupon: data }, { status: 201 })
}

/* ── PATCH ───────────────────────────────────────────────── */
export async function PATCH(req: NextRequest) {
  const deny = await requireAdmin()
  if (deny) return deny

  let body: { id?: string; [key: string]: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  /* Only allow safe fields to be updated */
  const safeUpdates: CouponUpdate = {}

  if ("code"           in updates) safeUpdates.code           = String(updates["code"]).trim().toUpperCase()
  if ("discount_value" in updates) safeUpdates.discount_value = updates["discount_value"] as number
  if ("min_order_inr"  in updates) safeUpdates.min_order_inr  = (updates["min_order_inr"] as number | null)
  if ("max_uses"       in updates) safeUpdates.max_uses        = (updates["max_uses"]      as number | null)
  if ("expires_at"     in updates) safeUpdates.expires_at      = (updates["expires_at"]    as string | null)
  if ("is_active"      in updates) safeUpdates.is_active       = updates["is_active"] as boolean

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("coupon_codes")
    .update(safeUpdates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[admin/coupons PATCH]", error)
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 })
  }

  const s = await getAdminSession()
  await audit({ event: "coupon.update", email: s?.email, targetId: String(id), meta: { fields: Object.keys(safeUpdates) } })
  return NextResponse.json({ coupon: data })
}

/* ── DELETE ──────────────────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  const deny = await requireAdmin()
  if (deny) return deny

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("coupon_codes")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[admin/coupons DELETE]", error)
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 })
  }

  const s = await getAdminSession()
  await audit({ event: "coupon.delete", outcome: "success", email: s?.email, targetId: id })
  return NextResponse.json({ success: true })
}
