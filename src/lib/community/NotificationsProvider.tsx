"use client"

/**
 * src/lib/community/NotificationsProvider.tsx
 *
 * One unread count and ONE Realtime subscription per signed-in tab (Phase 5.9).
 *
 * Previously the desktop sidebar and the mobile tabs each ran their own
 * unread fetch — two requests per page — and that fetch also marked every
 * unread notification as read server-side. Both are fixed: the count lives
 * here, once, and reading it has no side effects.
 *
 * Realtime: the server hands back this user's private topic
 * (`notify:<channel_token>`, migration 051). We listen for a content-free
 * "ping" on it and refetch through the authenticated API. The subscription
 * is scoped to the recipient, never global, and removed on sign-out/unmount.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/lib/supabase/client"

interface Ctx {
  unread: number
  /** Increments on every Realtime ping — subscribe with useEffect to refetch lists. */
  version: number
  setUnread: (n: number) => void
  refresh: () => Promise<void>
}

const NotificationsContext = createContext<Ctx>({
  unread: 0,
  version: 0,
  setUnread: () => {},
  refresh: async () => {},
})

export function useNotifications(): Ctx {
  return useContext(NotificationsContext)
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const [unread, setUnread] = useState(0)
  const [version, setVersion] = useState(0)
  const [topic, setTopic] = useState<string | null>(null)
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user })

  const refresh = useCallback(async () => {
    const u = userRef.current
    if (!u) return
    try {
      const res = await fetch("/api/community/notifications?count_only=1", {
        headers: { Authorization: `Bearer ${await u.getIdToken()}` },
      })
      if (!res.ok) return
      const d = (await res.json()) as { unread_count: number; channel: string | null }
      setUnread(d.unread_count)
      setTopic(d.channel)
    } catch { /* offline — keep the last known count */ }
  }, [])

  // Initial count, and again whenever the tab regains focus (covers any
  // ping missed while the socket was asleep or reconnecting).
  useEffect(() => {
    if (!uid) {
      setTimeout(() => { setUnread(0); setTopic(null) }, 0)
      return
    }
    setTimeout(() => void refresh(), 0)
    const onFocus = () => void refresh()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [uid, refresh])

  // Exactly one channel, recreated only if the topic changes.
  useEffect(() => {
    if (!topic || !process.env.NEXT_PUBLIC_SUPABASE_URL) return
    const supabase = createClient()
    let channel: RealtimeChannel | null = null
    try {
      channel = supabase
        .channel(topic)
        .on("broadcast", { event: "ping" }, () => {
          setVersion((v) => v + 1)
          void refresh()
        })
        .subscribe()
    } catch { /* Realtime unavailable — focus refetch still works */ }
    return () => { if (channel) void supabase.removeChannel(channel) }
  }, [topic, refresh])

  return (
    <NotificationsContext.Provider value={{ unread, version, setUnread, refresh }}>
      {children}
    </NotificationsContext.Provider>
  )
}
