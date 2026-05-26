"use client"

/**
 * /admin/categories — Category manager
 */

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface Category {
  id:          string
  name:        string
  slug:        string
  description: string | null
  icon:        string | null
  color:       string | null
  order_index: number
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading,    setLoading]    = useState(true)
  const [creating,   setCreating]   = useState(false)

  // New category form
  const [name,       setName]       = useState("")
  const [desc,       setDesc]       = useState("")
  const [icon,       setIcon]       = useState("")
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState("")

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((j) => { if (j.success) setCategories(j.data) })
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError("")

    const res  = await fetch("/api/admin/categories", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, description: desc, icon }),
    })
    const json = await res.json()

    if (json.success) {
      setCategories((prev) => [...prev, json.data])
      setName(""); setDesc(""); setIcon("")
      setCreating(false)
    } else {
      setError(json.error ?? "Failed to create category.")
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="h-px w-5 bg-gold/50" />
            <span className="text-[0.7rem] text-gold/60 tracking-widest">( CATEGORIES )</span>
          </div>
          <h1 className="font-display font-black text-[1.75rem] text-white/90">Categories</h1>
          <p className="text-[0.875rem] text-white/30">
            Manage preset categories. Presets are assigned to categories during import.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(!creating)}
          className="shrink-0 flex items-center gap-2 rounded-xl bg-gold text-background font-semibold px-5 py-2.5 text-[0.875rem] hover:bg-gold-dim transition-all active:scale-95"
        >
          + New Category
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="rounded-2xl border border-gold/20 bg-gold/[0.03] p-6">
          <h2 className="text-[0.875rem] font-semibold text-white/70 mb-4">( New Category )</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] text-white/40 tracking-widest">( Name )</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Moody" required className="admin-input" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] text-white/40 tracking-widest">( Icon emoji )</label>
                <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🎞️" className="admin-input" />
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-[0.75rem] text-white/40 tracking-widest">( Description )</label>
                <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description shown on the presets page…" className="admin-input" />
              </div>
            </div>
            {error && <p className="text-[0.8125rem] text-red-400">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="rounded-xl bg-gold text-background font-semibold px-5 py-2 text-[0.875rem] disabled:opacity-40 hover:bg-gold-dim">
                {saving ? "Creating…" : "( Create )"}
              </button>
              <button type="button" onClick={() => setCreating(false)} className="rounded-xl border border-white/10 text-white/40 px-5 py-2 text-[0.875rem] hover:text-white/70">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          {categories.map((cat, i) => (
            <div
              key={cat.id}
              className={cn(
                "flex items-center gap-4 px-4 py-4",
                i > 0 && "border-t border-white/[0.06]"
              )}
            >
              {/* Icon */}
              <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 text-[1.25rem]">
                {cat.icon ?? "📦"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[0.9375rem] font-semibold text-white/80">{cat.name}</p>
                <p className="text-[0.75rem] text-white/30 truncate">
                  {cat.description ?? "No description"}
                </p>
              </div>

              {/* Slug */}
              <code className="text-[0.7rem] text-white/20 bg-white/[0.04] rounded-lg px-2.5 py-1 font-mono shrink-0">
                /{cat.slug}
              </code>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
