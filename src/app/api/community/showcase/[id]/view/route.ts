/**
 * POST /api/community/showcase/[id]/view
 *
 * Logs a real page view; view_count is synced by trg_sync_showcase_view_count
 * (migration 046) — never a client-supplied number. A page-view count, not a
 * unique-visitor count. The owner viewing their own item is not counted.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 180, windowMs: 60 * 60 * 1000 })

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: showcaseId } = await params
  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  const uid = await getFirebaseUidFromRequest(req)

  try {
    const supabase = createAdminClient()
    const { data: item } = await supabase
      .from("showcase_items")
      .select("id, author_uid, is_removed")
      .eq("id", showcaseId)
      .maybeSingle()
    if (!item || item.is_removed) return NextResponse.json({ error: "Not found." }, { status: 404 })

    if (uid === item.author_uid) {
      return NextResponse.json({ counted: false })
    }

    const { error } = await supabase.from("showcase_views").insert({ showcase_id: showcaseId, viewer_uid: uid ?? null })
    if (error) {
      console.error("[showcase/[id]/view POST]", error)
      return NextResponse.json({ error: "Failed to log view." }, { status: 500 })
    }

    return NextResponse.json({ counted: true })
  } catch (err) {
    console.error("[showcase/[id]/view POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
