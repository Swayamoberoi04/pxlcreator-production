"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link                                          from "next/link"
import { useParams, useRouter }                      from "next/navigation"
import { useAuth }                                   from "@/contexts/AuthContext"
import { MessageBubble, type SpaceMessage }          from "@/components/community/MessageBubble"
import type { CommunitySpace }                       from "@/components/community/SpaceCard"

function MessageSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-2">
      <div className="size-8 rounded-full bg-surface-2 animate-pulse shrink-0" />
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="h-3 w-24 rounded bg-surface-2 animate-pulse" />
        <div className="h-3 w-full rounded bg-surface-2 animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-surface-2 animate-pulse" />
      </div>
    </div>
  )
}

export default function SpaceChatPage() {
  const { id }              = useParams<{ id: string }>()
  const { user }            = useAuth()
  const router              = useRouter()

  const [space,      setSpace]      = useState<CommunitySpace | null>(null)
  const [allSpaces,  setAllSpaces]  = useState<CommunitySpace[]>([])
  const [messages,   setMessages]   = useState<SpaceMessage[]>([])
  const [isJoined,   setIsJoined]   = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [sending,    setSending]    = useState(false)
  const [replyTo,    setReplyTo]    = useState<SpaceMessage | null>(null)

  const feedRef     = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function getHeaders(): Promise<Record<string, string>> {
    if (!user) return {}
    const token = await user.getIdToken()
    return { Authorization: `Bearer ${token}` }
  }

  // Scroll feed to bottom
  function scrollToBottom() {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }

  // Fetch initial data
  const loadInitial = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getHeaders()

      // All spaces (for sidebar quick nav)
      const spacesRes = await fetch("/api/community/spaces", { headers })
      if (spacesRes.ok) {
        const data = await spacesRes.json()
        const list: CommunitySpace[] = data.spaces ?? data ?? []
        setAllSpaces(list)
        const found = list.find((s) => s.id === id || s.slug === id)
        if (found) {
          setSpace(found)
          setIsJoined(found.is_member ?? false)
        }
      }

      // Messages
      const msgsRes = await fetch(`/api/community/spaces/${id}/messages?limit=50`, { headers })
      if (msgsRes.ok) {
        const data = await msgsRes.json()
        setMessages(data.messages ?? data ?? [])
        setTimeout(scrollToBottom, 50)
      }
    } catch {
      setError("Could not load messages")
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user])

  // Poll for new messages
  const pollMessages = useCallback(async () => {
    try {
      const headers = await getHeaders()
      const res     = await fetch(`/api/community/spaces/${id}/messages?limit=50`, { headers })
      if (res.ok) {
        const data    = await res.json()
        const fresh: SpaceMessage[] = data.messages ?? data ?? []
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id))
          const added    = fresh.filter((m) => !existing.has(m.id))
          if (added.length === 0) return prev
          setTimeout(scrollToBottom, 50)
          return [...prev, ...added]
        })
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInitial()
  }, [loadInitial])

  useEffect(() => {
    intervalRef.current = setInterval(() => { void pollMessages() }, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [pollMessages])

  async function handleJoin() {
    if (!user) { router.push("/signin"); return }
    try {
      const token  = await user.getIdToken()
      const method = isJoined ? "DELETE" : "POST"
      const res    = await fetch(`/api/community/spaces/${id}/join`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setIsJoined((prev) => !prev)
    } catch { /* ignore */ }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !user) return
    setSending(true)
    try {
      const token = await user.getIdToken()
      const body: Record<string, string> = { body: newMessage.trim() }
      if (replyTo) body.reply_to_id = replyTo.id
      const res = await fetch(`/api/community/spaces/${id}/messages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, data.message ?? data])
        setNewMessage("")
        setReplyTo(null)
        setTimeout(scrollToBottom, 50)
      }
    } catch { /* ignore */ } finally {
      setSending(false)
    }
  }

  async function handleReact(msgId: string, emoji: string) {
    if (!user) return
    try {
      const token = await user.getIdToken()
      await fetch(`/api/community/spaces/${id}/messages/${msgId}/react`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ emoji }),
      })
      setMessages((prev) =>
        prev.map((m) => m.id === msgId ? { ...m, reaction_count: m.reaction_count + 1 } : m)
      )
    } catch { /* ignore */ }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  const pinnedMessages = messages.filter((m) => m.is_pinned)

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden -mx-4 md:-mx-0">
      {/* LEFT SIDEBAR */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-surface/50 overflow-y-auto">
        {/* Space info */}
        {space && (
          <div className="p-4 border-b border-border">
            <div
              className="flex items-center justify-center h-14 w-full rounded-xl text-3xl mb-3"
              style={{ background: `linear-gradient(135deg, ${space.color}22, ${space.color}08)` }}
            >
              {space.icon}
            </div>
            <p className="font-bold text-sm text-foreground text-center">{space.name}</p>
            <p className="text-[11px] text-muted/50 text-center mt-0.5">
              {space.member_count.toLocaleString()} members
            </p>
            <button
              onClick={handleJoin}
              className={[
                "mt-3 w-full rounded-xl py-1.5 text-xs font-bold transition-colors",
                isJoined
                  ? "border border-border text-muted/60 hover:text-red-400 hover:border-red-500/30"
                  : "bg-gold text-black hover:bg-gold/90",
              ].join(" ")}
            >
              {isJoined ? "Leave" : "Join"}
            </button>
          </div>
        )}

        {/* All spaces quick nav */}
        <div className="p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted/40 px-1 pb-2">All Spaces</p>
          <div className="flex flex-col gap-0.5">
            {allSpaces.map((s) => (
              <Link
                key={s.id}
                href={`/community/spaces/${s.id}`}
                className={[
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                  s.id === id
                    ? "bg-gold/10 text-gold"
                    : "text-muted/60 hover:bg-surface-2 hover:text-foreground",
                ].join(" ")}
              >
                <span>{s.icon}</span>
                <span className="truncate">{s.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </aside>

      {/* CENTER: feed + input */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Channel header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface/50 shrink-0">
          {space && (
            <>
              <span className="text-xl">{space.icon}</span>
              <div>
                <p className="font-bold text-sm text-foreground">{space.name}</p>
                <p className="text-[11px] text-muted/50">{space.description}</p>
              </div>
            </>
          )}
        </div>

        {/* Pinned messages */}
        {pinnedMessages.length > 0 && (
          <div className="px-4 py-2 border-b border-gold/20 bg-gold/[0.03] shrink-0">
            <p className="text-[11px] text-gold/70 font-semibold mb-1">📌 Pinned</p>
            {pinnedMessages.slice(0, 2).map((m) => (
              <p key={m.id} className="text-xs text-muted/70 truncate">{m.body}</p>
            ))}
          </div>
        )}

        {/* Message feed */}
        <div ref={feedRef} className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 8 }).map((_, i) => <MessageSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <span className="text-3xl">⚠️</span>
              <p className="font-semibold text-foreground">Could not load messages</p>
              <button
                onClick={() => void loadInitial()}
                className="rounded-xl px-4 py-2 text-sm font-bold bg-gold text-black hover:bg-gold/90"
              >
                Retry
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <span className="text-4xl">👋</span>
              <p className="font-semibold text-foreground">No messages yet</p>
              <p className="text-sm text-muted/50">Be the first to say hello!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onReact={handleReact}
                  onReply={setReplyTo}
                />
              ))}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-border bg-surface/80 p-3">
          {!user ? (
            <div className="text-center py-2">
              <Link href="/signin" className="text-sm text-gold hover:underline">
                Sign in to chat
              </Link>
            </div>
          ) : !isJoined ? (
            <div className="flex items-center gap-3 justify-center py-2">
              <p className="text-sm text-muted/60">Join this space to start chatting</p>
              <button
                onClick={handleJoin}
                className="rounded-xl px-4 py-1.5 text-xs font-bold bg-gold text-black hover:bg-gold/90 transition-colors"
              >
                Join
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Reply preview */}
              {replyTo && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-gold/30 text-xs">
                  <span className="text-gold/70">↩ Replying to</span>
                  <span className="text-muted/70 truncate flex-1">{replyTo.body}</span>
                  <button
                    onClick={() => setReplyTo(null)}
                    className="text-muted/40 hover:text-foreground shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value.slice(0, 2000))}
                  onKeyDown={handleKeyDown}
                  placeholder="Message…"
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50 transition-colors max-h-40"
                  style={{ minHeight: "40px" }}
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!newMessage.trim() || sending}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-40 shrink-0"
                >
                  {sending ? "…" : "Send"}
                </button>
              </div>
              <p className="text-[10px] text-muted/30 text-right">{newMessage.length}/2000 · Enter to send, Shift+Enter for newline</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
