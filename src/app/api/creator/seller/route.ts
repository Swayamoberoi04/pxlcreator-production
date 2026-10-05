/**
 * GET  /api/creator/seller  → SellerStatusResponse (own account + live eligibility)
 * POST /api/creator/seller  → apply (or re-apply after a rejection cooldown)
 *
 * Phase 5.10.2. Fail-closed by construction:
 *   • the uid comes only from a verified Firebase ID token;
 *   • the request body is ignored — there is nothing a client can send to
 *     influence status, fees, review fields or eligibility;
 *   • eligibility is recomputed server-side on every apply;
 *   • applying can only ever produce status 'applied'. Only an admin route
 *     (/api/admin/sellers/[uid]) can approve, and it re-checks eligibility.
 *   • creator_seller_accounts is service-role only (054), so nothing reaches
 *     it except these server routes.
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { guardMutation } from "@/lib/community/guard"
import { createLogger } from "@/lib/observability/logger"
import { evaluateSellerEligibility, SELLER_REAPPLY_COOLDOWN_DAYS } from "@/lib/monetization/eligibility"
import type { SellerAccountForApplicant, SellerAccountRow, SellerStatusResponse } from "@/types/monetization"

export const runtime = "nodejs"

const log = createLogger("monetization/seller-apply")
const DAY = 86_400_000

function reapplyAt(row: SellerAccountRow): string | null {
  if (row.status !== "rejected" || !row.reviewed_at) return null
  return new Date(Date.parse(row.reviewed_at) + SELLER_REAPPLY_COOLDOWN_DAYS * DAY).toISOString()
}

function forApplicant(row: SellerAccountRow): SellerAccountForApplicant {
  return {
    status: row.status,
    applied_at: row.applied_at,
    reviewed_at: row.reviewed_at,
    review_note: row.status === "rejected" || row.status === "suspended" ? row.review_note : null,
    payout_status: "not_enabled",
    can_reapply_at: reapplyAt(row),
    can_apply_now: row.status === "rejected" && (!reapplyAt(row) || Date.parse(reapplyAt(row)!) <= Date.now()),
  }
}

async function loadAccount(uid: string): Promise<SellerAccountRow | null> {
  const { data, error } = await createAdminClient()
    .from("creator_seller_accounts")
    .select("*")
    .eq("firebase_uid", uid)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function GET(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  try {
    const [account, eligibility] = await Promise.all([loadAccount(uid), evaluateSellerEligibility(uid)])
    const body: SellerStatusResponse = { account: account ? forApplicant(account) : null, eligibility }
    return NextResponse.json(body)
  } catch (err) {
    log.error("status_failed", { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: "Couldn't load your seller status." }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  const limited = guardMutation(req, uid, "seller-apply")
  if (limited) return limited

  try {
    const supabase = createAdminClient()
    const existing = await loadAccount(uid)

    if (existing?.status === "approved" || existing?.status === "applied") {
      // Idempotent: applying twice changes nothing.
      return NextResponse.json({ account: forApplicant(existing) })
    }
    if (existing?.status === "suspended") {
      return NextResponse.json({ error: "Your seller account is suspended. Contact support." }, { status: 403 })
    }
    if (existing?.status === "rejected") {
      const at = reapplyAt(existing)
      if (at && Date.parse(at) > Date.now()) {
        return NextResponse.json({ error: "You can apply again later.", can_reapply_at: at }, { status: 409 })
      }
    }

    const eligibility = await evaluateSellerEligibility(uid)
    if (!eligibility.eligible) {
      return NextResponse.json({ error: "You don't meet the seller requirements yet.", eligibility }, { status: 422 })
    }

    let row: SellerAccountRow | null = null
    if (!existing) {
      const { data, error } = await supabase
        .from("creator_seller_accounts")
        .insert({ firebase_uid: uid, status: "applied" })
        .select("*")
        .single()
      if (error?.code === "23505") row = await loadAccount(uid) // concurrent double-submit
      else if (error) throw new Error(error.message)
      else row = data
    } else {
      // Re-application after a rejection: conditional on still being
      // 'rejected', so a concurrent admin action can't be overwritten.
      const { data, error } = await supabase
        .from("creator_seller_accounts")
        .update({
          status: "applied", applied_at: new Date().toISOString(),
          reviewed_by: null, reviewed_at: null, review_note: null, updated_at: new Date().toISOString(),
        })
        .eq("firebase_uid", uid)
        .eq("status", "rejected")
        .select("*")
        .maybeSingle()
      if (error) throw new Error(error.message)
      row = data ?? (await loadAccount(uid))
    }

    if (!row) throw new Error("application not recorded")
    log.info("applied", { reapply: Boolean(existing) })
    return NextResponse.json({ account: forApplicant(row) }, { status: existing ? 200 : 201 })
  } catch (err) {
    log.error("apply_failed", { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: "Couldn't submit your application. Please try again." }, { status: 500 })
  }
}
