/**
 * GET  /api/community/spaces/[id]/messages  — paginated messages for a space
 * POST /api/community/spaces/[id]/messages  — send a message to a space
 *
 * GET query params: ?page=1, ?limit=50
 *   Spaces are public — no auth required to read.
 *   Joins author profile (username, display_name, avatar_url, is_verified).
 *   Also joins reply_to message body + author when reply_to_id is set.
 *
 * POST body: { body: string (1-2000), reply_to_id?: string, mentions?: string[] }
 *   Auth required. Ensures community profile exists.
 *   Rate limit: 10 messages/min per user.
 *   Increments space.message_count.
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { ensureProfile } from "@/lib/community/ensureProfile"

const msgLimiter = makeRateLimiter({ max: 10, windowMs: 60 * 1000 })

type Params = { params: Promise<{ id: string }> }

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest, { params }: Params) {
  const { id: spaceId } = await params

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)))
  const offset = (page - 1) * limit

  try {
    const supabase = createAdminClient()

    // Verify space exists
    const { data: space, error: spaceError } = await supabase
      .from("community_spaces")
      .select("id")
      .eq("id", spaceId)
      .maybeSingle()

    if (spaceError || !space) {
      return NextResponse.json({ error: "Space not found." }, { status: 404 })
    }

    // Fetch messages
    const { data: messages, error: msgsError, count } = await supabase
      .from("community_messages")
      .select("*", { count: "exact" })
      .eq("space_id", spaceId)
      .eq("is_removed", false)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1)

    if (msgsError) {
      console.error("[spaces/messages GET]", msgsError)
      return NextResponse.json({ error: "Failed to fetch messages." }, { status: 500 })
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ messages: [], total: 0, page, limit })
    }

    // Collect author UIDs
    const authorUids = [...new Set(messages.map((m: { author_uid: string }) => m.author_uid))]
    const { data: profiles } = await supabase
      .from("community_profiles")
      .select("firebase_uid, username, display_name, avatar_url, is_verified")
      .in("firebase_uid", authorUids)

    const profileMap = new Map(
      (profiles ?? []).map((p: { firebase_uid: string }) => [p.firebase_uid, p])
    )

    // Collect reply_to message IDs and fetch those messages + authors
    const replyIds = messages
      .map((m: { reply_to_id: string | null }) => m.reply_to_id)
      .filter((id): id is string => id !== null)

    const replyMap = new Map<string, { id: string; body: string; author: unknown }>()
    if (replyIds.length > 0) {
      const { data: replyMsgs } = await supabase
        .from("community_messages")
        .select("id, body, author_uid")
        .in("id", replyIds)

      if (replyMsgs && replyMsgs.length > 0) {
        const replyAuthorUids = [
          ...new Set(replyMsgs.map((r: { author_uid: string }) => r.author_uid)),
        ]
        const { data: replyProfiles } = await supabase
          .from("community_profiles")
          .select("firebase_uid, username, display_name, avatar_url")
          .in("firebase_uid", replyAuthorUids)

        const replyProfileMap = new Map(
          (replyProfiles ?? []).map((p: { firebase_uid: string }) => [p.firebase_uid, p])
        )

        for (const rm of replyMsgs) {
          replyMap.set(rm.id, {
            id: rm.id,
            body: rm.body,
            author: replyProfileMap.get(rm.author_uid) ?? null,
          })
        }
      }
    }

    const enriched = messages.map((msg: Record<string, unknown>) => ({
      ...msg,
      author: profileMap.get(msg.author_uid as string) ?? null,
      reply_to: msg.reply_to_id ? (replyMap.get(msg.reply_to_id as string) ?? null) : null,
    }))

    return NextResponse.json({ messages: enriched, total: count ?? 0, page, limit })
  } catch (err) {
    console.error("[spaces/messages GET] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/* ── POST ────────────────────────────────────────────────── */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: spaceId } = await params

  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  // Rate limit per user
  if (msgLimiter.check(uid)) {
    return NextResponse.json({ error: "Too many messages. Slow down." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { body: msgBody, reply_to_id, mentions } = body as {
    body?: string
    reply_to_id?: string
    mentions?: string[]
  }

  if (!msgBody || typeof msgBody !== "string" || msgBody.trim().length === 0) {
    return NextResponse.json({ error: "Message body is required." }, { status: 400 })
  }
  if (msgBody.length > 2000) {
    return NextResponse.json({ error: "Message must be 2000 characters or fewer." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Verify space exists
    const { data: space, error: spaceError } = await supabase
      .from("community_spaces")
      .select("id, message_count")
      .eq("id", spaceId)
      .maybeSingle()

    if (spaceError || !space) {
      return NextResponse.json({ error: "Space not found." }, { status: 404 })
    }

    // Ensure community profile exists
    await ensureProfile(uid)

    // Optionally validate reply_to_id
    let replyPreview: string | null = null
    if (reply_to_id) {
      const { data: replyMsg } = await supabase
        .from("community_messages")
        .select("id, body")
        .eq("id", reply_to_id)
        .maybeSingle()
      if (replyMsg) {
        replyPreview = (replyMsg.body as string).slice(0, 100)
      }
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from("community_messages")
      .insert({
        space_id: spaceId,
        author_uid: uid,
        body: msgBody.trim(),
        reply_to_id: reply_to_id ?? null,
        reply_preview: replyPreview,
        mentions: Array.isArray(mentions) ? mentions : [],
        reaction_count: 0,
        is_pinned: false,
        is_removed: false,
      })
      .select("*")
      .single()

    if (insertError) {
      console.error("[spaces/messages POST] insert", insertError)
      return NextResponse.json({ error: "Failed to send message." }, { status: 500 })
    }

    // Increment space message_count
    await supabase
      .from("community_spaces")
      .update({ message_count: (space.message_count ?? 0) + 1 } as never)
      .eq("id", spaceId)

    // Fetch author profile
    const { data: authorProfile } = await supabase
      .from("community_profiles")
      .select("firebase_uid, username, display_name, avatar_url, is_verified")
      .eq("firebase_uid", uid)
      .maybeSingle()

    return NextResponse.json(
      { message: { ...message, author: authorProfile ?? null } },
      { status: 201 }
    )
  } catch (err) {
    console.error("[spaces/messages POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
