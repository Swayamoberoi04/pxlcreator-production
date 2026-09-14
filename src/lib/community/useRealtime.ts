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
import type { RealtimeChannel } from "@supabase/supabase-js"

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

    let channel: RealtimeChannel | null = null
    try {
      const supabase = createClient()
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
        .subscribe()
    } catch (err) {
      // A misconfigured project must never take the page down.
      console.warn("[useRealtimeTable] subscribe failed:", err)
    }

    return () => {
      if (channel) void channel.unsubscribe()
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
