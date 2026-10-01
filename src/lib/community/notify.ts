/**
 * src/lib/community/notify.ts
 *
 * The one server-side way to create a community notification (Phase 5.9).
 *
 * Before this, nine routes each inserted into community_notifications by
 * hand, with no deduplication, no preference check, no block check, and in
 * one case (showcase enquiries) the private enquiry text copied into the
 * notification body. Every writer now goes through here.
 *
 * Guarantees:
 *  • actor ≠ recipient — nobody is notified about their own action;
 *  • recipient's muted types are respected;
 *  • no notification crosses a block in either direction;
 *  • dedupe_key + unique index (migration 051) make repeats a no-op, so
 *    retries, double clicks and follow→unfollow→follow notify once;
 *  • never throws — a notification failure must not fail the user's action.
 *
 * Callers pass only public-safe text. Private content (enquiry messages,
 * application cover letters, contact emails) must never be put in title or
 * body; the recipient reads those through the owner-only endpoints.
 */

import { createAdminClient as typedAdmin } from "@/lib/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"

// community_notifications.dedupe_key/group_key and community_notification_prefs
// (migration 051) are newer than src/types/database.ts, so use the untyped client.
const createAdminClient = () => typedAdmin() as unknown as SupabaseClient
import { isBlockedBetween } from "@/lib/community/visibility"
import { createLogger } from "@/lib/observability/logger"
import type { NotificationType } from "@/types/community"

const log = createLogger("community/notify")

/** Types a member can switch off in preferences. */
export const MUTABLE_NOTIFICATION_TYPES = [
  "follow",
  "post_like",
  "post_reply",
  "comment_reply",
  "project_application",
  "showcase_enquiry",
  "event_registration",
] as const satisfies readonly NotificationType[]

export interface NotifyInput {
  recipient: string
  actor: string
  type: NotificationType
  title: string
  body?: string | null
  resourceType?: "post" | "project" | "showcase" | "event" | "profile" | null
  resourceId?: string | null
  /** Names the underlying fact. Same key for the same recipient = one row. */
  dedupeKey: string
  /** Rows sharing this key may be displayed as one grouped item. */
  groupKey?: string | null
}

/** Display name for the actor, used in titles. One query. */
export async function actorName(uid: string): Promise<string> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("community_profiles")
    .select("display_name, username")
    .eq("firebase_uid", uid)
    .maybeSingle()
  return data?.display_name || data?.username || "Someone"
}

/**
 * A new comment notifies the post author ("commented on your post") and, for
 * a reply, the parent comment's author ("replied to your comment"). If both
 * are the same person they get the more specific reply notification only.
 * Shared by the feed and channel comment routes.
 */
export async function notifyComment(
  _supabase: unknown,
  args: {
    uid: string
    postId: string
    post: { author_uid: string; title?: string | null }
    parentId: string | null
    commentId: string
    commentBody: string
  }
): Promise<void> {
  const { uid, postId, post, parentId, commentId, commentBody } = args
  const name = await actorName(uid)
  const snippet = commentBody.slice(0, 140)

  let parentAuthor: string | null = null
  if (parentId) {
    const { data } = await createAdminClient()
      .from("post_comments")
      .select("author_uid")
      .eq("id", parentId)
      .maybeSingle()
    parentAuthor = data?.author_uid ?? null
  }

  if (parentAuthor && parentAuthor !== uid) {
    await notify({
      recipient: parentAuthor,
      actor: uid,
      type: "comment_reply",
      title: `${name} replied to your comment`,
      body: snippet,
      resourceType: "post",
      resourceId: postId,
      dedupeKey: `comment_reply:${commentId}`,
    })
  }

  if (post.author_uid !== parentAuthor) {
    const postTitle = post.title ? `"${post.title}"` : "your post"
    await notify({
      recipient: post.author_uid,
      actor: uid,
      type: "post_reply",
      title: `${name} commented on ${postTitle}`,
      body: snippet,
      resourceType: "post",
      resourceId: postId,
      dedupeKey: `post_reply:${commentId}`,
    })
  }
}

/**
 * Content-free Realtime ping to the recipient's private topic, sent through
 * Realtime's server-side broadcast API with the service-role key.
 *
 * Migration 051 also installs a trigger that calls realtime.send(); on this
 * project that call does not deliver (verified in Phase 5.9 browser testing:
 * the topic received nothing), so delivery is done here instead. The trigger
 * is wrapped to fail silently and is harmless; if it ever starts delivering,
 * the client just refetches once more.
 */
async function ping(recipient: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  try {
    const { data } = await createAdminClient()
      .from("community_notification_prefs")
      .select("channel_token")
      .eq("firebase_uid", recipient)
      .maybeSingle()
    if (!data?.channel_token) return
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        messages: [{ topic: `notify:${data.channel_token}`, event: "ping", payload: {}, private: false }],
      }),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) log.warn("notify_ping_failed", { status: res.status })
  } catch (err) {
    log.warn("notify_ping_failed", { error: err instanceof Error ? err.message : String(err) })
  }
}

export async function notify(input: NotifyInput): Promise<void> {
  const { recipient, actor, type } = input
  if (!recipient || !actor || recipient === actor) return

  try {
    const supabase = createAdminClient()

    const { data: prefs } = await supabase
      .from("community_notification_prefs")
      .select("muted_types")
      .eq("firebase_uid", recipient)
      .maybeSingle()
    if ((prefs?.muted_types ?? []).includes(type)) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (await isBlockedBetween(supabase as any, recipient, actor)) return

    const { data: inserted, error } = await supabase
      .from("community_notifications")
      .upsert(
        {
          recipient_uid: recipient,
          actor_uid: actor,
          type,
          title: input.title.slice(0, 200),
          body: input.body ? input.body.slice(0, 200) : null,
          resource_type: input.resourceType ?? null,
          resource_id: input.resourceId ?? null,
          dedupe_key: input.dedupeKey,
          group_key: input.groupKey ?? null,
          is_read: false,
        } as never,
        { onConflict: "recipient_uid,dedupe_key", ignoreDuplicates: true }
      )
      .select("id")

    if (error) {
      log.error("notify_insert_failed", { type, code: error.code, message: error.message })
      return
    }
    // A deduplicated repeat inserts nothing and therefore pings nothing.
    if ((inserted ?? []).length > 0) await ping(recipient)
  } catch (err) {
    log.error("notify_unexpected", { type, error: err instanceof Error ? err.message : String(err) })
  }
}
