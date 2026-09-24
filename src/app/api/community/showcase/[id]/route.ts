/**
 * GET/PATCH/DELETE /api/community/showcase/[id]
 *
 * GET: a 'public' item is visible to anyone; a 'private' one only to its
 * owner (404 to everyone else — existence not confirmed by status code).
 * PATCH/DELETE: ownership enforced against the verified Firebase UID.
 *
 * DELETE is a real, permanent removal (cascades reactions/views/enquiries)
 * — separate from admin moderation's is_removed soft-hide (migration 039).
 * A showcase stays on its creator's profile forever unless the creator
 * removes it here, or a moderator hides it.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { guardMutation } from "@/lib/community/guard"

export const runtime = "nodejs"

type Params = { params: Promise<{ id: string }> }

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const uid = await getFirebaseUidFromRequest(req)

  try {
    const supabase = createAdminClient()
    // No FK constraint exists between showcase_items.author_uid and
    // community_profiles.firebase_uid (migration 012) — join in memory
    // instead of PostgREST's embedded-select, which cannot resolve one.
    const { data: item, error } = await supabase
      .from("showcase_items")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error || !item || item.is_removed) {
      return NextResponse.json({ error: "Showcase item not found." }, { status: 404 })
    }
    const isOwner = uid === item.author_uid

    const { data: author } = await supabase
      .from("community_profiles")
      .select("username, display_name, avatar_url, is_verified")
      .eq("firebase_uid", item.author_uid)
      .maybeSingle()
    if (item.visibility === "private" && !isOwner) {
      return NextResponse.json({ error: "Showcase item not found." }, { status: 404 })
    }

    let project: { id: string; title: string } | null = null
    if (item.project_id) {
      const { data: proj } = await supabase
        .from("project_listings")
        .select("id, title")
        .eq("id", item.project_id)
        .maybeSingle()
      project = proj ?? null
    }

    let is_liked = false, is_bookmarked = false
    if (uid) {
      const { data: reactions } = await supabase
        .from("showcase_reactions")
        .select("reaction")
        .eq("showcase_id", id)
        .eq("firebase_uid", uid)
      is_liked = (reactions ?? []).some((r) => r.reaction === "like")
      is_bookmarked = (reactions ?? []).some((r) => r.reaction === "bookmark")
    }

    return NextResponse.json({ item: { ...item, author: author ?? null, project, is_liked, is_bookmarked, is_owner: isOwner } })
  } catch (err) {
    console.error("[showcase/[id] GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── PATCH ───────────────────────────────────────────────── */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const limited = guardMutation(req, uid, "showcase-edit")
  if (limited) return limited

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  if (body.visibility !== undefined && !["public", "private"].includes(body.visibility as string)) {
    return NextResponse.json({ error: "visibility must be 'public' or 'private'." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: existing, error: fetchError } = await supabase
      .from("showcase_items")
      .select("id, author_uid")
      .eq("id", id)
      .maybeSingle()
    if (fetchError || !existing) {
      return NextResponse.json({ error: "Showcase item not found." }, { status: 404 })
    }
    if (existing.author_uid !== uid) {
      return NextResponse.json({ error: "You can only edit your own showcase items." }, { status: 403 })
    }

    const allowed = [
      "title", "description", "media_urls", "before_url", "after_url", "thumbnail_url",
      "category", "software_used", "hashtags", "project_id", "client_name", "visibility",
    ] as const
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = body[field]
    }

    const { data: updated, error: updateError } = await supabase
      .from("showcase_items")
      .update(updates as never)
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) {
      console.error("[showcase/[id] PATCH]", updateError)
      return NextResponse.json({ error: "Failed to update showcase item." }, { status: 500 })
    }

    return NextResponse.json({ item: updated })
  } catch (err) {
    console.error("[showcase/[id] PATCH] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── DELETE ──────────────────────────────────────────────── */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const limited = guardMutation(req, uid, "showcase-edit")
  if (limited) return limited

  try {
    const supabase = createAdminClient()
    const { data: existing, error: fetchError } = await supabase
      .from("showcase_items")
      .select("id, author_uid")
      .eq("id", id)
      .maybeSingle()
    if (fetchError || !existing) {
      return NextResponse.json({ error: "Showcase item not found." }, { status: 404 })
    }
    if (existing.author_uid !== uid) {
      return NextResponse.json({ error: "You can only delete your own showcase items." }, { status: 403 })
    }

    const { error: deleteError } = await supabase.from("showcase_items").delete().eq("id", id)
    if (deleteError) {
      console.error("[showcase/[id] DELETE]", deleteError)
      return NextResponse.json({ error: "Failed to delete showcase item." }, { status: 500 })
    }

    const { data: authorProfile } = await supabase
      .from("community_profiles")
      .select("showcase_count")
      .eq("firebase_uid", uid)
      .maybeSingle()
    if (authorProfile) {
      await supabase
        .from("community_profiles")
        .update({ showcase_count: Math.max(0, (authorProfile.showcase_count ?? 0) - 1) })
        .eq("firebase_uid", uid)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[showcase/[id] DELETE] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
