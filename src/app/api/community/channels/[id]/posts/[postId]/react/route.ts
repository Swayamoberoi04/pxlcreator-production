/**
 * POST  /api/community/channels/[id]/posts/[postId]/react
 *
 * Body: { reaction: "like" | "love" | "fire" | "insightful" | "clap" }
 *
 * Toggle logic:
 *   - Same reaction exists → delete (un-react)
 *   - Different reaction exists → update to new one
 *   - No reaction → insert
 *
 * Writes post_reactions; channel_posts.like_count is maintained by
 * trg_sync_post_like_count (migration 050) and read back for the response.
 * Returns: { user_reaction: string | null, like_count: number }
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { createLogger } from "@/lib/observability/logger"
import { increment } from "@/lib/observability/metrics"

export const runtime = "nodejs"

const log = createLogger("community/channel-react")
const limiter = makeRateLimiter({ max: 60, windowMs: 60 * 60 * 1000 })

const VALID_REACTIONS = ["like", "love", "fire", "insightful", "clap"] as const
type Reaction = typeof VALID_REACTIONS[number]

type Params = { params: Promise<{ id: string; postId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: channelId, postId } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: { reaction?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { reaction } = body
  if (!reaction || !VALID_REACTIONS.includes(reaction as Reaction)) {
    return NextResponse.json(
      { error: `reaction must be one of: ${VALID_REACTIONS.join(", ")}.` },
      { status: 400 }
    )
  }

  try {
    const supabase = createAdminClient()

    // Verify post exists and belongs to this channel
    const { data: post, error: postError } = await supabase
      .from("channel_posts")
      .select("id, channel_id")
      .eq("id", postId)
      .eq("channel_id", channelId)
      .maybeSingle()

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 })
    }

    // Check existing reaction
    const { data: existing } = await supabase
      .from("post_reactions")
      .select("reaction")
      .eq("post_id", postId)
      .eq("firebase_uid", uid)
      .maybeSingle()

    // Each write is checked. Previously all three were fire-and-forget, so a
    // rejected write still returned the new reaction state to the client.
    let userReaction: string | null = null
    let writeError: { code?: string; message: string } | null = null

    if (existing) {
      if (existing.reaction === reaction) {
        // Same reaction — remove it (toggle off)
        const { error } = await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("firebase_uid", uid)
        writeError = error
        userReaction = null
      } else {
        // Different reaction — update. The count is unchanged: like_count has
        // always meant "how many people reacted", not "how many chose 'like'".
        const { error } = await supabase
          .from("post_reactions")
          .update({ reaction })
          .eq("post_id", postId)
          .eq("firebase_uid", uid)
        writeError = error
        userReaction = reaction
      }
    } else {
      const { error } = await supabase.from("post_reactions").insert({
        post_id: postId,
        firebase_uid: uid,
        reaction,
      })
      writeError = error
      userReaction = reaction
    }

    if (writeError) {
      log.error("reaction_write_failed", { postId, channelId, code: writeError.code, message: writeError.message })
      increment("community.write_failed")
      return NextResponse.json({ error: "Could not save your reaction. Please try again." }, { status: 500 })
    }

    // like_count is owned by trg_sync_post_like_count (migration 050).
    const { data: refreshed } = await supabase
      .from("channel_posts")
      .select("like_count")
      .eq("id", postId)
      .maybeSingle()

    return NextResponse.json({
      user_reaction: userReaction,
      like_count: refreshed?.like_count ?? 0,
    })
  } catch (err) {
    log.error("reaction_unexpected", { postId, channelId, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
