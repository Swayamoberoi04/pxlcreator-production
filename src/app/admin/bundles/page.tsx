"use client"

import type { Metadata } from "next"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

interface BundleRow {
  id:               string
  name:             string
  slug:             string
  tagline:          string | null
  thumbnail_url:    string | null
  badge:            string | null
  bundle_price_usd: number
  is_published:     boolean
  is_featured:      boolean
  display_order:    number
  updated_at:       string
  bundle_presets:   { preset_id: string }[]
}

export default function AdminBundlesPage() {
  const [bundles, setBundles]   = useState<BundleRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch("/api/admin/bundles")
      const json = await res.json()
      if (json.success) setBundles(json.data)
      else setError(json.error)
    } catch {
      setError("Failed to load bundles")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/bundles/${id}`, { method: "DELETE" })
      if (res.ok) setBundles((b) => b.filter((x) => x.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  async function handleDuplicate(id: string) {
    const res  = await fetch(`/api/admin/bundles/${id}/duplicate`, { method: "POST" })
    const json = await res.json()
    if (json.success) await load()
  }

  async function togglePublish(id: string, current: boolean) {
    await fetch(`/api/admin/bundles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !current }),
    })
    setBundles((b) => b.map((x) => x.id === id ? { ...x, is_published: !current } : x))
  }

  async function toggleFeature(id: string, current: boolean) {
    await fetch(`/api/admin/bundles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_featured: !current }),
    })
    setBundles((b) => b.map((x) => x.id === id ? { ...x, is_featured: !current } : x))
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-5xl w-full">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="h-px w-5 bg-gold/50" />
            <span className="text-[0.7rem] text-gold/60 tracking-widest">( BUNDLE MANAGER )</span>
          </div>
          <h1 className="font-display font-bold text-[1.75rem] text-white/90">Bundles</h1>
          <p className="text-[0.875rem] text-white/70">Create and manage preset bundles with independent pricing.</p>
        </div>

        <Link
          href="/admin/bundles/new"
          className="shrink-0 flex items-center gap-2 rounded-xl bg-gold text-background font-semibold px-5 py-2.5 text-[0.875rem] hover:bg-gold-dim transition-all active:scale-95"
        >
          <span>+</span>
          New Bundle
        </Link>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[0.875rem] text-red-400">
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[72px] rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && bundles.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] py-16 text-center">
          <BundleIcon />
          <p className="text-[0.875rem] text-white/50">No bundles yet.</p>
          <Link href="/admin/bundles/new" className="text-[0.875rem] text-gold hover:underline">
            Create your first bundle →
          </Link>
        </div>
      )}

      {/* ── Table ── */}
      {!loading && bundles.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          {bundles.map((bundle, i) => (
            <div
              key={bundle.id}
              className={cn(
                "flex items-center gap-4 px-5 py-4",
                i !== 0 && "border-t border-white/[0.04]",
                "hover:bg-white/[0.02] transition-colors"
              )}
            >
              {/* Thumbnail */}
              <div className="h-10 w-10 shrink-0 rounded-lg bg-white/[0.06] overflow-hidden">
                {bundle.thumbnail_url ? (
                  <img src={bundle.thumbnail_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-white/20">
                    <BundleIcon />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[0.9rem] font-medium text-white/90 truncate">{bundle.name}</span>
                  {bundle.badge && (
                    <span className="shrink-0 text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/20">
                      {bundle.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[0.75rem] text-white/40">{bundle.bundle_presets?.length ?? 0} presets</span>
                  <span className="text-[0.75rem] text-white/40">·</span>
                  <span className="text-[0.75rem] text-white/60 font-medium">${bundle.bundle_price_usd}</span>
                  {!bundle.is_published && (
                    <span className="text-[0.65rem] text-white/30 border border-white/10 rounded px-1.5 py-0.5">draft</span>
                  )}
                  {bundle.is_featured && (
                    <span className="text-[0.65rem] text-gold/70 border border-gold/20 rounded px-1.5 py-0.5">featured</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => togglePublish(bundle.id, bundle.is_published)}
                  className={cn(
                    "text-[0.75rem] font-medium px-3 py-1.5 rounded-lg border transition-colors",
                    bundle.is_published
                      ? "border-green-500/30 text-green-400 hover:bg-green-500/10"
                      : "border-white/10 text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                  )}
                >
                  {bundle.is_published ? "Published" : "Draft"}
                </button>

                <button
                  type="button"
                  onClick={() => toggleFeature(bundle.id, bundle.is_featured)}
                  title={bundle.is_featured ? "Unfeature" : "Feature"}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center rounded-lg border transition-colors",
                    bundle.is_featured
                      ? "border-gold/30 text-gold hover:bg-gold/10"
                      : "border-white/10 text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                  )}
                >
                  <StarIcon />
                </button>

                <Link
                  href={`/admin/bundles/${bundle.id}`}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white/90 hover:bg-white/[0.04] transition-colors"
                  title="Edit"
                >
                  <EditIcon />
                </Link>

                <button
                  type="button"
                  onClick={() => handleDuplicate(bundle.id)}
                  title="Duplicate"
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white/90 hover:bg-white/[0.04] transition-colors"
                >
                  <CopyIcon />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(bundle.id, bundle.name)}
                  disabled={deleting === bundle.id}
                  title="Delete"
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 text-white/30 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-colors disabled:opacity-40"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

function BundleIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
}
function StarIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
}
function EditIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}
function CopyIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
}
