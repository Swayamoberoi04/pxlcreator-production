"use client"

import { useEffect, useState, useRef } from "react"
import { motion }                       from "framer-motion"
import { useAuth }                      from "@/contexts/AuthContext"
import { ChannelCard }                  from "@/components/community/ChannelCard"
import { CommunityFeaturePreview }      from "@/components/community/CommunityFeaturePreview"
import { CHANNEL_CATEGORIES }           from "@/types/community"
import type { ChannelWithMeta }         from "@/types/community"

const PAGE_SIZE = 12

const ICON_OPTIONS = ["💬", "📷", "🎥", "✨", "🎨", "🚀", "🌍", "🎵"]

// ── Sample data shown when the API returns empty ──────────────────
const SAMPLE_CHANNELS = [
  { id: "s1", icon: "📷", name: "Photography Masters",   category: "photography",   description: "Advanced techniques for landscape, portrait & street photography.", member_count: 2840, post_count: 1200, is_member: false, visibility: "public" as const, tags: ["landscape","portrait","street"], created_at: "", updated_at: "" },
  { id: "s2", icon: "🎬", name: "Cinematic Editing",     category: "editing",       description: "Color grading, cuts, transitions — everything for that cinematic feel.", member_count: 1920, post_count: 870, is_member: false, visibility: "public" as const, tags: ["editing","colorgrade"], created_at: "", updated_at: "" },
  { id: "s3", icon: "🎨", name: "Color Grading Studio",  category: "color_grading", description: "LUTs, curves, and color science from industry professionals.", member_count: 1350, post_count: 540, is_member: false, visibility: "public" as const, tags: ["lut","color"], created_at: "", updated_at: "" },
  { id: "s4", icon: "🎥", name: "Filmmaking Collective", category: "filmmaking",    description: "From concept to final cut — share your filmmaking journey here.", member_count: 3100, post_count: 2000, is_member: false, visibility: "public" as const, tags: ["film","cinema"], created_at: "", updated_at: "" },
  { id: "s5", icon: "🌍", name: "Travel Visuals",        category: "travel",        description: "Inspiring travel photography and videography from around the globe.", member_count: 4200, post_count: 1800, is_member: false, visibility: "public" as const, tags: ["travel","adventure"], created_at: "", updated_at: "" },
  { id: "s6", icon: "✨", name: "Lifestyle Creators",    category: "lifestyle",     description: "Curating beautiful everyday moments — aesthetics, brands & stories.", member_count: 2600, post_count: 1100, is_member: false, visibility: "public" as const, tags: ["lifestyle","brand"], created_at: "", updated_at: "" },
]

interface CreateChannelForm {
  name: string; description: string; category: string
  visibility: "public" | "private"; icon: string; tags: string
}

function CreateChannelModal({ onClose, onCreated }: { onClose: () => void; onCreated: (ch: ChannelWithMeta) => void }) {
  const { user } = useAuth()
  const [form, setForm] = useState<CreateChannelForm>({
    name: "", description: "", category: "photography", visibility: "public", icon: "💬", tags: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState("")

  function set<K extends keyof CreateChannelForm>(key: K, value: CreateChannelForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true); setError("")
    try {
      const token = await user.getIdToken()
      const res   = await fetch("/api/community/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:   JSON.stringify({ ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) }),
      })
      if (res.ok) { const data = await res.json(); onCreated(data.channel ?? data); onClose() }
      else { const data = await res.json().catch(() => ({})); setError(data.error ?? "Failed to create channel.") }
    } catch { setError("Network error. Please try again.") }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-xl text-foreground">Create Channel</h2>
          <button onClick={onClose} className="text-muted/85 hover:text-foreground text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted/92">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.map((icon) => (
                <button key={icon} type="button" onClick={() => set("icon", icon)}
                  className={["text-2xl rounded-xl p-2 border transition-colors", form.icon === icon ? "border-gold bg-gold/10" : "border-border bg-surface-2 hover:border-gold/30"].join(" ")}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted/92">Channel Name *</label>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Travel Photographers"
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/50" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted/92">Description *</label>
            <textarea required rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What is this channel about?"
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/50 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted/92">Category</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)}
                className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold/50">
                {CHANNEL_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted/92">Visibility</label>
              <select value={form.visibility} onChange={(e) => set("visibility", e.target.value as "public" | "private")}
                className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold/50">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted/92">Tags (comma-separated)</label>
            <input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="e.g. landscape, portrait, travel"
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/50" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm text-muted/92 hover:text-foreground hover:bg-surface-2 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 rounded-xl bg-gold py-2.5 text-sm font-bold text-black hover:bg-gold/80 transition-colors disabled:opacity-60">
              {submitting ? "Creating…" : "Create Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Sample channel card used when API is empty
function SampleChannelCard({ ch }: { ch: typeof SAMPLE_CHANNELS[0] }) {
  return (
    <div className="relative rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4 hover:border-gold/30 hover:bg-surface-2 transition-all duration-200 group">
      <div className="absolute top-3 right-3">
        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">Preview</span>
      </div>
      <div className="flex items-start gap-3">
        <div className="size-11 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-2xl shrink-0 group-hover:border-gold/30 transition-colors">
          {ch.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm text-foreground truncate">{ch.name}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted/70 mt-0.5">
            {CHANNEL_CATEGORIES.find((c) => c.id === ch.category)?.label ?? ch.category}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted/85 leading-relaxed line-clamp-2">{ch.description}</p>
      <div className="flex items-center gap-3 text-xs text-muted/85">
        <span>👥 {ch.member_count.toLocaleString()}</span>
        <span>💬 {ch.post_count.toLocaleString()} posts</span>
      </div>
      <div className="pt-1 rounded-xl border border-border/50 bg-surface-2 py-2 px-4 text-center text-xs text-muted/70 font-semibold">
        Real-time discussions launching soon
      </div>
    </div>
  )
}

export default function ChannelsPage() {
  const { user }                         = useAuth()
  const [channels,      setChannels]     = useState<ChannelWithMeta[]>([])
  const [loading,       setLoading]      = useState(true)
  const [loadingMore,   setLoadingMore]  = useState(false)
  const [page,          setPage]         = useState(1)
  const [hasMore,       setHasMore]      = useState(true)
  const [category,      setCategory]     = useState("all")
  const [searchQuery,   setSearchQuery]  = useState("")
  const [viewMode,      setViewMode]     = useState<"grid" | "list">("grid")
  const [showModal,     setShowModal]    = useState(false)
  const [showSignInCTA, setShowSignInCTA] = useState(false)

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
    finally { setLoading(false); setLoadingMore(false) }
  }

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => { setPage(1); void loadChannels(true) }, 300)
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, searchQuery, user])

  function handleCreateClick() {
    if (!user) { setShowSignInCTA(true); return }
    setShowSignInCTA(false); setShowModal(true)
  }

  function handleChannelCreated(ch: ChannelWithMeta) { setChannels((prev) => [ch, ...prev]) }

  const gridCols = viewMode === "grid"
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    : "flex flex-col gap-3"

  const isEmpty = !loading && channels.length === 0

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-3xl text-foreground">Channels</h1>
          <p className="text-sm text-muted/85 mt-1">Focused communities for every creative discipline</p>
        </div>
        <button onClick={handleCreateClick}
          className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-black hover:bg-gold/80 transition-colors">
          + Create Channel
        </button>
      </div>

      {showSignInCTA && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 px-5 py-3 text-sm text-muted/92">
          <a href="/login" className="text-gold hover:underline font-semibold">Sign in</a> to create a channel.
        </div>
      )}

      {/* Category tabs */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {[{ id: "all", icon: "🌐", label: "All" }, ...CHANNEL_CATEGORIES].map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)}
              className={["flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                category === c.id ? "bg-gold text-black" : "border border-border text-muted/85 hover:border-gold/30 hover:text-foreground"].join(" ")}>
              <span>{c.icon}</span><span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search + view toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/70">🔍</span>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search channels…"
            className="w-full rounded-xl border border-border bg-surface px-10 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/50" />
        </div>
        <div className="flex gap-1 border border-border rounded-xl overflow-hidden shrink-0">
          {(["grid", "list"] as const).map((m) => (
            <button key={m} onClick={() => setViewMode(m)}
              className={["px-3 py-2 text-sm transition-colors", viewMode === m ? "bg-gold/15 text-gold" : "text-muted/85 hover:text-foreground"].join(" ")}>
              {m === "grid" ? "▦" : "≡"}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className={gridCols}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="rounded-2xl border border-border bg-surface h-44 animate-pulse" />)}
        </div>
      ) : channels.length > 0 ? (
        <>
          <div className={gridCols}>
            {channels.map((ch) => <ChannelCard key={ch.id} channel={ch} />)}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button onClick={() => loadChannels()} disabled={loadingMore}
                className="rounded-full border border-border px-6 py-2 text-sm text-muted/92 hover:border-gold/30 hover:text-foreground transition-colors disabled:opacity-50">
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      ) : (
        /* Empty state — show rich sample preview */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
          <div className="flex items-center gap-3 rounded-2xl border border-gold/20 bg-gold/5 px-5 py-4">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-display font-bold text-sm text-foreground">Channel discussions are coming soon</p>
              <p className="text-xs text-muted/85 mt-0.5">Here&apos;s a preview of what the community will look like at launch</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SAMPLE_CHANNELS.map((ch) => <SampleChannelCard key={ch.id} ch={ch} />)}
          </div>
        </motion.div>
      )}

      {/* Coming soon section — always visible */}
      {isEmpty && (
        <CommunityFeaturePreview
          variant="lightning"
          featureKey="channels"
          launch="Q3 2026"
          roadmap={[
            { quarter: "Q1 2026", label: "Channel infrastructure built", done: true },
            { quarter: "Q2 2026", label: "Moderation tools & beta test", done: true },
            { quarter: "Q3 2026", label: "Real-time discussions open to all", done: false },
            { quarter: "Q4 2026", label: "Voice rooms & live Q&A", done: false },
          ]}
          benefits={[
            "First access to channel creation tools",
            "Beta tester badge on your profile",
            "Direct input on features we build",
            "Founding member status in your chosen channels",
          ]}
        />
      )}

      {showModal && (
        <CreateChannelModal onClose={() => setShowModal(false)} onCreated={handleChannelCreated} />
      )}
    </div>
  )
}
