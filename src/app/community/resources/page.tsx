"use client"

/**
 * /community/resources — the creator resource directory.
 *
 * Every resource is a real database row with a real destination URL, served
 * by /api/community/resources. The previous version merged a hardcoded
 * client-side array into the API results, which meant the page couldn't be
 * searched, filtered or curated, and a reader had no way to tell what was
 * real. Resources now live in the database and each card states plainly
 * whether PXL built it or it's an external tool listed for discovery.
 */

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { RESOURCE_TYPES } from "@/types/community"
import type { CreatorResource } from "@/types/community"

const CATEGORIES = [
  { id: "all",           label: "All" },
  { id: "photography",   label: "Photography" },
  { id: "editing",       label: "Editing" },
  { id: "filmmaking",    label: "Filmmaking" },
  { id: "color_grading", label: "Color Grading" },
  { id: "gear",          label: "Gear" },
  { id: "business",      label: "Business" },
  { id: "community",     label: "Community" },
  { id: "learning",      label: "Learning" },
]

function SkeletonCard() {
  return <div className="rounded-2xl border border-border bg-surface h-44 animate-pulse" />
}

function ResourceCard({ resource }: { resource: CreatorResource }) {
  const { user } = useAuth()

  /**
   * Log the real outbound click, then let the navigation proceed. Fired as a
   * keepalive beacon so it survives the tab navigating away — never blocks
   * the user reaching the destination, and never fabricates a count.
   */
  async function trackClick() {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (user) { try { headers.Authorization = `Bearer ${await user.getIdToken()}` } catch { /* ignore */ } }
      void fetch(`/api/community/resources/${resource.id}/click`, { method: "POST", headers, keepalive: true })
    } catch { /* click tracking must never block the outbound link */ }
  }

  return (
    <div className={[
      "flex flex-col gap-3 rounded-2xl border bg-surface p-5 hover:bg-surface-2 transition-all duration-150",
      resource.is_featured ? "border-gold/30 bg-gold/[0.02]" : "border-border",
    ].join(" ")}>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{resource.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-sm text-foreground">{resource.title}</h3>
            {resource.is_featured && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30">
                Featured
              </span>
            )}
            {/* Never ambiguous about who made this */}
            <span className={[
              "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border",
              resource.source === "pxl"
                ? "bg-gold/10 text-gold border-gold/30"
                : "bg-surface-2 text-muted/70 border-border",
            ].join(" ")}>
              {resource.source === "pxl" ? "By PXL" : "External"}
            </span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/70">
            {RESOURCE_TYPES.find((t) => t.id === resource.resource_type)?.label ?? resource.resource_type}
            {" · "}
            {CATEGORIES.find((c) => c.id === resource.category)?.label ?? resource.category}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted/85 leading-relaxed flex-1">{resource.description}</p>

      {resource.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {resource.tags.slice(0, 4).map((t) => (
            <span key={t} className="text-[10px] text-muted/70 bg-surface-2 border border-border rounded px-1.5 py-0.5">{t}</span>
          ))}
        </div>
      )}

      <a href={resource.url} target="_blank" rel="noopener noreferrer" onClick={trackClick}
        className="self-start text-xs font-semibold text-gold hover:text-gold/80 transition-colors flex items-center gap-1">
        Visit <span className="text-[10px]">→</span>
      </a>
    </div>
  )
}

export default function ResourcesPage() {
  const [resources,  setResources]  = useState<CreatorResource[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [category,   setCategory]   = useState("all")
  const [type,       setType]       = useState("all")
  const [query,      setQuery]      = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (query) params.set("q", query)
      if (category !== "all") params.set("category", category)
      if (type !== "all") params.set("type", type)
      const res = await fetch(`/api/community/resources?${params}`)
      if (!res.ok) throw new Error("Failed to load resources.")
      const data = await res.json()
      setResources(data.resources ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resources.")
      setResources([])
    } finally { setLoading(false) }
  }, [query, category, type])

  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  const featured = resources.filter((r) => r.is_featured)
  const regular  = resources.filter((r) => !r.is_featured)
  const hasFilters = query !== "" || category !== "all" || type !== "all"

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div>
        <h1 className="font-display font-bold text-3xl text-foreground">Creator Resources</h1>
        <p className="text-sm text-muted/85 mt-1">
          Tools, learning, communities and templates for creators — each one links straight to the real thing.
        </p>
      </div>

      {/* Search */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search resources…"
        className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40"
      />

      {/* Type filter */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setType("all")}
          className={["rounded-full px-4 py-1.5 text-xs font-medium transition-colors", type === "all" ? "bg-gold/15 text-gold border border-gold/30" : "bg-surface border border-border text-muted/85 hover:border-gold/20 hover:text-foreground"].join(" ")}>
          All types
        </button>
        {RESOURCE_TYPES.map((t) => (
          <button key={t.id} onClick={() => setType(t.id)}
            className={["flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-medium transition-colors", type === t.id ? "bg-gold/15 text-gold border border-gold/30" : "bg-surface border border-border text-muted/85 hover:border-gold/20 hover:text-foreground"].join(" ")}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button key={cat.id} onClick={() => setCategory(cat.id)}
            className={["rounded-full px-4 py-1.5 text-xs font-medium transition-colors", category === cat.id ? "bg-gold/15 text-gold border border-gold/30" : "bg-surface border border-border text-muted/85 hover:border-gold/20 hover:text-foreground"].join(" ")}>
            {cat.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : resources.length > 0 ? (
        <div className="flex flex-col gap-6">
          {featured.length > 0 && (
            <div>
              <h2 className="font-display font-bold text-base text-foreground mb-3 flex items-center gap-2">
                <span className="text-gold">⭐</span> Featured Picks
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featured.map((r) => <ResourceCard key={r.id} resource={r} />)}
              </div>
            </div>
          )}
          {regular.length > 0 && (
            <div>
              {featured.length > 0 && <h2 className="font-display font-bold text-base text-foreground mb-3">All Resources</h2>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {regular.map((r) => <ResourceCard key={r.id} resource={r} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center rounded-2xl border border-border bg-surface">
          <span className="text-4xl">📚</span>
          <p className="font-semibold text-foreground">
            {hasFilters ? "No resources match your search" : "No resources published yet"}
          </p>
          <p className="text-sm text-muted/85 max-w-sm">
            {hasFilters
              ? "Try a different search or clear the filters."
              : "The directory is empty right now — nothing has been published yet. This isn't a bug."}
          </p>
          {hasFilters && (
            <button onClick={() => { setQuery(""); setCategory("all"); setType("all") }}
              className="mt-1 text-xs text-gold hover:underline">
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
