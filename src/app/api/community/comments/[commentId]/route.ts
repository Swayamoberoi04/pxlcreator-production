/**
 * DELETE /api/community/comments/[commentId]
 *
 * Ownership-checked comment deletion. This route did not exist before Phase
 * 5.3 — neither the channel-post comments route nor the feed one had a way
 * for a user to delete their own comment (only admin moderation could).
 * Written once here since post_comments.post_id points at channel_posts
 * regardless of whether that post is a channel post or a main-feed post, so
 * this single route serves both.
 *
 * Cascades any replies (post_comments.parent_id references this table ON
 * DELETE CASCADE). The parent post's comment_count is recomputed by
 * trg_sync_post_comment_count (migration 050), so the whole cascaded subtree
 * is accounted for, not just the direct children.
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createLogger } from "@/lib/observability/logger"
import { increment } from "@/lib/observability/metrics"
import { guardMutation } from "@/lib/community/guard"

export const runtime = "nodejs"

const log = createLogger("community/comments")

type Params = { params: Promise<{ commentId: string }> }

export async function DELETE(req: NextRequest, { params }: Params) {
  const { commentId } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const limited = guardMutation(req, uid, "comment-delete")
  if (limited) return limited

  try {
    const supabase = createAdminClient()

    const { data: comment, error: fetchError } = await supabase
      .from("post_comments")
      .select("id, author_uid, post_id")
      .eq("id", commentId)
      .maybeSingle()

    if (fetchError || !comment) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 })
    }
    if (comment.author_uid !== uid) {
      return NextResponse.json({ error: "You can only delete your own comments." }, { status: 403 })
    }

    const { error: deleteError } = await supabase.from("post_comments").delete().eq("id", commentId)
    if (deleteError) {
      log.error("comment_delete_failed", { commentId, code: deleteError.code, message: deleteError.message })
      increment("community.write_failed")
      return NextResponse.json({ error: "Failed to delete comment." }, { status: 500 })
    }

    // comment_count is maintained by trg_sync_post_comment_count (migration
    // 050), which recounts the post after the cascade has run. The old manual
    // subtraction here was both racy and wrong: it removed 1 + direct replies,
    // so a nested reply three levels down was deleted by the cascade but never
    // subtracted from the count.
    const { data: post } = await supabase
      .from("channel_posts")
      .select("comment_count")
      .eq("id", comment.post_id)
      .maybeSingle()

    return NextResponse.json({ success: true, comment_count: post?.comment_count ?? 0 })
  } catch (err) {
    log.error("comment_delete_unexpected", { commentId, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
