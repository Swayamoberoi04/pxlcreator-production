"use client"

import { useEffect, useState, useCallback } from "react"
import { motion }                            from "framer-motion"
import { useAuth }                           from "@/contexts/AuthContext"
import { ShowcaseCard }                      from "@/components/community/ShowcaseCard"
import { CommunityFeaturePreview }           from "@/components/community/CommunityFeaturePreview"
import type { ShowcaseWithMeta }             from "@/types/community"

const CATEGORIES = [
  { id: "", label: "All" },
  { id: "photography",    label: "Photography" },
  { id: "cinematography", label: "Cinematography" },
  { id: "editing",        label: "Editing" },
  { id: "travel",         label: "Travel" },
  { id: "fashion",        label: "Fashion" },
  { id: "food",           label: "Food" },
  { id: "lifestyle",      label: "Lifestyle" },
]

// ── Sample showcase items shown when API returns empty ────────────
const SAMPLE_SHOWCASES = [
  {
    id: "ss1", title: "Golden Hour in Patagonia", category: "photography", item_type: "photo",
    thumbnail_url: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80",
    like_count: 842, bookmark_count: 215, comment_count: 47,
    creator: { display_name: "Elena Cruz", username: "elenacruz" },
    hashtags: ["landscape","patagonia","goldenhour"],
  },
  {
    id: "ss2", title: "Tokyo Rain — Cinematic Travel Film", category: "cinematography", item_type: "video",
    thumbnail_url: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
    like_count: 1240, bookmark_count: 380, comment_count: 92,
    creator: { display_name: "Yuki Tanaka", username: "yukitanaka" },
    hashtags: ["tokyo","travel","cinematic"],
  },
  {
    id: "ss3", title: "Before & After — Moody Edit", category: "editing", item_type: "before_after",
    thumbnail_url: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=600&q=80",
    like_count: 620, bookmark_count: 290, comment_count: 38,
    creator: { display_name: "Marcus Bell", username: "marcusbell" },
    hashtags: ["editing","beforeafter","colorgrade"],
  },
  {
    id: "ss4", title: "Sahara Color Grade Project", category: "editing", item_type: "photo",
    thumbnail_url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&q=80",
    like_count: 505, bookmark_count: 178, comment_count: 29,
    creator: { display_name: "Amara Diallo", username: "amaradiallo" },
    hashtags: ["desert","colorgrade","travel"],
  },
  {
    id: "ss5", title: "Portrait Series — Natural Light", category: "photography", item_type: "photo",
    thumbnail_url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80",
    like_count: 1100, bookmark_count: 440, comment_count: 74,
    creator: { display_name: "Priya Sharma", username: "priyasharma" },
    hashtags: ["portrait","naturallight","fashion"],
  },
  {
    id: "ss6", title: "Mountain Road Reel", category: "travel", item_type: "reel",
    thumbnail_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80",
    like_count: 780, bookmark_count: 210, comment_count: 55,
    creator: { display_name: "Jake Okonkwo", username: "jakeokonkwo" },
    hashtags: ["mountains","reel","adventure"],
  },
]

// Featured creator spotlight
const FEATURED_CREATOR = {
  name: "Elena Cruz", username: "elenacruz", role: "Landscape & Travel Photographer",
  bio: "Documenting the world's most breathtaking landscapes — one frame at a time.",
  showcases: 48, followers: 3200, likes: 14000,
  avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&q=80",
}

function SampleShowcaseCard({ item }: { item: typeof SAMPLE_SHOWCASES[0] }) {
  return (
    <div className="relative rounded-2xl border border-border bg-surface overflow-hidden group hover:border-gold/30 transition-all duration-200">
      <div className="absolute top-2 left-2 z-10">
        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-gold border border-gold/20">Preview</span>
      </div>
      <div className="aspect-[4/3] bg-surface-2 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="p-4 flex flex-col gap-2">
        <p className="font-display font-bold text-sm text-foreground line-clamp-1">{item.title}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted/85">@{item.creator.username}</span>
          <div className="flex items-center gap-3 text-xs text-muted/85">
            <span>♥ {item.like_count.toLocaleString()}</span>
            <span>🔖 {item.bookmark_count}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ShowcasePage() {
  const { user } = useAuth()
  const [items,      setItems]      = useState<ShowcaseWithMeta[]>([])
  const [category,   setCategory]   = useState("")
  const [page,       setPage]       = useState(1)
  const [hasMore,    setHasMore]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [showUpload, setShowUpload] = useState(false)

  const fetchItems = useCallback(async (cat: string, pg: number, append = false) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: "20", page: String(pg) })
      if (cat) params.set("category", cat)
      const headers: Record<string, string> = {}
      if (user) { const token = await user.getIdToken(); headers["Authorization"] = `Bearer ${token}` }
      const res   = await fetch(`/api/community/showcase?${params}`, { headers })
      const data  = await res.json() as { items?: ShowcaseWithMeta[]; has_more?: boolean }
      const fetched = data.items ?? []
      setItems(append ? (prev) => [...prev, ...fetched] : fetched)
      setHasMore(data.has_more ?? false)
    } catch (err) { console.error("[showcase]", err) }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1); void fetchItems(category, 1)
  }, [category, fetchItems])

  const isEmpty = !loading && items.length === 0

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-[1.75rem] text-foreground">Creator Showcase</h1>
          <p className="text-[0.9375rem] text-muted/85 mt-1">Inspiring work from the PXL Creator community.</p>
        </div>
        {user && (
          <button type="button" onClick={() => setShowUpload(true)}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-[0.875rem] font-semibold text-background hover:bg-gold/90 transition-colors">
            ✦ Share Work
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((cat) => (
          <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-[0.8125rem] font-medium transition-all ${category === cat.id ? "bg-gold text-background" : "border border-border text-muted/92 hover:border-gold/40 hover:text-foreground"}`}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading && page === 1 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-2xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => <ShowcaseCard key={item.id} item={item} />)}
          </motion.div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button type="button" onClick={() => { const next = page + 1; setPage(next); void fetchItems(category, next, true) }}
                disabled={loading}
                className="rounded-full border border-border px-6 py-2.5 text-[0.875rem] text-muted hover:text-foreground hover:border-gold/30 transition-all disabled:opacity-50">
                {loading ? "Loading…" : "Load More"}
              </button>
            </div>
          )}
        </>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8">
          {/* Info banner */}
          <div className="flex items-center gap-3 rounded-2xl border border-gold/20 bg-gold/5 px-5 py-4">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-display font-bold text-sm text-foreground">Public portfolio publishing coming soon</p>
              <p className="text-xs text-muted/85 mt-0.5">Here&apos;s a preview of the stunning work our community will showcase</p>
            </div>
          </div>

          {/* Featured Creator Spotlight */}
          <div className="rounded-2xl border border-gold/25 bg-gold/[0.03] p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gold mb-4">✦ Featured Creator Spotlight</p>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="size-16 rounded-full overflow-hidden border-2 border-gold/30 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={FEATURED_CREATOR.avatar} alt={FEATURED_CREATOR.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-base text-foreground">{FEATURED_CREATOR.name}</p>
                <p className="text-xs text-muted/85">@{FEATURED_CREATOR.username} · {FEATURED_CREATOR.role}</p>
                <p className="text-xs text-muted/85 mt-1.5 line-clamp-2">{FEATURED_CREATOR.bio}</p>
              </div>
              <div className="flex gap-4 shrink-0">
                {[
                  { label: "Showcases", value: FEATURED_CREATOR.showcases },
                  { label: "Followers",  value: FEATURED_CREATOR.followers.toLocaleString() },
                  { label: "Total Likes", value: FEATURED_CREATOR.likes.toLocaleString() },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="font-display font-bold text-base text-gold">{s.value}</p>
                    <p className="text-[10px] text-muted/85">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sample showcase grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SAMPLE_SHOWCASES.map((item) => <SampleShowcaseCard key={item.id} item={item} />)}
          </div>
        </motion.div>
      )}

      {/* Coming soon section */}
      {isEmpty && (
        <CommunityFeaturePreview
          variant="film"
          featureKey="showcase"
          launch="Q3 2026"
          roadmap={[
            { quarter: "Q1 2026", label: "Portfolio upload system built", done: true },
            { quarter: "Q2 2026", label: "Moderation & featured creator tools", done: true },
            { quarter: "Q3 2026", label: "Public showcase open to all creators", done: false },
            { quarter: "Q4 2026", label: "Sponsored showcases & brand deals", done: false },
          ]}
          benefits={[
            "Your work featured prominently at launch",
            "Early access to portfolio analytics",
            "Verified creator badge for early submitters",
            "Featured Creator Spotlight consideration",
          ]}
        />
      )}

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onUploaded={(item) => { setItems((prev) => [item, ...prev]); setShowUpload(false) }} />
      )}
    </div>
  )
}

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: (item: ShowcaseWithMeta) => void }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    title: "", description: "", item_type: "photo",
    thumbnail_url: "", category: "photography", software_used: "", hashtags: "",
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true); setError("")
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/community/showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          software_used: form.software_used.split(",").map((s) => s.trim()).filter(Boolean),
          hashtags: form.hashtags.split(",").map((s) => s.trim().replace(/^#/, "")).filter(Boolean),
          media_urls: form.thumbnail_url ? [form.thumbnail_url] : [],
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const { item } = await res.json() as { item: ShowcaseWithMeta }
      onUploaded(item)
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to upload.") }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
      <motion.form initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-black/90 backdrop-blur-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-[1.125rem]">Share Your Work</h2>
          <button type="button" onClick={onClose} className="text-muted/70 hover:text-muted text-[1.25rem] leading-none">×</button>
        </div>
        {error && <p className="text-[0.875rem] text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex flex-col gap-3">
          <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title *" maxLength={150}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
          <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" rows={3} maxLength={1000}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.item_type} onChange={(e) => setForm((p) => ({ ...p, item_type: e.target.value }))}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground focus:outline-none focus:border-gold/40">
              {["photo","video","before_after","reel","short_film"].map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
            <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground focus:outline-none focus:border-gold/40">
              {["photography","cinematography","editing","travel","fashion","food","lifestyle","other"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input value={form.thumbnail_url} onChange={(e) => setForm((p) => ({ ...p, thumbnail_url: e.target.value }))} placeholder="Image / thumbnail URL"
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
          <input value={form.software_used} onChange={(e) => setForm((p) => ({ ...p, software_used: e.target.value }))} placeholder="Software used (comma-separated)"
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
          <input value={form.hashtags} onChange={(e) => setForm((p) => ({ ...p, hashtags: e.target.value }))} placeholder="Hashtags (comma-separated)"
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
        </div>
        <button type="submit" disabled={saving}
          className="rounded-full bg-gold py-3 text-[0.9375rem] font-semibold text-background hover:bg-gold/90 disabled:opacity-50 transition-colors">
          {saving ? "Sharing…" : "Share to Showcase"}
        </button>
      </motion.form>
    </div>
  )
}
