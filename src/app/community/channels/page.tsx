"use client"

import { useEffect, useState, useRef } from "react"
import { useAuth }                      from "@/contexts/AuthContext"
import { ChannelCard }                  from "@/components/community/ChannelCard"
import { CHANNEL_CATEGORIES }           from "@/types/community"
import type { ChannelWithMeta }         from "@/types/community"

const PAGE_SIZE = 12

const ICON_OPTIONS = ["💬", "📷", "🎥", "✨", "🎨", "🚀", "🌍", "🎵"]

interface CreateChannelForm {
  name:        string
  description: string
  category:    string
  visibility:  "public" | "private"
  icon:        string
  tags:        string
}

function CreateChannelModal({ onClose, onCreated }: { onClose: () => void; onCreated: (ch: ChannelWithMeta) => void }) {
  const { user } = useAuth()
  const [form, setForm] = useState<CreateChannelForm>({
    name:        "",
    description: "",
    category:    "photography",
    visibility:  "public",
    icon:        "💬",
    tags:        "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState("")

  function set<K extends keyof CreateChannelForm>(key: K, value: CreateChannelForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError("")

    try {
      const token = await user.getIdToken()
      const res   = await fetch("/api/community/channels", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          ...form,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        onCreated(data.channel ?? data)
        onClose()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to create channel. Please try again.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-black text-xl text-foreground">Create Channel</h2>
          <button onClick={onClose} className="text-muted/50 hover:text-foreground text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Icon picker */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted/70">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => set("icon", icon)}
                  className={[
                    "text-2xl rounded-xl p-2 border transition-colors",
                    form.icon === icon ? "border-gold bg-gold/10" : "border-border bg-surface-2 hover:border-gold/30",
                  ].join(" ")}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted/70">Channel Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Travel Photographers"
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted/70">Description *</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What is this channel about?"
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50 resize-none"
            />
          </div>

          {/* Category + Visibility row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted/70">Category</label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold/50"
              >
                {CHANNEL_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted/70">Visibility</label>
              <select
                value={form.visibility}
                onChange={(e) => set("visibility", e.target.value as "public" | "private")}
                className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold/50"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted/70">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="e.g. landscape, portrait, travel"
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm text-muted/70 hover:text-foreground hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-gold py-2.5 text-sm font-bold text-black hover:bg-gold/80 transition-colors disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ChannelsPage() {
  const { user } = useAuth()

  const [channels,       setChannels]       = useState<ChannelWithMeta[]>([])
  const [loading,        setLoading]        = useState(true)
  const [loadingMore,    setLoadingMore]     = useState(false)
  const [page,           setPage]           = useState(1)
  const [hasMore,        setHasMore]        = useState(true)
  const [category,       setCategory]       = useState("all")
  const [searchQuery,    setSearchQuery]    = useState("")
  const [viewMode,       setViewMode]       = useState<"grid" | "list">("grid")
  const [showModal,      setShowModal]      = useState(false)
  const [showSignInCTA,  setShowSignInCTA]  = useState(false)

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function getHeaders(): Promise<HeadersInit> {
    if (!user) return {}
    const token = await user.getIdToken()
    return { Authorization: `Bearer ${token}` }
  }

  async function loadChannels(reset = false) {
    const currentPage = reset ? 1 : page
    if (reset) setLoading(true); else setLoadingMore(true)

    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: String(PAGE_SIZE) })
      if (category !== "all") params.set("category", category)
      if (searchQuery)         params.set("q", searchQuery)

      const headers = await getHeaders()
      const res     = await fetch(`/api/community/channels?${params}`, { headers })
      if (res.ok) {
        const data = await res.json()
        const fetched: ChannelWithMeta[] = data.channels ?? data ?? []
        setChannels((prev) => reset ? fetched : [...prev, ...fetched])
        setHasMore(fetched.length === PAGE_SIZE)
        if (!reset) setPage((p) => p + 1)
      }
    } catch { /* ignore */ }
    finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Reload on filter change
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      setPage(1)
      void loadChannels(true)
    }, 300)
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, searchQuery, user])

  function handleCreateClick() {
    if (!user) { setShowSignInCTA(true); return }
    setShowSignInCTA(false)
    setShowModal(true)
  }

  function handleChannelCreated(ch: ChannelWithMeta) {
    setChannels((prev) => [ch, ...prev])
  }

  const gridCols = viewMode === "grid"
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    : "flex flex-col gap-3"

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-display font-black text-3xl text-foreground">Channels</h1>
        <button
          onClick={handleCreateClick}
          className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-black hover:bg-gold/80 transition-colors"
        >
          + Create Channel
        </button>
      </div>

      {showSignInCTA && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-muted/80">
          <a href="/login" className="text-gold hover:underline font-semibold">Sign in</a> to create a channel.
        </div>
      )}

      {/* Category tabs */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setCategory("all")}
            className={[
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              category === "all"
                ? "bg-gold text-black"
                : "border border-border text-muted/60 hover:border-gold/30 hover:text-foreground",
            ].join(" ")}
          >
            All
          </button>
          {CHANNEL_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={[
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                category === c.id
                  ? "bg-gold text-black"
                  : "border border-border text-muted/60 hover:border-gold/30 hover:text-foreground",
              ].join(" ")}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search + view toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/40">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels…"
            className="w-full rounded-xl border border-border bg-surface px-10 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50"
          />
        </div>
        <div className="flex gap-1 border border-border rounded-xl overflow-hidden shrink-0">
          <button
            onClick={() => setViewMode("grid")}
            className={["px-3 py-2 text-sm transition-colors", viewMode === "grid" ? "bg-gold/15 text-gold" : "text-muted/50 hover:text-foreground"].join(" ")}
            title="Grid view"
          >
            ▦
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={["px-3 py-2 text-sm transition-colors", viewMode === "list" ? "bg-gold/15 text-gold" : "text-muted/50 hover:text-foreground"].join(" ")}
            title="List view"
          >
            ≡
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className={gridCols}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface h-44 animate-pulse" />
          ))}
        </div>
      ) : channels.length > 0 ? (
        <>
          <div className={gridCols}>
            {channels.map((ch) => <ChannelCard key={ch.id} channel={ch} />)}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => loadChannels()}
                disabled={loadingMore}
                className="rounded-full border border-border px-6 py-2 text-sm text-muted/70 hover:border-gold/30 hover:text-foreground transition-colors disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <span className="text-4xl">💬</span>
          <p className="text-foreground font-semibold">No channels found</p>
          <p className="text-sm text-muted/50">Try a different category or search term</p>
        </div>
      )}

      {showModal && (
        <CreateChannelModal
          onClose={() => setShowModal(false)}
          onCreated={handleChannelCreated}
        />
      )}
    </div>
  )
}
