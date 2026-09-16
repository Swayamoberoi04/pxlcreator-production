"use client"

import { useEffect, useState, useCallback } from "react"
import { motion }                            from "framer-motion"
import { useAuth }                           from "@/contexts/AuthContext"
import { ShowcaseCard }                      from "@/components/community/ShowcaseCard"
import type { ShowcaseWithMeta, ProjectWithMeta } from "@/types/community"

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
    setTimeout(() => { setPage(1); void fetchItems(category, 1) }, 0)
  }, [category, fetchItems])

  const isEmpty = !loading && items.length === 0
  const hasFilter = !!category

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-[1.75rem] text-foreground">Creator Showcase</h1>
          <p className="text-[0.9375rem] text-muted/85 mt-1">Real, permanent portfolios from the PXL Creator community.</p>
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
        <div className="flex flex-col items-center gap-3 py-16 text-center rounded-2xl border border-border bg-surface">
          <span className="text-4xl">🖼️</span>
          <p className="font-semibold text-foreground">
            {hasFilter ? "No showcases in this category yet" : "No showcases yet"}
          </p>
          <p className="text-sm text-muted/85 max-w-sm">
            {hasFilter
              ? "Try a different category, or check back soon."
              : "Nobody has shared their work yet — this isn't a bug. Be the first."}
          </p>
          {hasFilter ? (
            <button onClick={() => setCategory("")} className="mt-1 text-xs text-gold hover:underline">Clear filter</button>
          ) : user ? (
            <button onClick={() => setShowUpload(true)} className="mt-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-black hover:bg-gold/90 transition-colors">
              Share your work
            </button>
          ) : null}
        </div>
      )}

      {isEmpty && !hasFilter && !user && (
        <p className="text-center text-xs text-muted/60">Sign in to be the first to share your work.</p>
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
    client_name: "", visibility: "public",
  })
  const [myProjects, setMyProjects] = useState<ProjectWithMeta[]>([])
  const [projectId, setProjectId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  // Real projects this creator can credit: ones they posted, plus ones they
  // were accepted onto (the API enforces this same check server-side).
  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function loadProjects() {
      try {
        const token = await user!.getIdToken()
        const res = await fetch("/api/community/projects?mine=true&status=completed&limit=50", { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok && !cancelled) setMyProjects((await res.json()).projects ?? [])
      } catch { /* project linkage is optional */ }
    }
    void loadProjects()
    return () => { cancelled = true }
  }, [user])

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
          project_id: projectId || null,
          client_name: form.client_name.trim() || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const { item } = await res.json() as { item: ShowcaseWithMeta }
      onUploaded(item)
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to upload.") }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
      <motion.form initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-black/90 backdrop-blur-2xl p-6 flex flex-col gap-4 my-8">
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

          {/* Real client/project context */}
          {myProjects.length > 0 && (
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground focus:outline-none focus:border-gold/40">
              <option value="">No linked project</option>
              {myProjects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}
          {!projectId && (
            <input value={form.client_name} onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))} placeholder="Client name (optional, for work outside PXL)"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[0.9375rem] text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40" />
          )}

          <label className="flex items-center gap-2 text-[0.8125rem] text-muted/85">
            <input type="checkbox" checked={form.visibility === "private"}
              onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.checked ? "private" : "public" }))} />
            Private (only visible to you)
          </label>
        </div>
        <button type="submit" disabled={saving}
          className="rounded-full bg-gold py-3 text-[0.9375rem] font-semibold text-background hover:bg-gold/90 disabled:opacity-50 transition-colors">
          {saving ? "Sharing…" : "Share to Showcase"}
        </button>
      </motion.form>
    </div>
  )
}
