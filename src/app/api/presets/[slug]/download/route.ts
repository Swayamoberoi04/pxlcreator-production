/**
 * GET /api/presets/[slug]/download
 *
 * Protected download endpoint.
 * Returns the download URL only if the user has verified access.
 *
 * Security:
 *  - Requires Firebase Bearer token
 *  - Verifies access via user_unlocks or paid orders
 *  - Never exposes the raw download_url in any public response
 *  - Redirects directly so the URL is not visible in JS
 *
 * Future: replace redirect with Supabase signed URL for time-limited access.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient }         from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"

type Params = { params: Promise<{ slug: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const { slug } = await params
  const supabase  = createAdminClient()

  /* ── Fetch preset ── */
  const { data: preset } = await supabase
    .from("presets")
    .select("id, is_free, is_published, download_url, download_file_name")
    .eq("slug", slug)
    .eq("is_published", true)
    .single()

  if (!preset) {
    return NextResponse.json({ error: "Preset not found." }, { status: 404 })
  }

  if (!preset.download_url) {
    return NextResponse.json({ error: "Download not available yet." }, { status: 404 })
  }

  /* ── Access check ── */
  const hasAccess = await checkAccess(uid, preset.id, preset.is_free, supabase)
  if (!hasAccess) {
    return NextResponse.json({ error: "Purchase or unlock required." }, { status: 403 })
  }

  /* ── Increment download counter (fire-and-forget) ── */
  supabase
    .from("presets")
    .update({ download_count: supabase.rpc("increment" as never) } as never)
    .eq("id", preset.id)
    .then(() => {})

  /* ── Return URL as JSON — client opens via window.open(), never fetch() ── */
  return NextResponse.json({ url: preset.download_url })
}

async function checkAccess(
  uid: string,
  presetId: string,
  isFree: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<boolean> {
  if (isFree) return true

  const { data: unlock } = await supabase
    .from("user_unlocks")
    .select("id")
    .eq("firebase_uid", uid)
    .eq("preset_id", presetId)
    .maybeSingle()

  if (unlock) return true

  const { data: orderItem } = await supabase
    .from("order_items")
    .select("id, order:orders!inner(firebase_uid, status)")
    .eq("preset_id", presetId)
    .eq("order.firebase_uid", uid)
    .eq("order.status", "paid")
    .maybeSingle()

  return Boolean(orderItem)
}
