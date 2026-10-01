"use client"

/**
 * /community/notifications — Phase 5.9 notification center.
 *
 * Everything shown is a real row from community_notifications for the signed-in
 * member. New notifications arrive over the provider's private Realtime topic;
 * the list refetches its first page when a ping lands.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useNotifications } from "@/lib/community/NotificationsProvider"
import type { NotificationItem, NotificationType } from "@/types/community"

type Filter = "all" | "unread"

const PREF_LABELS: Record<string, string> = {
  follow: "New followers",
  post_like: "Likes on your posts",
  post_reply: "Comments on your posts",
  comment_reply: "Replies to your comments",
  project_application: "Project applications",
  showcase_enquiry: "Showcase enquiries",
  event_registration: "Event registrations",
}

const ICONS: Partial<Record<NotificationType, string>> = {
  follow: "👤", post_like: "❤️", post_reply: "💬", comment_reply: "↩️",
  project_application: "📋", application_accepted: "✅", showcase_enquiry: "✉️",
  event_registration: "📅", connection_req: "🤝", connection_acc: "🤝", channel_invite: "👥",
}

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(iso).toLocaleDateString()
}

function headline(n: NotificationItem): string {
  if (n.group_count <= 1 || !n.actor) return n.title
  const extra = n.group_count - 1
  const verb = n.type === "post_like" ? "liked your post" : n.type === "event_registration" ? "registered for your event" : ""
  if (!verb) return n.title
  return `${n.actor.display_name} and ${extra} other${extra === 1 ? "" : "s"} ${verb}`
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { version, setUnread } = useNotifications()

  const [filter, setFilter] = useState<Filter>("all")
  const [items, setItems] = useState<NotificationItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const [actionError, setActionError] = useState("")

  const [showPrefs, setShowPrefs] = useState(false)
  const [muted, setMuted] = useState<string[]>([])
  const [prefTypes, setPrefTypes] = useState<string[]>([])
  const [prefsError, setPrefsError] = useState("")
  const [savingPref, setSavingPref] = useState<string | null>(null)

  const userRef = useRef(user)
  useEffect(() => { userRef.current = user })

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?from=/community/notifications")
  }, [authLoading, user, router])

  const headers = useCallback(async (): Promise<Record<string, string>> => {
    const u = userRef.current
    return u ? { Authorization: `Bearer ${await u.getIdToken()}`, "Content-Type": "application/json" } : {}
  }, [])

  const load = useCallback(async (opts: { append?: string | null } = {}) => {
    if (!userRef.current) return
    if (opts.append) setLoadingMore(true)
    else setLoading(true)
    setError("")
    try {
      const qs = new URLSearchParams({ filter, limit: "20" })
      if (opts.append) qs.set("cursor", opts.append)
      const res = await fetch(`/api/community/notifications?${qs}`, { headers: await headers() })
      if (!res.ok) throw new Error()
      const d = (await res.json()) as { items: NotificationItem[]; next_cursor: string | null; unread_count: number }
      setItems((prev) => (opts.append ? [...prev, ...d.items] : d.items))
      setCursor(d.next_cursor)
      setUnread(d.unread_count)
    } catch {
      setError("We couldn't load your notifications.")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filter, headers, setUnread])

  // First page on mount / filter change / Realtime ping.
  const uid = user?.uid
  useEffect(() => {
    if (!uid) return
    setTimeout(() => void load(), 0)
  }, [uid, filter, version, load])

  async function mark(ids: string[], read: boolean) {
    setActionError("")
    const before = items
    setItems((prev) =>
      filter === "unread" && read
        ? prev.filter((n) => !n.ids.some((i) => ids.includes(i)))
        : prev.map((n) => (n.ids.some((i) => ids.includes(i)) ? { ...n, is_read: read } : n))
    )
    try {
      const res = await fetch("/api/community/notifications", { method: "PATCH", headers: await headers(), body: JSON.stringify({ ids, read }) })
      if (!res.ok) throw new Error()
      setUnread(((await res.json()) as { unread_count: number }).unread_count)
    } catch {
      setItems(before)
      setActionError("That didn't save. Please try again.")
    }
  }

  async function markAll() {
    setActionError("")
    const before = items
    setItems((prev) => (filter === "unread" ? [] : prev.map((n) => ({ ...n, is_read: true }))))
    try {
      const res = await fetch("/api/community/notifications", { method: "PATCH", headers: await headers(), body: JSON.stringify({ all: true }) })
      if (!res.ok) throw new Error()
      setUnread(((await res.json()) as { unread_count: number }).unread_count)
    } catch {
      setItems(before)
      setActionError("Couldn't mark everything as read. Please try again.")
    }
  }

  async function openPrefs() {
    setShowPrefs((s) => !s)
    if (prefTypes.length) return
    setPrefsError("")
    try {
      const res = await fetch("/api/community/notifications/preferences", { headers: await headers() })
      if (!res.ok) throw new Error()
      const d = (await res.json()) as { muted_types: string[]; available_types: string[] }
      setMuted(d.muted_types)
      setPrefTypes(d.available_types)
    } catch {
      setPrefsError("Couldn't load your preferences.")
    }
  }

  async function togglePref(type: string) {
    const next = muted.includes(type) ? muted.filter((t) => t !== type) : [...muted, type]
    const before = muted
    setMuted(next)
    setSavingPref(type)
    setPrefsError("")
    try {
      const res = await fetch("/api/community/notifications/preferences", { method: "PUT", headers: await headers(), body: JSON.stringify({ muted_types: next }) })
      if (!res.ok) throw new Error()
    } catch {
      setMuted(before)
      setPrefsError("That preference didn't save. Please try again.")
    } finally {
      setSavingPref(null)
    }
  }

  function open(n: NotificationItem) {
    if (!n.is_read) void mark(n.ids, true)
    if (n.href) router.push(n.href)
  }

  if (authLoading || !user) {
    return <div className="max-w-2xl mx-auto w-full h-64 rounded-2xl bg-surface border border-border animate-pulse" />
  }

  const hasUnread = items.some((n) => !n.is_read)

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">Notifications</h1>
          <p className="text-sm text-muted/85 mt-1">Follows, likes, comments and requests from real members.</p>
        </div>
        <button
          onClick={() => void openPrefs()}
          aria-expanded={showPrefs}
          className="min-h-10 px-4 rounded-full border border-border text-sm text-muted/92 hover:border-gold/40 hover:text-foreground"
        >
          Settings
        </button>
      </div>

      {showPrefs && (
        <section aria-label="Notification settings" className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-1">
          <p className="text-xs text-muted/85 pb-2">Turned-off types stop new notifications. Existing ones stay.</p>
          {prefsError && <p role="alert" className="text-sm text-red-300 pb-2">{prefsError}</p>}
          {prefTypes.length === 0 && !prefsError && <p className="text-sm text-muted/85">Loading…</p>}
          {prefTypes.map((t) => {
            const on = !muted.includes(t)
            return (
              <label key={t} className="flex items-center justify-between gap-3 min-h-11 cursor-pointer">
                <span className="text-sm text-foreground">{PREF_LABELS[t] ?? t}</span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={on}
                  checked={on}
                  disabled={savingPref === t}
                  onChange={() => void togglePref(t)}
                  className="size-5 accent-[#FFD60A]"
                />
              </label>
            )
          })}
        </section>
      )}

      <div className="flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter notifications" className="flex gap-1 rounded-full border border-border p-1">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={[
                "min-h-9 px-4 rounded-full text-sm font-medium capitalize transition-colors",
                filter === f ? "bg-gold text-black" : "text-muted/85 hover:text-foreground",
              ].join(" ")}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => void markAll()}
          disabled={!hasUnread}
          className="min-h-10 px-3 text-sm text-gold hover:underline disabled:text-muted/50 disabled:no-underline"
        >
          Mark all as read
        </button>
      </div>

      {actionError && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{actionError}</p>
      )}

      {loading ? (
        <ul aria-busy className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => <li key={i} className="h-16 rounded-xl bg-surface border border-border animate-pulse" />)}
        </ul>
      ) : error ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <p className="text-sm text-muted/90">{error}</p>
          <button onClick={() => void load()} className="min-h-10 px-4 rounded-full bg-gold text-black text-sm font-semibold">Try again</button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl" aria-hidden>🔔</p>
          <p className="font-display font-bold text-lg text-foreground mt-2">
            {filter === "unread" ? "You're all caught up" : "No notifications yet"}
          </p>
          <p className="text-sm text-muted/85 mt-1">
            {filter === "unread"
              ? "Nothing unread right now."
              : "When someone follows you, likes or comments on your work, or applies to your project, it'll show up here."}
          </p>
          {filter === "all" && (
            <Link href="/community/discover" className="inline-block mt-4 text-gold text-sm hover:underline">Discover creators →</Link>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={[
                "rounded-xl border flex items-start gap-3 p-3",
                n.is_read ? "border-border bg-surface" : "border-gold/30 bg-gold/5",
              ].join(" ")}
            >
              <button
                onClick={() => open(n)}
                disabled={!n.href && n.is_read}
                className="flex-1 min-w-0 flex items-start gap-3 text-left min-h-11 disabled:cursor-default"
              >
                {n.actor?.avatar_url ? (
                  <img src={n.actor.avatar_url} alt="" loading="lazy" decoding="async" className="size-10 rounded-full object-cover shrink-0" />
                ) : (
                  <span aria-hidden className="size-10 rounded-full bg-surface-2 flex items-center justify-center shrink-0">{ICONS[n.type] ?? "🔔"}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm break-words ${n.is_read ? "text-foreground/85" : "text-foreground font-semibold"}`}>
                    {headline(n)}
                  </span>
                  {n.available && n.body && <span className="block text-xs text-muted/85 mt-0.5 line-clamp-2 break-words">{n.body}</span>}
                  {!n.available && <span className="block text-xs text-muted/70 mt-0.5 italic">This content is no longer available.</span>}
                  <span className="block text-[11px] text-muted/70 mt-1">{timeAgo(n.created_at)}</span>
                </span>
              </button>
              <button
                onClick={() => void mark(n.ids, !n.is_read)}
                aria-label={n.is_read ? "Mark as unread" : "Mark as read"}
                title={n.is_read ? "Mark as unread" : "Mark as read"}
                className="shrink-0 size-10 rounded-full flex items-center justify-center hover:bg-surface-2"
              >
                <span aria-hidden className={`size-2.5 rounded-full ${n.is_read ? "border border-muted/60" : "bg-gold"}`} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {cursor && !loading && !error && (
        <button
          onClick={() => void load({ append: cursor })}
          disabled={loadingMore}
          className="self-center min-h-10 px-5 rounded-full border border-border text-sm text-muted/92 hover:border-gold/40 disabled:opacity-60"
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  )
}
