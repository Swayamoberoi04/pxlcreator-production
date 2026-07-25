"use client"

/**
 * PresetImporter.tsx
 *
 * The YouTube import wizard.
 *
 * Flow:
 *  1. Paste YouTube URL
 *  2. Click "Fetch" → calls /api/admin/youtube-import
 *  3. Review/edit the auto-populated form
 *  4. Click "Save Preset" → calls POST /api/admin/presets
 *  5. Success state with link
 */

import { useState } from "react"
import Image        from "next/image"
import Link         from "next/link"
import { cn }       from "@/lib/utils"
import type { CategoryRow } from "@/types/database"

/* ── Types ── */

interface ImportedData {
  title:          string
  slug:           string
  tagline:        string
  category:       string
  categorySlug:   string
  categoryId:     string | null
  mood:           string | null
  tone:           string | null
  downloadUrl:    string | null
  allLinks:       string[]
  aiTags:         string[]
  thumbnailUrl:   string
  youtubeVideoId: string
  youtubeUrl:     string
  description:    string
  features:       string[]
  presetType:     string
  price?:         number
  is_free?:       boolean
  categories:     CategoryRow[]
  rawTitle:       string
  viewCount:      number
  likeCount:      number
}

/* ── Component ── */

export function PresetImporter() {
  const [url,         setUrl]         = useState("")
  const [fetching,    setFetching]    = useState(false)
  const [fetchError,  setFetchError]  = useState<string | null>(null)
  const [data,        setData]        = useState<ImportedData | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [savedSlug,   setSavedSlug]   = useState<string | null>(null)
  const [warning,     setWarning]     = useState<string | null>(null)

  // Form field state (editable after fetch)
  const [title,       setTitle]       = useState("")
  const [tagline,     setTagline]     = useState("")
  const [description, setDescription] = useState("")
  const [categoryId,  setCategoryId]  = useState("")
  const [price,       setPrice]       = useState("0")
  const [isFree,      setIsFree]      = useState(false)
  const [isFeatured,  setIsFeatured]  = useState(false)
  const [isPublished, setIsPublished] = useState(true)
  const [downloadUrl, setDownloadUrl] = useState("")
  const [badge,       setBadge]       = useState("")
  const [mood,        setMood]        = useState("")
  const [tone,        setTone]        = useState("")
  const [aiTagsStr,   setAiTagsStr]   = useState("")
  const [featuresStr, setFeaturesStr] = useState("")

  /* ── Fetch from YouTube ── */

  async function handleFetch() {
    if (!url.trim()) return
    setFetching(true)
    setFetchError(null)
    setWarning(null)

    try {
      const res  = await fetch("/api/admin/youtube-import", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: url.trim() }),
      })
      const json = await res.json()

      if (!json.success) {
        setFetchError(json.error ?? "Failed to fetch video.")
        return
      }

      if (json.warning) setWarning(json.warning)

      const d: ImportedData = json.data
      setData(d)

      // Pre-fill form
      setTitle(d.title)
      setTagline(d.tagline)
      setDescription(d.description)
      setCategoryId(d.categoryId ?? "")
      setPrice(String(d.price ?? 0))
      setIsFree(d.is_free ?? false)
      setDownloadUrl(d.downloadUrl ?? "")
      setMood(d.mood ?? "")
      setTone(d.tone ?? "")
      setAiTagsStr(d.aiTags.join(", "))
      setFeaturesStr(d.features.join("\n"))
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Network error.")
    } finally {
      setFetching(false)
    }
  }

  /* ── Save to database ── */

  async function handleSave() {
    if (!data || !title.trim()) return
    setSaving(true)
    setSaveError(null)

    try {
      const res = await fetch("/api/admin/presets", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          title,
          tagline,
          description,
          category_id:    categoryId || null,
          thumbnailUrl:   data.thumbnailUrl,
          youtubeVideoId: data.youtubeVideoId,
          youtubeUrl:     data.youtubeUrl,
          rawTitle:       data.rawTitle,
          channelId:      null,
          publishedAt:    null,
          price:          parseFloat(price) || 0,
          isFree:         isFree || parseFloat(price) === 0,
          isFeatured,
          isPublished,
          badge:          badge || null,
          downloadUrl:    downloadUrl || data.downloadUrl || null,
          presetType:     data.presetType,
          mood:           mood || null,
          tone:           tone || null,
          aiTags:         aiTagsStr.split(",").map((s) => s.trim()).filter(Boolean),
          features:       featuresStr.split("\n").map((s) => s.trim()).filter(Boolean),
          compatibility:  ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
        }),
      })

      const json = await res.json()
      if (!json.success) {
        setSaveError(json.error ?? "Failed to save preset.")
        return
      }

      setSavedSlug(json.data.slug)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Network error.")
    } finally {
      setSaving(false)
    }
  }

  /* ── Success state ── */

  if (savedSlug) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
        <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <CheckIcon className="text-emerald-400" />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="font-display font-bold text-[1.125rem] text-white">
            ( Preset saved! )
          </p>
          <p className="text-[0.875rem] text-white/70">
            Your preset is live on the store.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/presets/${savedSlug}`}
            target="_blank"
            className="rounded-full bg-gold/10 border border-gold/30 text-gold text-[0.8125rem] font-medium px-5 py-2 hover:bg-gold/20 transition-colors"
          >
            View Preset →
          </Link>
          <button
            type="button"
            onClick={() => {
              setSavedSlug(null)
              setData(null)
              setUrl("")
            }}
            className="rounded-full border border-white/10 text-white/85 text-[0.8125rem] font-medium px-5 py-2 hover:text-white/92 transition-colors"
          >
            Import Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">

      {/* ── Step 1: URL input ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="h-6 w-6 rounded-full bg-gold/20 border border-gold/30 text-gold text-[0.65rem] font-black flex items-center justify-center shrink-0">1</span>
          <p className="text-[0.9375rem] font-semibold text-white/92">Paste your YouTube video URL</p>
        </div>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[0.9375rem] text-white placeholder:text-white/70 focus:outline-none focus:border-gold/40 transition-colors"
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={fetching || !url.trim()}
            className={cn(
              "rounded-xl px-6 py-3 text-[0.875rem] font-semibold transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "bg-gold text-background hover:bg-gold-dim active:scale-95"
            )}
          >
            {fetching ? (
              <span className="flex items-center gap-2">
                <SpinIcon /> Fetching…
              </span>
            ) : "Fetch"}
          </button>
        </div>

        {fetchError && (
          <p className="text-[0.8125rem] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            ✕ {fetchError}
          </p>
        )}
        {warning && (
          <p className="text-[0.8125rem] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            ⚠ {warning}
          </p>
        )}
      </div>

      {/* ── Step 2: Edit & review (shown after fetch) ── */}
      {data && (
        <div className="flex flex-col gap-6">

          <div className="h-px bg-white/[0.06]" />

          <div className="flex items-center gap-3">
            <span className="h-6 w-6 rounded-full bg-gold/20 border border-gold/30 text-gold text-[0.65rem] font-black flex items-center justify-center shrink-0">2</span>
            <p className="text-[0.9375rem] font-semibold text-white/92">Review & edit preset details</p>
          </div>

          {/* Thumbnail + video info */}
          <div className="flex gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            {data.thumbnailUrl && (
              <div className="relative h-20 w-32 rounded-xl overflow-hidden shrink-0 border border-white/10">
                <Image src={data.thumbnailUrl} alt={data.rawTitle} fill sizes="128px" className="object-cover" />
              </div>
            )}
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-[0.8125rem] font-medium text-white/92 line-clamp-2">{data.rawTitle}</p>
              <p className="text-[0.75rem] text-white/70">
                {data.viewCount.toLocaleString()} views · {data.likeCount.toLocaleString()} likes
              </p>
              {data.allLinks.length > 0 && (
                <p className="text-[0.75rem] text-emerald-400">
                  ✓ {data.allLinks.length} download link{data.allLinks.length !== 1 ? "s" : ""} found
                </p>
              )}
              {data.allLinks.length === 0 && (
                <p className="text-[0.75rem] text-amber-400">
                  ⚠ No download links detected in description
                </p>
              )}
            </div>
          </div>

          {/* Form fields grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[0.75rem] text-white/70 tracking-widest">( Preset Title )</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[0.75rem] text-white/70 tracking-widest">( Tagline )</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="One-line description…"
                className="admin-input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.75rem] text-white/70 tracking-widest">( Category )</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="admin-input"
              >
                <option value="">— Select category —</option>
                {data.categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.75rem] text-white/70 tracking-widest">( Badge )</label>
              <select
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="admin-input"
              >
                <option value="">— None —</option>
                <option value="New">New</option>
                <option value="Best Seller">Best Seller</option>
                <option value="Sale">Sale</option>
                <option value="Free">Free</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.75rem] text-white/70 tracking-widest">( Price ($) )</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => { setPrice(e.target.value); if (parseFloat(e.target.value) === 0) setIsFree(true) }}
                className="admin-input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.75rem] text-white/70 tracking-widest">( Download Link )</label>
              <input
                type="url"
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                placeholder="https://payhip.com/…"
                className="admin-input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.75rem] text-white/70 tracking-widest">( Mood )</label>
              <input
                type="text"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="e.g. Warm, Moody, Clean…"
                className="admin-input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.75rem] text-white/70 tracking-widest">( Tone )</label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. Gold, Teal-Orange, B&W…"
                className="admin-input"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[0.75rem] text-white/70 tracking-widest">( Description )</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="admin-input resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[0.75rem] text-white/70 tracking-widest">
                ( Features — one per line )
              </label>
              <textarea
                value={featuresStr}
                onChange={(e) => setFeaturesStr(e.target.value)}
                rows={4}
                placeholder="15 hand-tuned presets&#10;Works on mobile & desktop&#10;…"
                className="admin-input resize-none font-mono text-[0.8125rem]"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[0.75rem] text-white/70 tracking-widest">
                ( AI Tags — comma separated )
              </label>
              <input
                type="text"
                value={aiTagsStr}
                onChange={(e) => setAiTagsStr(e.target.value)}
                className="admin-input"
              />
            </div>

          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            {[
              { label: "Free preset",   value: isFree,      set: setIsFree },
              { label: "Featured",      value: isFeatured,  set: setIsFeatured },
              { label: "Published",     value: isPublished, set: setIsPublished },
            ].map(({ label, value, set }) => (
              <label key={label} className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => set(!value)}
                  className={cn(
                    "h-5 w-9 rounded-full transition-colors cursor-pointer relative",
                    value ? "bg-gold/80" : "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                    value ? "left-[18px]" : "left-0.5"
                  )} />
                </div>
                <span className="text-[0.8125rem] text-white/85">{label}</span>
              </label>
            ))}
          </div>

          {saveError && (
            <p className="text-[0.8125rem] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              ✕ {saveError}
            </p>
          )}

          {/* Save button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className={cn(
                "rounded-xl px-8 py-3 text-[0.9375rem] font-semibold transition-all",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "bg-gold text-background hover:bg-gold-dim active:scale-95"
              )}
            >
              {saving ? (
                <span className="flex items-center gap-2"><SpinIcon /> Saving…</span>
              ) : "( Save Preset )"}
            </button>
            <p className="text-[0.75rem] text-white/70">
              All fields can be edited later.
            </p>
          </div>

        </div>
      )}

    </div>
  )
}

/* ── Icons ── */
function CheckIcon({ className }: { className?: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>
}
function SpinIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
}
