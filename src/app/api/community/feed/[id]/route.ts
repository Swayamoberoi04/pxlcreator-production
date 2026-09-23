/**
 * GET/PATCH/DELETE /api/community/feed/[id] — a single feed post
 *
 * GET: public for a 'public' post; requires the viewer to follow the author
 *      for a 'followers' post; requires ownership for a removed/private one.
 * PATCH/DELETE: ownership enforced server-side against the verified Firebase
 *      UID — this project authenticates with Firebase, not Supabase Auth, so
 *      there is no auth.uid() for RLS to key on; every other module in this
 *      codebase enforces ownership the same way (see e.g. /api/community/profile).
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { Validator } from "@/lib/api/validate"
import { enrichPosts } from "@/lib/community/feed"
import { guardMutation } from "@/lib/community/guard"
import { CONTENT_KINDS } from "@/types/community"

export const runtime = "nodejs"

const VALID_KINDS = CONTENT_KINDS.map((k) => k.id)

type Params = { params: Promise<{ id: string }> }

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const uid = await getFirebaseUidFromRequest(req) // optional

  try {
    const supabase = createAdminClient()
    const { data: post, error } = await supabase
      .from("channel_posts")
      .select("*")
      .eq("id", id)
      .is("channel_id", null)
      .maybeSingle()

    if (error || !post || post.is_removed) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 })
    }

    const isOwner = uid === post.author_uid
    if (!isOwner && post.visibility === "followers") {
      if (!uid) return NextResponse.json({ error: "Post not found." }, { status: 404 })
      const { data: followRow } = await supabase
        .from("creator_follows")
        .select("follower_uid")
        .eq("follower_uid", uid)
        .eq("following_uid", post.author_uid)
        .maybeSingle()
      if (!followRow) return NextResponse.json({ error: "Post not found." }, { status: 404 })
    }

    const [enriched] = await enrichPosts(supabase, [post as never], uid)
    return NextResponse.json({ post: enriched })
  } catch (err) {
    console.error("[feed/[id] GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── PATCH ───────────────────────────────────────────────── */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const limited = guardMutation(req, uid, "feed-edit")
  if (limited) return limited

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const v = new Validator(body)
  if (body.body !== undefined) v.maxLen("body", 5000)
  if (body.title !== undefined) v.maxLen("title", 200)
  if (body.content_kind !== undefined) v.oneOf("content_kind", VALID_KINDS)
  if (body.visibility !== undefined) v.oneOf("visibility", ["public", "followers"])
  if (v.hasErrors()) {
    return NextResponse.json({ errors: v.errors() }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: existing, error: fetchError } = await supabase
      .from("channel_posts")
      .select("id, author_uid")
      .eq("id", id)
      .is("channel_id", null)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 })
    }
    if (existing.author_uid !== uid) {
      return NextResponse.json({ error: "You can only edit your own posts." }, { status: 403 })
    }

    const allowed = ["title", "body", "content_kind", "ai_assisted", "hashtags", "visibility"] as const
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = body[field]
    }

    const { data: updated, error: updateError } = await supabase
      .from("channel_posts")
      .update(updates as never)
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) {
      console.error("[feed/[id] PATCH]", updateError)
      return NextResponse.json({ error: "Failed to update post." }, { status: 500 })
    }

    const [enriched] = await enrichPosts(supabase, [updated as never], uid)
    return NextResponse.json({ post: enriched })
  } catch (err) {
    console.error("[feed/[id] PATCH] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── DELETE ──────────────────────────────────────────────── */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const limited = guardMutation(req, uid, "feed-edit")
  if (limited) return limited

  try {
    const supabase = createAdminClient()
    const { data: existing, error: fetchError } = await supabase
      .from("channel_posts")
      .select("id, author_uid")
      .eq("id", id)
      .is("channel_id", null)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 })
    }
    if (existing.author_uid !== uid) {
      return NextResponse.json({ error: "You can only delete your own posts." }, { status: 403 })
    }

    // Hard delete: post_media/post_saves/post_shares/post_reactions/post_comments
    // all cascade via FK. Real post_count decrement, floor 0.
    const { error: deleteError } = await supabase.from("channel_posts").delete().eq("id", id)
    if (deleteError) {
      console.error("[feed/[id] DELETE]", deleteError)
      return NextResponse.json({ error: "Failed to delete post." }, { status: 500 })
    }

    const { data: authorProfile } = await supabase
      .from("community_profiles")
      .select("post_count")
      .eq("firebase_uid", uid)
      .maybeSingle()
    if (authorProfile) {
      await supabase
        .from("community_profiles")
        .update({ post_count: Math.max(0, (authorProfile.post_count ?? 0) - 1) })
        .eq("firebase_uid", uid)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[feed/[id] DELETE] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
