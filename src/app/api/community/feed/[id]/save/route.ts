/**
 * POST /api/community/feed/[id]/save
 *
 * Toggle bookmark. Inserts/deletes a post_saves row; save_count on the post
 * is maintained by the trg_sync_post_save_count trigger (migration 045),
 * never incremented from client-supplied numbers.
 *
 * Returns: { saved: boolean, save_count: number }
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { ensureProfile } from "@/lib/community/ensureProfile"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 120, windowMs: 60 * 60 * 1000 })

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: postId } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
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
      .from("post_saves")
      .select("id")
      .eq("post_id", postId)
      .eq("firebase_uid", uid)
      .maybeSingle()

    let saved: boolean
    if (existing) {
      const { error: delError } = await supabase.from("post_saves").delete().eq("id", existing.id)
      if (delError) throw delError
      saved = false
    } else {
      const { error: insError } = await supabase.from("post_saves").insert({ post_id: postId, firebase_uid: uid })
      // 23505 = unique_violation — a concurrent double-click already saved it; treat as success.
      if (insError && insError.code !== "23505") throw insError
      saved = true
    }

    const { data: refreshed } = await supabase
      .from("channel_posts")
      .select("save_count")
      .eq("id", postId)
      .maybeSingle()

    return NextResponse.json({ saved, save_count: refreshed?.save_count ?? 0 })
  } catch (err) {
    console.error("[feed/[id]/save POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
