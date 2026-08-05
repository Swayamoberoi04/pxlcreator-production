"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

const LAST_EDITED_KEY = "pxl_admin_last_edited"

interface AdminPreset {
  id:            string
  slug:          string
  title:         string
  tagline:       string | null
  price:         number
  is_free:       boolean
  is_featured:   boolean
  is_published:  boolean
  badge:         string | null
  rating:        number
  review_count:  number
  view_count?:   number
  order_index:   number
  thumbnail_url: string | null
  youtube_video_id: string | null
  created_at:    string
  updated_at:    string
  category:      { id: string; name: string; slug: string } | null
}

/*
 * Last successful response, cached at module scope. Returning to the list
 * (e.g. after editing a preset) seeds the table from this instantly so there
 * is no skeleton flicker or reload — the data then revalidates in the
 * background. Survives client navigation; cleared on a full page refresh.
 */
let presetCache: { key: string; data: AdminPreset[] } | null = null

export function PresetTable() {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  /* Search lives in the URL (?q=…) so it is remembered across Back navigation
     and full refreshes — router state, not a local-only value. */
  const urlSearch = searchParams.get("q") ?? ""

  const [search,          setSearch]          = useState(urlSearch)
  const [presets,         setPresets]         = useState<AdminPreset[]>(
    () => (presetCache?.key === urlSearch ? presetCache.data : [])
  )
  const [loading,         setLoading]         = useState(() => presetCache?.key !== urlSearch)
  const [deleting,        setDeleting]        = useState<string | null>(null)
  const [toggling,        setToggling]        = useState<string | null>(null)
  const [error,           setError]           = useState<string | null>(null)
  const [highlightId,     setHighlightId]     = useState<string | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── On mount: read which preset was last edited ── */
  useEffect(() => {
    const id = sessionStorage.getItem(LAST_EDITED_KEY)
    if (id) {
      setHighlightId(id)
      sessionStorage.removeItem(LAST_EDITED_KEY)
    }
  }, [])

  /* ── Reflect the search box into the URL (debounced, no history spam, no
     scroll jump). Back/refresh then restore the exact filtered view. ── */
  useEffect(() => {
    const t = setTimeout(() => {
      const next = search ? `${pathname}?q=${encodeURIComponent(search)}` : pathname
      router.replace(next, { scroll: false })
    }, 300)
    return () => clearTimeout(t)
  }, [search, pathname, router])

  const fetchPresets = useCallback(async () => {
    /* Only show the skeleton when we have nothing cached to display. */
    if (presetCache?.key !== search) setLoading(true)
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : ""
      const res  = await fetch(`/api/admin/presets${params}`)
      const json = await res.json()
      if (json.success) {
        setPresets(json.data)
        presetCache = { key: search, data: json.data }
        setError(null)
      } else {
        setError(json.error)
      }
    } catch {
      setError("Failed to load presets.")
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(fetchPresets, 300)
    return () => clearTimeout(t)
  }, [fetchPresets])

  /* ── After presets populate: scroll to + gold-glow the last-edited row ── */
  useEffect(() => {
    if (!highlightId || loading || presets.length === 0) return
    const el = document.getElementById(`preset-row-${highlightId}`)
    if (!el) return

    el.scrollIntoView({ behavior: "smooth", block: "center" })
    el.style.transition = "box-shadow 0.3s ease, background-color 0.3s ease"
    el.style.boxShadow  = "0 0 0 2px rgba(255, 214, 10, 0.55), 0 0 24px rgba(255, 214, 10, 0.18)"
    el.style.backgroundColor = "rgba(255, 214, 10, 0.06)"

    highlightTimerRef.current = setTimeout(() => {
      el.style.boxShadow       = ""
      el.style.backgroundColor = ""
      setHighlightId(null)
    }, 2500)
  }, [highlightId, loading, presets])

  useEffect(() => () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
  }, [])

  async function handleToggle(id: string, field: "is_published" | "is_featured", current: boolean) {
    setToggling(id + field)
    try {
      await fetch(`/api/admin/presets/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ [field]: !current }),
      })
      setPresets((prev) =>
        prev.map((p) => p.id === id ? { ...p, [field]: !current } : p)
      )
    } finally {
      setToggling(null)
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await fetch(`/api/admin/presets/${id}`, { method: "DELETE" })
      setPresets((prev) => prev.filter((p) => p.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/70" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search presets…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-2.5 text-[0.875rem] text-white placeholder:text-white/70 focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>
        <span className="text-[0.75rem] text-white/70">
          ( {presets.length} preset{presets.length !== 1 ? "s" : ""} )
        </span>
      </div>

      {error && (
        <p className="text-[0.8125rem] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[68px] rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : presets.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <p className="text-white/70 text-[0.9375rem]">
            {search ? "No presets match your search." : "No presets yet. Import from YouTube!"}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          {presets.map((preset, i) => (
            <div
              key={preset.id}
              id={`preset-row-${preset.id}`}
              className={cn(
                "flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.02]",
                i !== 0 && "border-t border-white/[0.06]"
              )}
            >
              {/* Thumbnail */}
              <div className="relative h-12 w-16 rounded-lg overflow-hidden bg-white/[0.04] shrink-0 border border-white/[0.06]">
                {preset.thumbnail_url ? (
                  <Image src={preset.thumbnail_url} alt={preset.title} fill sizes="64px" className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white/70 text-[0.625rem]">No img</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[0.875rem] font-medium text-white/90 truncate">{preset.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {preset.category && (
                    <span className="text-[0.65rem] text-white/70 bg-white/[0.04] rounded-full px-2 py-0.5">
                      {preset.category.name}
                    </span>
                  )}
                  {preset.badge && (
                    <span className={cn(
                      "text-[0.65rem] rounded-full px-2 py-0.5",
                      preset.badge === "Best Seller" && "bg-gold/15 text-gold",
                      preset.badge === "New"         && "bg-white/10 text-white/85",
                      preset.badge === "Sale"        && "bg-red-500/15 text-red-400",
                      preset.badge === "Free"        && "bg-emerald-500/15 text-emerald-400",
                    )}>
                      {preset.badge}
                    </span>
                  )}
                  <span className="text-[0.65rem] text-white/70">
                    ${preset.price} · ★{preset.rating}{preset.view_count != null ? ` · ${preset.view_count.toLocaleString()} views` : ""}
                  </span>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggle(preset.id, "is_published", preset.is_published)}
                  disabled={toggling === preset.id + "is_published"}
                  title={preset.is_published ? "Published — click to unpublish" : "Draft — click to publish"}
                  className={cn(
                    "h-6 px-2.5 rounded-full text-[0.65rem] font-medium transition-all",
                    preset.is_published
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-white/[0.04] text-white/70 border border-white/10"
                  )}
                >
                  {preset.is_published ? "Live" : "Draft"}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(preset.id, "is_featured", preset.is_featured)}
                  disabled={toggling === preset.id + "is_featured"}
                  title={preset.is_featured ? "Featured — click to unfeature" : "Not featured — click to feature"}
                  className={cn(
                    "h-6 px-2.5 rounded-full text-[0.65rem] font-medium transition-all",
                    preset.is_featured
                      ? "bg-gold/15 text-gold border border-gold/20"
                      : "bg-white/[0.04] text-white/70 border border-white/10"
                  )}
                >
                  ★
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={`/admin/presets/${preset.id}`}
                  onClick={() => sessionStorage.setItem(LAST_EDITED_KEY, preset.id)}
                  className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/70 hover:text-white/92 hover:border-white/20 transition-all"
                  title="Edit preset"
                >
                  <EditIcon />
                </Link>
                <Link
                  href={`/presets/${preset.slug}`}
                  target="_blank"
                  className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/70 hover:text-white/92 hover:border-white/20 transition-all"
                  title="View on site"
                >
                  <ExternalIcon />
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(preset.id, preset.title)}
                  disabled={deleting === preset.id}
                  className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/70 hover:text-red-400 hover:border-red-500/30 transition-all"
                  title="Delete preset"
                >
                  {deleting === preset.id ? <SpinIcon /> : <TrashIcon />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Icons ── */
function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function EditIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function ExternalIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> }
function TrashIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> }
function SpinIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> }
