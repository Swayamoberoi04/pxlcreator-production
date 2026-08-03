"use client"

import { useEffect, useState, useCallback } from "react"
import Link   from "next/link"
import { cn } from "@/lib/utils"

const BADGE_STYLES: Record<string, string> = {
  "BESTSELLER":       "bg-gold/20 text-gold",
  "MOST POPULAR":     "bg-amber-500/15 text-amber-400",
  "CREATOR FAVORITE": "bg-pink-500/15 text-pink-400",
  "PRO LEVEL":        "bg-violet-500/15 text-violet-400",
  "TRENDING":         "bg-sky-500/15 text-sky-400",
  "BEST VALUE":       "bg-emerald-500/15 text-emerald-400",
  "LIMITED":          "bg-red-500/15 text-red-400",
  "NEW":              "bg-white/5 text-white/85",
}

interface BundleRow {
  id:                   string
  slug:                 string
  title:                string
  tagline:              string | null
  thumbnail_url:        string | null
  price_usd:            number
  sale_price_usd:       number | null
  compare_at_price_usd: number | null
  individual_value_usd: number
  bundle_badge:         string
  is_featured:          boolean
  is_published:         boolean
  preset_count:         number
  order_index:          number
  created_at:           string
}

type Filter = "all" | "published" | "featured" | "draft"

export default function AdminBundlesPage() {
  const [bundles,     setBundles]     = useState<BundleRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [search,      setSearch]      = useState("")
  const [filter,      setFilter]      = useState<Filter>("all")
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [confirmId,   setConfirmId]   = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch("/api/admin/bundles")
      const json = await res.json()
      if (json.success) setBundles(json.data ?? [])
      else setError(json.error ?? "Failed to load.")
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  /* ── Derived ── */
  const filtered = bundles.filter((b) => {
    const matchSearch = !search || b.title.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === "all"       ? true :
      filter === "published" ? b.is_published :
      filter === "featured"  ? b.is_featured  :
      filter === "draft"     ? !b.is_published : true
    return matchSearch && matchFilter
  })

  const total     = bundles.length
  const published = bundles.filter((b) => b.is_published).length
  const featured  = bundles.filter((b) => b.is_featured).length
  const drafts    = bundles.filter((b) => !b.is_published).length

  /* ── Actions ── */
  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/bundles/${id}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        setBundles((prev) => prev.filter((b) => b.id !== id))
        setConfirmId(null)
      } else {
        alert(json.error ?? "Delete failed.")
      }
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDuplicate(id: string) {
    setDuplicating(id)
    try {
      const res  = await fetch(`/api/admin/bundles/${id}/duplicate`, { method: "POST" })
      const json = await res.json()
      if (json.success) await load()
      else alert(json.error ?? "Duplicate failed.")
    } finally {
      setDuplicating(null)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.375rem] font-bold text-foreground">Bundle Manager</h1>
          <p className="text-[0.8125rem] text-muted/70 mt-0.5">
            Create and manage preset bundles. All pricing is independent of individual preset prices.
          </p>
        </div>
        <Link
          href="/admin/bundles/new"
          className="shrink-0 rounded-xl bg-gold text-background font-semibold px-5 py-2 text-[0.875rem] hover:bg-gold/90 transition-colors"
        >
          + New Bundle
        </Link>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",     value: loading ? "…" : total,     click: () => setFilter("all")       },
          { label: "Published", value: loading ? "…" : published, click: () => setFilter("published") },
          { label: "Featured",  value: loading ? "…" : featured,  click: () => setFilter("featured")  },
          { label: "Drafts",    value: loading ? "…" : drafts,    click: () => setFilter("draft")     },
        ].map(({ label, value, click }) => (
          <button
            key={label}
            type="button"
            onClick={click}
            className="rounded-xl border border-border/50 bg-surface px-4 py-4 text-left hover:border-gold/20 transition-colors"
          >
            <p className="text-[1.5rem] font-bold text-foreground leading-none">{value}</p>
            <p className="text-[0.75rem] text-muted/70 mt-1 tracking-wide uppercase">{label}</p>
          </button>
        ))}
      </div>

      {/* ── Search + filter ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search bundles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-input flex-1 max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          {(["all", "published", "draft", "featured"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[0.75rem] font-medium capitalize transition-colors",
                filter === f
                  ? "bg-gold/15 text-gold border border-gold/20"
                  : "bg-white/[0.04] text-white/70 border border-white/8 hover:text-white/85",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bundle list ── */}
      <div className="rounded-xl border border-border/50 bg-surface overflow-hidden">

        {loading && (
          <div className="px-5 py-14 text-center">
            <p className="text-muted/70 text-sm">Loading bundles…</p>
          </div>
        )}

        {!loading && error && (
          <div className="px-5 py-14 text-center">
            <p className="text-red-400/70 text-sm">{error}</p>
            <button onClick={load} className="mt-2 text-gold/70 text-sm hover:text-gold">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="px-5 py-14 text-center space-y-3">
            {bundles.length === 0 ? (
              <>
                <p className="text-muted/70 text-sm">No bundles yet.</p>
                <Link href="/admin/bundles/new" className="inline-block text-gold text-sm hover:underline">
                  Create your first bundle →
                </Link>
              </>
            ) : (
              <p className="text-muted/70 text-sm">No bundles match the current filter.</p>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="divide-y divide-border/30">

            {/* Column headers */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-2.5 border-b border-border/40">
              {["Bundle", "Presets", "Price", "Individual Value", "Status", "Actions"].map((h) => (
                <p key={h} className="text-[0.65rem] font-semibold text-muted/50 uppercase tracking-widest">{h}</p>
              ))}
            </div>

            {filtered.map((bundle) => {
              const displayPrice = bundle.sale_price_usd ?? bundle.price_usd
              const wasPrice     = bundle.sale_price_usd ? bundle.price_usd : null
              const savings      = bundle.individual_value_usd > 0
                ? Math.round((1 - displayPrice / bundle.individual_value_usd) * 100)
                : 0
              const badgeStyle = BADGE_STYLES[bundle.bundle_badge] ?? BADGE_STYLES["NEW"]
              const isConfirm  = confirmId === bundle.id
              const isDeleting = deletingId === bundle.id
              const isDuping   = duplicating === bundle.id

              return (
                <div key={bundle.id} className={cn(isConfirm && "bg-red-950/20")}>
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center px-5 py-3.5 hover:bg-white/[0.015] transition-colors">

                    {/* Bundle name */}
                    <div className="flex items-center gap-3 min-w-0">
                      {bundle.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={bundle.thumbnail_url}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover shrink-0 bg-white/5"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-white/5 shrink-0 flex items-center justify-center text-white/20 text-lg">
                          📦
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[0.875rem] font-semibold text-foreground truncate">
                          {bundle.title}
                        </p>
                        <span className={cn("text-[0.6rem] font-bold tracking-widest uppercase rounded-full px-2 py-0.5", badgeStyle)}>
                          {bundle.bundle_badge}
                        </span>
                      </div>
                    </div>

                    {/* Preset count */}
                    <div>
                      <p className="text-[0.875rem] font-bold text-foreground/90">
                        {bundle.preset_count}
                      </p>
                      <p className="text-[0.65rem] text-muted/60 uppercase tracking-wide">presets</p>
                    </div>

                    {/* Price */}
                    <div>
                      <p className="text-[0.875rem] font-bold text-gold">${displayPrice.toFixed(2)}</p>
                      {wasPrice && (
                        <p className="text-[0.7rem] text-muted/60 line-through">${wasPrice.toFixed(2)}</p>
                      )}
                    </div>

                    {/* Individual value + savings */}
                    <div>
                      {bundle.individual_value_usd > 0 ? (
                        <>
                          <p className="text-[0.8125rem] text-muted/70 line-through">
                            ${bundle.individual_value_usd.toFixed(2)}
                          </p>
                          {savings > 0 && (
                            <span className="text-[0.65rem] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                              −{savings}%
                            </span>
                          )}
                        </>
                      ) : (
                        <p className="text-[0.75rem] text-muted/40 italic">—</p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className={cn(
                        "text-[0.65rem] font-semibold rounded-full px-2 py-0.5",
                        bundle.is_published
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-white/5 text-white/50",
                      )}>
                        {bundle.is_published ? "Active" : "Draft"}
                      </span>
                      {bundle.is_featured && (
                        <span className="text-[0.65rem] font-semibold rounded-full px-2 py-0.5 bg-gold/15 text-gold/80">
                          Featured
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <Link
                        href={`/admin/bundles/${bundle.id}`}
                        className="text-[0.75rem] font-medium text-white/70 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07]"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/bundles/${bundle.slug}`}
                        target="_blank"
                        className="text-[0.75rem] font-medium text-muted/60 hover:text-muted/85 transition-colors px-2 py-1.5 rounded-lg"
                      >
                        View ↗
                      </Link>
                      <button
                        type="button"
                        disabled={isDuping}
                        onClick={() => handleDuplicate(bundle.id)}
                        className="text-[0.75rem] font-medium text-muted/60 hover:text-muted/85 transition-colors px-2 py-1.5 rounded-lg disabled:opacity-40"
                        title="Duplicate bundle"
                      >
                        {isDuping ? "…" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(isConfirm ? null : bundle.id)}
                        className="text-[0.75rem] font-medium text-red-400/70 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Inline delete confirm */}
                  {isConfirm && (
                    <div className="flex items-center gap-4 px-5 pb-3.5">
                      <p className="text-[0.8125rem] text-red-400/90">
                        Delete &quot;{bundle.title}&quot;? This removes the bundle only — presets are not affected.
                      </p>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDelete(bundle.id)}
                        className="shrink-0 text-[0.75rem] font-semibold bg-red-500/15 text-red-400 border border-red-500/25 rounded-lg px-3 py-1.5 hover:bg-red-500/25 transition-colors disabled:opacity-40"
                      >
                        {isDeleting ? "Deleting…" : "Confirm delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="text-[0.75rem] text-muted/60 hover:text-muted/85"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
