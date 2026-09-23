"use client"

/**
 * src/lib/community/useRealtime.ts
 *
 * Thin, dependency-free wrappers over Supabase Realtime `postgres_changes`.
 *
 * Why a hook rather than calls scattered through components:
 *  - one place that knows how to build the browser client, subscribe, and
 *    (critically) unsubscribe, so a remount never leaks a channel;
 *  - one place that degrades gracefully when Supabase env vars are absent
 *    (local dev without a .env) — the UI then just behaves as it did before,
 *    updating on its own fetches rather than crashing.
 *
 * Realtime events are delivered through the ANON key, so they are filtered by
 * the RLS SELECT policies added in migration 043: a subscriber only ever
 * receives rows they were already allowed to read.
 */

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { createLogger } from "@/lib/observability/logger"
import type { RealtimeChannel } from "@supabase/supabase-js"

const log = createLogger("community/realtime")

type ChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*"

interface RealtimeTableOptions {
  /** Table to watch, e.g. "community_profiles" */
  table: string
  /** Which change types to receive. Default: all. */
  event?: ChangeEvent
  /** PostgREST filter, e.g. `firebase_uid=eq.${uid}` */
  filter?: string
  /** Set false to keep the subscription torn down (e.g. user logged out). */
  enabled?: boolean
}

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Subscribe to row changes on one table.
 *
 * `onChange` is kept in a ref, so passing an inline arrow function does NOT
 * resubscribe on every render — the channel is torn down only when the table,
 * event, filter or enabled flag actually changes.
 */
export function useRealtimeTable<T extends Record<string, unknown>>(
  { table, event = "*", filter, enabled = true }: RealtimeTableOptions,
  onChange: (payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE"
    new: T | null
    old: T | null
  }) => void
): void {
  const handlerRef = useRef(onChange)
  // Refs must not be written during render, so sync in its own effect. This
  // runs before the subscribe effect's callback can ever fire.
  useEffect(() => { handlerRef.current = onChange })

  useEffect(() => {
    if (!enabled || !isConfigured()) return

    // The client is a browser singleton (@supabase/ssr caches it), so every
    // hook on the page shares one socket and one channel registry. That makes
    // correct teardown essential — see the cleanup below.
    const supabase = createClient()
    let channel: RealtimeChannel | null = null
    try {
      channel = supabase
        .channel(`rt:${table}:${filter ?? "all"}:${Math.random().toString(36).slice(2)}`)
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          "postgres_changes" as any,
          { event, schema: "public", table, ...(filter ? { filter } : {}) },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => {
            handlerRef.current({
              eventType: payload.eventType,
              new: (payload.new ?? null) as T | null,
              old: (payload.old ?? null) as T | null,
            })
          }
        )
        // A status callback, so a channel that never connects says so.
        // Phase 5.7 found that CSP had been blocking every wss:// connection
        // since 5.1 and nothing anywhere reported it — subscribe() returns a
        // channel whether or not the socket ever opens. This is the smallest
        // thing that would have caught it a phase earlier.
        .subscribe((status, err) => {
          // CLOSED is deliberately not logged — it is the normal teardown
          // status and would fire on every unmount.
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            log.warn("realtime_channel_not_connected", {
              table, event, status,
              error: err instanceof Error ? err.message : err ? String(err) : undefined,
            })
          }
        })
    } catch (err) {
      // A misconfigured project must never take the page down.
      log.warn("realtime_subscribe_failed", {
        table, event, error: err instanceof Error ? err.message : String(err),
      })
    }

    return () => {
      // removeChannel, not unsubscribe.
      //
      // unsubscribe() closes the subscription but leaves the channel object
      // registered on the shared client. Because the channel name carries a
      // random suffix, every remount minted a new name and left the old entry
      // behind forever — React StrictMode alone doubles them on first mount,
      // and navigating between community pages added one per visit. The
      // client then re-joins every stale channel on socket reconnect.
      // removeChannel() unsubscribes AND drops it from the registry.
      if (channel) void supabase.removeChannel(channel)
    }
  }, [table, event, filter, enabled])
}

/**
 * Live follower/following counters for a set of profiles.
 *
 * Watches community_profiles UPDATEs and hands back only the counter fields,
 * which is exactly what CreatorCard / the profile header need in order to
 * re-render when someone else follows the creator you are looking at.
 */
export function useLiveProfileCounts(
  enabled: boolean,
  onUpdate: (row: {
    firebase_uid: string
    follower_count: number
    following_count: number
    showcase_count: number
  }) => void
): void {
  useRealtimeTable<{
    firebase_uid: string
    follower_count: number
    following_count: number
    showcase_count: number
  }>({ table: "community_profiles", event: "UPDATE", enabled }, (payload) => {
    if (payload.new?.firebase_uid) onUpdate(payload.new)
  })
}
