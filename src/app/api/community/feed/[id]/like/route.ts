/**
 * POST /api/community/feed/[id]/like
 *
 * Body: { reaction?: "like" | "love" | "fire" | "insightful" | "clap" } (default "like")
 *
 * Same toggle logic as the existing channel-post reaction route (same
 * post_reactions table, same like_count column) — this is the feed-post
 * equivalent with no channel to scope through.
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { ensureProfile } from "@/lib/community/ensureProfile"
import { createLogger } from "@/lib/observability/logger"
import { increment } from "@/lib/observability/metrics"

export const runtime = "nodejs"

const log = createLogger("community/feed-like")

const limiter = makeRateLimiter({ max: 120, windowMs: 60 * 60 * 1000 })
const VALID_REACTIONS = ["like", "love", "fire", "insightful", "clap"] as const
type Reaction = typeof VALID_REACTIONS[number]

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: postId } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: { reaction?: string }
  try {
    body = await req.json().catch(() => ({}))
  } catch {
    body = {}
  }
  const reaction = (body.reaction ?? "like") as Reaction
  if (!VALID_REACTIONS.includes(reaction)) {
    return NextResponse.json({ error: `reaction must be one of: ${VALID_REACTIONS.join(", ")}.` }, { status: 400 })
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
      .from("post_reactions")
      .select("reaction")
      .eq("post_id", postId)
      .eq("firebase_uid", uid)
      .maybeSingle()

    // Every branch checks its own error. Previously these three writes were
    // fire-and-forget: if the write failed the route still returned the new
    // reaction state, so the UI showed a like that was never stored.
    let userReaction: string | null = null
    let writeError: { code?: string; message: string } | null = null

    if (existing) {
      if (existing.reaction === reaction) {
        const { error } = await supabase.from("post_reactions").delete().eq("post_id", postId).eq("firebase_uid", uid)
        writeError = error
        userReaction = null
      } else {
        const { error } = await supabase.from("post_reactions").update({ reaction }).eq("post_id", postId).eq("firebase_uid", uid)
        writeError = error
        userReaction = reaction
      }
    } else {
      const { error } = await supabase.from("post_reactions").insert({ post_id: postId, firebase_uid: uid, reaction })
      writeError = error
      userReaction = reaction
    }

    if (writeError) {
      log.error("reaction_write_failed", { postId, code: writeError.code, message: writeError.message })
      increment("community.write_failed")
      return NextResponse.json({ error: "Could not save your reaction. Please try again." }, { status: 500 })
    }

    // like_count is owned by trg_sync_post_like_count (migration 050); read it
    // back so the client shows the committed number rather than a local guess.
    const { data: refreshed } = await supabase
      .from("channel_posts")
      .select("like_count")
      .eq("id", postId)
      .maybeSingle()

    return NextResponse.json({ user_reaction: userReaction, like_count: refreshed?.like_count ?? 0 })
  } catch (err) {
    log.error("reaction_unexpected", { postId, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
