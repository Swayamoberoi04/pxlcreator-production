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
 * Decrements the parent post's comment_count for real; cascades any replies
 * (post_comments.parent_id references this table ON DELETE CASCADE).
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

type Params = { params: Promise<{ commentId: string }> }

export async function DELETE(req: NextRequest, { params }: Params) {
  const { commentId } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

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

    // Count replies too — deleting a parent comment removes its whole thread,
    // and comment_count should reflect exactly how many rows disappear.
    const { count: replyCount } = await supabase
      .from("post_comments")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", commentId)

    const { error: deleteError } = await supabase.from("post_comments").delete().eq("id", commentId)
    if (deleteError) {
      console.error("[comments/[commentId] DELETE]", deleteError)
      return NextResponse.json({ error: "Failed to delete comment." }, { status: 500 })
    }

    const { data: post } = await supabase
      .from("channel_posts")
      .select("comment_count")
      .eq("id", comment.post_id)
      .maybeSingle()
    if (post) {
      const removed = 1 + (replyCount ?? 0)
      await supabase
        .from("channel_posts")
        .update({ comment_count: Math.max(0, (post.comment_count ?? 0) - removed) })
        .eq("id", comment.post_id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[comments/[commentId] DELETE] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
