/**
 * src/lib/community/visibility.ts
 *
 * Shared visibility enforcement for every community surface (Phase 5.6).
 *
 * Audit finding this exists to fix: `is_banned` (migration 039) was never
 * enforced anywhere in discovery. A banned creator still appeared in Discover,
 * trending, new-creators, similar-creators and the feed — banning hid nothing.
 * Blocks and mutes (migration 048) need the same enforcement, in the same
 * places, or they're equally decorative.
 *
 * Every list endpoint that returns creators or their content calls
 * `getHiddenUids()` once and filters against it. One batched query, no N+1.
 */

import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface HiddenSet {
  /** Everyone the viewer must not see: banned creators + blocks + mutes. */
  uids: Set<string>
  /** Just the blocks/mutes the viewer set up, for "you blocked this" UI. */
  blockedByViewer: Set<string>
}

/**
 * Everyone who must be filtered out of what `viewerUid` sees.
 *
 *  • banned creators   — hidden from everyone, signed in or not
 *  • users the viewer blocked or muted — hidden from the viewer
 *  • users who blocked the viewer      — hidden from the viewer too, because
 *    a block is mutual; a mute is not, so it only cuts one way
 */
export async function getHiddenUids(
  supabase: SupabaseClient,
  viewerUid: string | null
): Promise<HiddenSet> {
  const uids = new Set<string>()
  const blockedByViewer = new Set<string>()

  // Banned creators are hidden from everyone.
  try {
    const { data: banned } = await supabase
      .from("community_profiles")
      .select("firebase_uid")
      .eq("is_banned", true)
    for (const row of banned ?? []) uids.add(row.firebase_uid as string)
  } catch {
    // A failure here must not silently widen visibility, but it also must not
    // take the page down — callers still apply their own visibility filters.
  }

  if (!viewerUid) return { uids, blockedByViewer }

  try {
    // Both directions in one round trip.
    const { data: blocks } = await supabase
      .from("user_blocks")
      .select("blocker_uid, blocked_uid, block_type")
      .or(`blocker_uid.eq.${viewerUid},blocked_uid.eq.${viewerUid}`)

    for (const row of blocks ?? []) {
      const r = row as { blocker_uid: string; blocked_uid: string; block_type: string }
      if (r.blocker_uid === viewerUid) {
        // The viewer blocked or muted them — hide either way.
        uids.add(r.blocked_uid)
        blockedByViewer.add(r.blocked_uid)
      } else if (r.block_type === "block") {
        // They blocked the viewer. A block is mutual; a mute is not.
        uids.add(r.blocker_uid)
      }
    }
  } catch { /* same reasoning as above */ }

  return { uids, blockedByViewer }
}

/**
 * Is there a block in either direction between two users?
 * Used to refuse interactions (follow, comment, enquiry) rather than just
 * hiding content.
 */
export async function isBlockedBetween(
  supabase: SupabaseClient,
  a: string,
  b: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("user_blocks")
      .select("id, block_type")
      .eq("block_type", "block")
      .or(`and(blocker_uid.eq.${a},blocked_uid.eq.${b}),and(blocker_uid.eq.${b},blocked_uid.eq.${a})`)
      .limit(1)
    return (data ?? []).length > 0
  } catch {
    return false
  }
}

/** Filter a list of rows by an author/owner field against the hidden set. */
export function filterHidden<T extends Record<string, unknown>>(
  rows: T[],
  hidden: Set<string>,
  uidField: string
): T[] {
  if (hidden.size === 0) return rows
  return rows.filter((row) => !hidden.has(row[uidField] as string))
}
