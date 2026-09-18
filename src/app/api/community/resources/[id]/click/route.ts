/**
 * POST /api/community/resources/[id]/click
 *
 * Logs a real outbound click on a resource's destination URL. click_count is
 * synced by trg_sync_resource_click_count (migration 047) — never a
 * client-supplied number, and never shown as anything other than what it is
 * (raw outbound clicks, not unique visitors).
 *
 * Auth optional — clicker_uid is recorded when available.
 * Returns the destination so the caller can verify it matches where it's going.
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

const limiter = makeRateLimiter({ max: 240, windowMs: 60 * 60 * 1000 })

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: resourceId } = await params
  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  const uid = await getFirebaseUidFromRequest(req)

  try {
    const supabase = createAdminClient()
    const { data: resource } = await supabase
      .from("creator_resources")
      .select("id, url, status")
      .eq("id", resourceId)
      .maybeSingle()

    if (!resource || resource.status !== "published") {
      return NextResponse.json({ error: "Resource not found." }, { status: 404 })
    }

    const { error } = await supabase
      .from("resource_clicks")
      .insert({ resource_id: resourceId, clicker_uid: uid ?? null })
    if (error) {
      console.error("[resources/[id]/click POST]", error)
      return NextResponse.json({ error: "Failed to log click." }, { status: 500 })
    }

    return NextResponse.json({ counted: true, url: resource.url })
  } catch (err) {
    console.error("[resources/[id]/click POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
