/**
 * PATCH /api/admin/sellers/[uid]
 * Body: { action: "approve" | "reject" | "suspend" | "reinstate", note?: string }
 *
 * Phase 5.10.2. The ONLY path that can make someone a seller.
 *
 *   approve    applied   → approved   (eligibility re-checked now; refused if not eligible)
 *   reject     applied   → rejected   (note required — shown to the applicant)
 *   suspend    approved  → suspended  (note required)
 *   reinstate  suspended → approved   (eligibility re-checked now)
 *
 * Every transition is a conditional update on the expected current status,
 * so two reviewers acting at once can't both succeed. reviewed_by is the
 * signed-in admin's email from the session, never from the body. Every
 * outcome, including refusals, goes to admin_audit_log.
 *
 * Permission: sellers:review
 */

import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin/permissions"
import { getAdminSession } from "@/lib/admin/guard"
import { audit } from "@/lib/admin/audit"
import { createAdminClient } from "@/lib/supabase/admin"
import { evaluateSellerEligibility } from "@/lib/monetization/eligibility"
import type { SellerAccountStatus } from "@/types/database"
import type { SellerAdminAction } from "@/types/monetization"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RouteContext = { params: Promise<{ uid: string }> }

const TRANSITIONS: Record<SellerAdminAction, { from: SellerAccountStatus; to: SellerAccountStatus; needsNote: boolean; recheck: boolean }> = {
  approve:   { from: "applied",   to: "approved",  needsNote: false, recheck: true },
  reject:    { from: "applied",   to: "rejected",  needsNote: true,  recheck: false },
  suspend:   { from: "approved",  to: "suspended", needsNote: true,  recheck: false },
  reinstate: { from: "suspended", to: "approved",  needsNote: false, recheck: true },
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const deny = await requirePermission("sellers:review")
  if (deny) return deny
  const session = await getAdminSession()
  const email = session?.email ?? null

  const { uid } = await ctx.params
  const body = (await req.json().catch(() => null)) as { action?: unknown; note?: unknown } | null
  const action = body?.action as SellerAdminAction | undefined
  const t = action ? TRANSITIONS[action] : undefined
  if (!t) return NextResponse.json({ error: "action must be approve, reject, suspend or reinstate." }, { status: 400 })

  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 1000) : ""
  if (t.needsNote && !note) return NextResponse.json({ error: "A note is required — the creator will see it." }, { status: 400 })

  const path = `/api/admin/sellers/${uid}`
  const supabase = createAdminClient()

  const { data: current } = await supabase.from("creator_seller_accounts").select("status").eq("firebase_uid", uid).maybeSingle()
  if (!current) return NextResponse.json({ error: "Seller application not found." }, { status: 404 })
  if (current.status !== t.from) {
    return NextResponse.json({ error: `Can't ${action} an account that is ${current.status}.` }, { status: 409 })
  }

  if (t.recheck) {
    const eligibility = await evaluateSellerEligibility(uid)
    if (!eligibility.eligible) {
      await audit({ event: `seller.${action}`, outcome: "denied", email, path, method: "PATCH", targetId: uid,
        meta: { reason: "not_eligible", failed: eligibility.checks.filter((c) => !c.passed).map((c) => c.id) } })
      return NextResponse.json({ error: "This creator no longer meets the requirements.", eligibility }, { status: 422 })
    }
  }

  const now = new Date().toISOString()
  const { data: updated, error } = await supabase
    .from("creator_seller_accounts")
    .update({ status: t.to, reviewed_by: email ?? "admin", reviewed_at: now, review_note: note || null, updated_at: now })
    .eq("firebase_uid", uid)
    .eq("status", t.from) // lost a race with another reviewer → 0 rows
    .select("*")
    .maybeSingle()

  if (error) {
    await audit({ event: `seller.${action}`, outcome: "error", email, path, method: "PATCH", targetId: uid, meta: { code: error.code } })
    return NextResponse.json({ error: "Couldn't update the seller." }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ error: "Someone else updated this seller first. Refresh and try again." }, { status: 409 })
  }

  await audit({ event: `seller.${action}`, outcome: "success", email, path, method: "PATCH", targetId: uid, meta: { from: t.from, to: t.to } })
  return NextResponse.json({ seller: updated })
}
