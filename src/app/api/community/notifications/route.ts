/**
 * GET    /api/community/notifications  — list notifications for current user
 * PATCH  /api/community/notifications  — mark specific notifications as read
 *
 * GET query params: ?unread=true (only unread), ?page=1, ?limit=20
 * GET side effect: marks fetched notifications as read automatically.
 *
 * PATCH body: { ids: string[], read: true }
 *
 * Returns: { notifications, unread_count }
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 60, windowMs: 60 * 60 * 1000 })

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get("unread") === "true"
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))
  const offset = (page - 1) * limit

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from("community_notifications")
      .select("*", { count: "exact" })
      .eq("recipient_uid", uid)

    if (unreadOnly) {
      query = query.eq("is_read", false)
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: notifications, error, count } = await query

    if (error) {
      console.error("[notifications GET]", error)
      return NextResponse.json({ error: "Failed to fetch notifications." }, { status: 500 })
    }

    // Mark fetched notifications as read
    const unreadIds = (notifications ?? [])
      .filter((n: { is_read: boolean; id: string }) => !n.is_read)
      .map((n: { id: string }) => n.id)

    if (unreadIds.length > 0) {
      await supabase
        .from("community_notifications")
        .update({ is_read: true })
        .in("id", unreadIds)
        .eq("recipient_uid", uid)
    }

    // Get total unread count (after marking above as read)
    const { count: unreadCount } = await supabase
      .from("community_notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_uid", uid)
      .eq("is_read", false)

    return NextResponse.json({
      notifications: notifications ?? [],
      total: count ?? 0,
      unread_count: unreadCount ?? 0,
      page,
      limit,
    })
  } catch (err) {
    console.error("[notifications GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── PATCH ───────────────────────────────────────────────── */
export async function PATCH(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let body: { ids?: unknown; read?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { ids, read } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array of notification IDs." }, { status: 400 })
  }
  if (read !== true) {
    return NextResponse.json({ error: "read must be true." }, { status: 400 })
  }

  // Ensure IDs are strings
  const validIds = ids.filter((id): id is string => typeof id === "string")
  if (validIds.length === 0) {
    return NextResponse.json({ error: "ids must contain valid string IDs." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { error: updateError } = await supabase
      .from("community_notifications")
      .update({ is_read: true })
      .in("id", validIds)
      .eq("recipient_uid", uid) // security: only own notifications

    if (updateError) {
      console.error("[notifications PATCH]", updateError)
      return NextResponse.json({ error: "Failed to mark notifications as read." }, { status: 500 })
    }

    // Return fresh unread count
    const { count: unreadCount } = await supabase
      .from("community_notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_uid", uid)
      .eq("is_read", false)

    return NextResponse.json({
      success: true,
      updated: validIds.length,
      unread_count: unreadCount ?? 0,
    })
  } catch (err) {
    console.error("[notifications PATCH] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
