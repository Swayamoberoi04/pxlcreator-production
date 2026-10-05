/**
 * GET /api/admin/sellers?status=applied|approved|suspended|rejected
 *
 * Phase 5.10.2 admin queue. Each row carries the applicant's profile and a
 * LIVE eligibility evaluation, so a reviewer sees today's facts, not the
 * facts at application time.
 *
 * Permission: sellers:read
 */

import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin/permissions"
import { createAdminClient } from "@/lib/supabase/admin"
import { evaluateSellerEligibility } from "@/lib/monetization/eligibility"
import type { SellerAccountStatus } from "@/types/database"
import type { SellerAdminRow } from "@/types/monetization"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const STATUSES: SellerAccountStatus[] = ["applied", "approved", "suspended", "rejected"]

export async function GET(req: NextRequest) {
  const deny = await requirePermission("sellers:read")
  if (deny) return deny

  const status = new URL(req.url).searchParams.get("status") as SellerAccountStatus | null
  const supabase = createAdminClient()

  let q = supabase.from("creator_seller_accounts").select("*").order("applied_at", { ascending: true }).limit(100)
  if (status && STATUSES.includes(status)) q = q.eq("status", status)
  const { data: accounts, error } = await q
  if (error) return NextResponse.json({ error: "Couldn't load sellers." }, { status: 500 })

  const uids = (accounts ?? []).map((a) => a.firebase_uid)
  const { data: profiles } = uids.length
    ? await supabase.from("community_profiles").select("firebase_uid, username, display_name, avatar_url, is_banned").in("firebase_uid", uids)
    : { data: [] }
  type P = { firebase_uid: string; username: string; display_name: string | null; avatar_url: string | null; is_banned: boolean }
  const pmap = new Map(((profiles ?? []) as P[]).map((p) => [p.firebase_uid, p]))

  // Bounded (100 rows) and only for the queue an admin is looking at.
  const rows: SellerAdminRow[] = await Promise.all(
    (accounts ?? []).map(async (a) => {
      const p = pmap.get(a.firebase_uid)
      return {
        ...a,
        profile: p ? { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url, is_banned: p.is_banned } : null,
        eligibility: await evaluateSellerEligibility(a.firebase_uid),
      }
    })
  )

  const counts: Record<string, number> = {}
  for (const s of STATUSES) {
    counts[s] = (await supabase.from("creator_seller_accounts").select("firebase_uid", { count: "exact", head: true }).eq("status", s)).count ?? 0
  }

  return NextResponse.json({ sellers: rows, counts })
}
