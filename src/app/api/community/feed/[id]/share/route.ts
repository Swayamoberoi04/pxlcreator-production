/**
 * POST /api/community/feed/[id]/share
 *
 * Body: { share_type?: "repost" | "link" } (default "link")
 *
 * Toggle. Records a real, persistent share/repost — never fabricates
 * cross-platform delivery or view counts. share_count is maintained by the
 * trg_sync_post_share_count trigger (migration 045).
 *
 * NOTE (scoped deliberately): this does not inject a copy of the post into
 * followers' feeds as a "repost" entry — that's a real feature but a bigger
 * one (quote/repost rendering, recursive-share handling) left for a later
 * phase. What's real here: the share is persisted, counted, and idempotent
 * per user, and a "repost" share type is distinguished from a plain "copied
 * link" share for when that feature lands.
 *
 * Returns: { shared: boolean, share_count: number }
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { ensureProfile } from "@/lib/community/ensureProfile"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 60, windowMs: 60 * 60 * 1000 })
const VALID_TYPES = ["repost", "link"] as const

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: postId } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: { share_type?: string } = {}
  try {
    body = await req.json()
  } catch { /* body is optional */ }

  const shareType = (body.share_type ?? "link") as typeof VALID_TYPES[number]
  if (!VALID_TYPES.includes(shareType)) {
    return NextResponse.json({ error: `share_type must be one of: ${VALID_TYPES.join(", ")}.` }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { data: post, error: postError } = await supabase
      .from("channel_posts")
      .select("id, is_removed")
      .eq("id", postId)
      .maybeSingle()
    if (postError || !post || post.is_removed) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 })
    }

    await ensureProfile(uid)

    const { data: existing } = await supabase
      .from("post_shares")
      .select("id")
      .eq("post_id", postId)
      .eq("firebase_uid", uid)
      .maybeSingle()

    let shared: boolean
    if (existing) {
      const { error: delError } = await supabase.from("post_shares").delete().eq("id", existing.id)
      if (delError) throw delError
      shared = false
    } else {
      const { error: insError } = await supabase
        .from("post_shares")
        .insert({ post_id: postId, firebase_uid: uid, share_type: shareType })
      if (insError && insError.code !== "23505") throw insError
      shared = true
    }

    const { data: refreshed } = await supabase
      .from("channel_posts")
      .select("share_count")
      .eq("id", postId)
      .maybeSingle()

    return NextResponse.json({ shared, share_count: refreshed?.share_count ?? 0 })
  } catch (err) {
    console.error("[feed/[id]/share POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
