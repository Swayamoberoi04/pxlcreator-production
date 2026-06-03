"use client"

import { useEffect, useState, useCallback } from "react"
import { motion }                            from "framer-motion"
import { useAuth }                           from "@/contexts/AuthContext"
import { ShowcaseCard }                      from "@/components/community/ShowcaseCard"
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
      if (user) {
        const token = await user.getIdToken()
        headers["Authorization"] = `Bearer ${token}`
      }

      const res   = await fetch(`/api/community/showcase?${params}`, { headers })
      const data  = await res.json() as { items?: ShowcaseWithMeta[]; has_more?: boolean }
      const fetched = data.items ?? []
      setItems(append ? (prev) => [...prev, ...fetched] : fetched)
      setHasMore(data.has_more ?? false)
    } catch (err) {
      console.error("[showcase]", err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchItems(category, 1)
  }, [category, fetchItems])

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-[1.75rem] text-foreground">
            Creator Showcase
          </h1>
          <p className="text-[0.9375rem] text-muted/60 mt-1">
            Inspiring work from the PXL Creator community.
          </p>
        </div>

        {user && (
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-[0.875rem] font-semibold text-background hover:bg-gold/90 transition-colors"
          >
            ✦ Share Work
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-[0.8125rem] font-medium transition-all ${
              category === cat.id
                ? "bg-gold text-background"
                : "border border-border text-muted/70 hover:border-gold/40 hover:text-foreground"
            }`}
          >
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
      ) : (items ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-[3rem]">🖼</span>
          <p className="font-display font-black text-[1.25rem] text-foreground">No showcases yet</p>
          <p className="text-muted/60 max-w-sm">
            Be the first to share your work in this category.
          </p>
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {items.map((item) => (
              <ShowcaseCard key={item.id} item={item} />
            ))}
          </motion.div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => {
                  const next = page + 1
                  setPage(next)
                  void fetchItems(category, next, true)
                }}
                disabled={loading}
                className="rounded-full border border-border px-6 py-2.5 text-[0.875rem] text-muted hover:text-foreground hover:border-gold/30 transition-all disabled:opacity-50"
              >
                {loading ? "Loading…" : "Load More"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onUploaded={(item) => {
          setItems(prev => [item, ...prev])
          setShowUpload(false)
        }} />
      )}
    </div>
  )
}

/* ── Upload Modal ─────────────────────────────────────────────── */
function UploadModal({ onClose, onUploaded }: {
  onClose:    () => void
  onUploaded: (item: ShowcaseWithMeta) => void
}) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    title: "", description: "", item_type: "photo",
    thumbnail_url: "", category: "photography",
    software_used: "", hashtags: "",
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError("")
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/community/showcase", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          ...form,
          software_used: form.software_used.split(",").map(s => s.trim()).filter(Boolean),
          hashtags:      form.hashtags.split(",").map(s => s.trim().replace(/^#/, "")).filter(Boolean),
          media_urls:    form.thumbnail_url ? [form.thumbnail_url] : [],
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const { item } = await res.json() as { item: ShowcaseWithMeta }
      onUploaded(item)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
      <motion.form
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-black/90 backdrop-blur-2xl p-6 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display font-black text-[1.125rem]">Share Your Work</h2>
          <button type="button" onClick={onClose} className="text-muted/40 hover:text-muted text-[1.25rem] leading-none">×</button>
        </div>

        {error && <p className="text-[0.875rem] text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex flex-col gap-3">
          <input
            required
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Title *"
            maxLength={150}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/40"
          />
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Description"
            rows={3}
            maxLength={1000}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/40 resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.item_type}
              onChange={e => setForm(p => ({ ...p, item_type: e.target.value }))}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground focus:outline-none focus:border-gold/40"
            >
              {["photo","video","before_after","reel","short_film"].map(t => (
                <option key={t} value={t}>{t.replace("_"," ")}</option>
              ))}
            </select>
            <select
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground focus:outline-none focus:border-gold/40"
            >
              {["photography","cinematography","editing","travel","fashion","food","lifestyle","other"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <input
            value={form.thumbnail_url}
            onChange={e => setForm(p => ({ ...p, thumbnail_url: e.target.value }))}
            placeholder="Image / thumbnail URL"
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/40"
          />
          <input
            value={form.software_used}
            onChange={e => setForm(p => ({ ...p, software_used: e.target.value }))}
            placeholder="Software used (comma-separated: Lightroom, Premiere Pro)"
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/40"
          />
          <input
            value={form.hashtags}
            onChange={e => setForm(p => ({ ...p, hashtags: e.target.value }))}
            placeholder="Hashtags (comma-separated: cinematic, portrait)"
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/40"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-gold py-3 text-[0.9375rem] font-semibold text-background hover:bg-gold/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Sharing…" : "Share to Showcase"}
        </button>
      </motion.form>
    </div>
  )
}
