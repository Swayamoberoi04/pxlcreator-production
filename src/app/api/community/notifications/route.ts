/**
 * GET   /api/community/notifications
 *   ?count_only=1                → { unread_count, channel }
 *   ?filter=unread|all           (default all)
 *   ?cursor=<created_at>|<id>    cursor from the previous page's next_cursor
 *   ?limit=1..50                 (default 20)
 *   → { items: NotificationItem[], unread_count, next_cursor, channel }
 *
 * PATCH /api/community/notifications
 *   { ids: string[], read: boolean }  mark specific rows read/unread
 *   { all: true }                     mark every notification read
 *   → { unread_count }
 *
 * Phase 5.9 rewrite. The previous GET marked every row it returned as read
 * as a side effect — and the nav badge called it with ?unread=true, so merely
 * opening any community page silently consumed all unread notifications
 * before the member ever saw them. Reading is now explicit, via PATCH.
 *
 * `channel` is the caller's private Realtime topic (see migration 051); it is
 * only ever returned to its owner.
 *
 * Every query is scoped to the verified Firebase uid. Enrichment is batched:
 * one query for actors plus at most one per resource type — no N+1.
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient as typedAdmin } from "@/lib/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"

// community_notifications.dedupe_key/group_key and community_notification_prefs
// (migration 051) are newer than src/types/database.ts, so use the untyped client.
const createAdminClient = () => typedAdmin() as unknown as SupabaseClient
import { makeRateLimiter } from "@/lib/api/rate-limit"
import { createLogger } from "@/lib/observability/logger"
import type { NotificationItem, NotificationType } from "@/types/community"

export const runtime = "nodejs"

const log = createLogger("community/notifications")
// Keyed per uid. Realtime pings trigger refetches, so this is generous.
const limiter = makeRateLimiter({ max: 600, windowMs: 60 * 60 * 1000 })

interface Row {
  id: string
  actor_uid: string | null
  type: NotificationType
  title: string
  body: string | null
  resource_type: string | null
  resource_id: string | null
  group_key: string | null
  is_read: boolean
  created_at: string
}

type Admin = ReturnType<typeof createAdminClient>

async function unreadCount(supabase: Admin, uid: string): Promise<number> {
  // head:true + the partial index idx_notifs_unread (migration 012): no rows
  // are transferred, only the count.
  const { count } = await supabase
    .from("community_notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_uid", uid)
    .eq("is_read", false)
  return count ?? 0
}

async function channelFor(supabase: Admin, uid: string): Promise<string | null> {
  await supabase
    .from("community_notification_prefs")
    .upsert({ firebase_uid: uid } as never, { onConflict: "firebase_uid", ignoreDuplicates: true })
  const { data } = await supabase
    .from("community_notification_prefs")
    .select("channel_token")
    .eq("firebase_uid", uid)
    .maybeSingle()
  return data?.channel_token ? `notify:${data.channel_token}` : null
}

/* ── GET ─────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  if (limiter.check(`n:${uid}`)) return NextResponse.json({ error: "Too many requests." }, { status: 429 })

  const sp = new URL(req.url).searchParams
  const supabase = createAdminClient()

  try {
    if (sp.get("count_only") === "1") {
      const [count, channel] = await Promise.all([unreadCount(supabase, uid), channelFor(supabase, uid)])
      return NextResponse.json({ unread_count: count, channel })
    }

    const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20))
    let q = supabase
      .from("community_notifications")
      .select("id, actor_uid, type, title, body, resource_type, resource_id, group_key, is_read, created_at")
      .eq("recipient_uid", uid)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1)

    if (sp.get("filter") === "unread") q = q.eq("is_read", false)

    const cursor = sp.get("cursor")
    if (cursor) {
      const [ts, id] = cursor.split("|")
      if (!ts || !id || Number.isNaN(Date.parse(ts)) || !/^[0-9a-f-]{36}$/i.test(id)) {
        return NextResponse.json({ error: "Invalid cursor." }, { status: 400 })
      }
      // Values are double-quoted: an ISO timestamp contains '.', ':' and '+'.
      q = q.or(`created_at.lt."${ts}",and(created_at.eq."${ts}",id.lt.${id})`)
    }

    const { data, error } = await q
    if (error) {
      log.error("list_failed", { code: error.code, message: error.message })
      return NextResponse.json({ error: "Couldn't load notifications." }, { status: 500 })
    }

    const rows = (data ?? []) as Row[]
    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    const last = page[page.length - 1]
    const next_cursor = hasMore && last ? `${last.created_at}|${last.id}` : null

    const items = await enrich(supabase, page)
    const [count, channel] = await Promise.all([unreadCount(supabase, uid), channelFor(supabase, uid)])
    return NextResponse.json({ items, unread_count: count, next_cursor, channel })
  } catch (err) {
    log.error("list_unexpected", { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: "Couldn't load notifications." }, { status: 500 })
  }
}

/** Batched joins + grouping + deep links. Never returns another user's private data. */
async function enrich(supabase: Admin, rows: Row[]): Promise<NotificationItem[]> {
  if (rows.length === 0) return []

  const idsOf = (t: string) => [...new Set(rows.filter((r) => r.resource_type === t && r.resource_id).map((r) => r.resource_id!))]
  const actorUids = [...new Set(rows.map((r) => r.actor_uid).filter(Boolean) as string[])]

  const [actors, posts, projects, showcases, events] = await Promise.all([
    actorUids.length
      ? supabase.from("community_profiles").select("firebase_uid, username, display_name, avatar_url").in("firebase_uid", actorUids)
      : Promise.resolve({ data: [] }),
    idsOf("post").length
      ? supabase.from("channel_posts").select("id, channel_id, is_removed").in("id", idsOf("post"))
      : Promise.resolve({ data: [] }),
    idsOf("project").length
      ? supabase.from("project_listings").select("id").in("id", idsOf("project"))
      : Promise.resolve({ data: [] }),
    idsOf("showcase").length
      ? supabase.from("showcase_items").select("id, is_removed").in("id", idsOf("showcase"))
      : Promise.resolve({ data: [] }),
    idsOf("event").length
      ? supabase.from("community_events").select("id").in("id", idsOf("event"))
      : Promise.resolve({ data: [] }),
  ])

  type P = { firebase_uid: string; username: string; display_name: string | null; avatar_url: string | null }
  const actorMap = new Map(((actors.data ?? []) as P[]).map((p) => [p.firebase_uid, p]))
  const postMap = new Map(((posts.data ?? []) as { id: string; channel_id: string | null; is_removed: boolean }[]).map((p) => [p.id, p]))
  const projectSet = new Set(((projects.data ?? []) as { id: string }[]).map((p) => p.id))
  const showcaseMap = new Map(((showcases.data ?? []) as { id: string; is_removed: boolean }[]).map((s) => [s.id, s]))
  const eventSet = new Set(((events.data ?? []) as { id: string }[]).map((e) => e.id))

  function link(r: Row): { href: string | null; available: boolean } {
    const id = r.resource_id
    switch (r.resource_type) {
      case "post": {
        const p = id ? postMap.get(id) : undefined
        if (!p || p.is_removed) return { href: null, available: false }
        return { href: p.channel_id ? `/community/channels/${p.channel_id}` : `/community/feed/${p.id}`, available: true }
      }
      case "project":
        return id && projectSet.has(id) ? { href: `/community/projects/${id}`, available: true } : { href: null, available: false }
      case "showcase": {
        const s = id ? showcaseMap.get(id) : undefined
        return s && !s.is_removed ? { href: `/community/showcase/${s.id}`, available: true } : { href: null, available: false }
      }
      case "event":
        return id && eventSet.has(id) ? { href: `/community/events/${id}`, available: true } : { href: null, available: false }
      default: {
        // Follow-style notifications point at the actor.
        const a = r.actor_uid ? actorMap.get(r.actor_uid) : undefined
        if (r.type === "follow") return a ? { href: `/community/${a.username}`, available: true } : { href: null, available: false }
        return { href: null, available: true }
      }
    }
  }

  const out: NotificationItem[] = []
  const byGroup = new Map<string, NotificationItem>()

  for (const r of rows) {
    const a = r.actor_uid ? actorMap.get(r.actor_uid) : undefined
    const actor = a ? { username: a.username, display_name: a.display_name || a.username, avatar_url: a.avatar_url } : null

    // Collapse repeats of the same low-value event on the same content that
    // share a page. Newest row leads; the group is unread if any row is.
    const existing = r.group_key ? byGroup.get(r.group_key) : undefined
    if (existing) {
      existing.ids.push(r.id)
      existing.group_count += 1
      existing.is_read = existing.is_read && r.is_read
      if (actor && existing.others.length < 3 && existing.actor?.username !== actor.username) {
        existing.others.push({ username: actor.username, display_name: actor.display_name })
      }
      continue
    }

    const { href, available } = link(r)
    const item: NotificationItem = {
      id: r.id,
      ids: [r.id],
      type: r.type,
      title: r.title,
      // A snippet of content that has since been removed is not shown.
      body: available ? r.body : null,
      is_read: r.is_read,
      created_at: r.created_at,
      actor,
      others: [],
      group_count: 1,
      href,
      available,
    }
    out.push(item)
    if (r.group_key) byGroup.set(r.group_key, item)
  }
  return out
}

/* ── PATCH ───────────────────────────────────────────────── */
export async function PATCH(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  if (limiter.check(`n:${uid}`)) return NextResponse.json({ error: "Too many requests." }, { status: 429 })

  const body = (await req.json().catch(() => null)) as { ids?: unknown; read?: unknown; all?: unknown } | null
  if (!body) return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })

  const supabase = createAdminClient()
  let error: { code?: string; message: string } | null = null

  if (body.all === true) {
    ;({ error } = await supabase
      .from("community_notifications")
      .update({ is_read: true })
      .eq("recipient_uid", uid)
      .eq("is_read", false))
  } else {
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 200)
      : []
    if (ids.length === 0) return NextResponse.json({ error: "ids must be a non-empty array of notification ids." }, { status: 400 })
    if (typeof body.read !== "boolean") return NextResponse.json({ error: "read must be true or false." }, { status: 400 })
    ;({ error } = await supabase
      .from("community_notifications")
      .update({ is_read: body.read })
      .in("id", ids)
      .eq("recipient_uid", uid)) // another user's ids simply match nothing
  }

  if (error) {
    log.error("mark_failed", { code: error.code, message: error.message })
    return NextResponse.json({ error: "Couldn't update notifications." }, { status: 500 })
  }
  return NextResponse.json({ unread_count: await unreadCount(supabase, uid) })
}
