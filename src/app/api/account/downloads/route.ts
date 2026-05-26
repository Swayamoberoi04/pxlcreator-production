/**
 * GET /api/account/downloads
 *
 * Returns all active download tokens for the authenticated user.
 * Used on the account/library page to show "Download" buttons.
 *
 * A token is shown as long as:
 *   - expires_at is in the future
 *   - download_count < max_downloads
 *
 * Requires:  Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse }  from "next/server"
import { createAdminClient }          from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }  from "@/lib/account/auth"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const firebaseUid = await getFirebaseUidFromRequest(req)
  if (!firebaseUid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: tokens, error } = await supabase
    .from("download_tokens")
    .select(`
      id,
      token,
      preset_title,
      preset_slug,
      download_url,
      expires_at,
      download_count,
      max_downloads,
      last_downloaded,
      created_at
    `)
    .eq("firebase_uid", firebaseUid)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[account/downloads]", error)
    return NextResponse.json({ error: "Failed to fetch downloads" }, { status: 500 })
  }

  /* Annotate each token with whether it's still usable */
  const now = Date.now()
  const enriched = (tokens ?? []).map((t) => ({
    ...t,
    is_expired:   new Date(t.expires_at).getTime() < now,
    is_exhausted: t.download_count >= t.max_downloads,
    can_download: new Date(t.expires_at).getTime() >= now && t.download_count < t.max_downloads,
  }))

  return NextResponse.json({ downloads: enriched })
}
