"use client"

/**
 * /admin/presets/[id] — Preset editor
 * Full edit form for an existing preset.
 */

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { CategoryRow } from "@/types/database"

interface PresetFull {
  id:               string
  slug:             string
  title:            string
  tagline:          string | null
  description:      string | null
  price:            number
  original_price:   number | null
  is_free:          boolean
  is_featured:      boolean
  is_published:     boolean
  badge:            string | null
  thumbnail_url:    string | null
  before_url:       string | null
  after_url:        string | null
  youtube_video_id: string | null
  youtube_url:      string | null
  download_url:     string | null
  download_file_name: string | null
  include_count:    number | null
  mood:             string | null
  tone:             string | null
  features:         string[]
  compatibility:    string[]
  ai_tags:          string[]
  rating:           number
  review_count:     number
  order_index:      number
  category_id:      string | null
  category:         { id: string; name: string; slug: string } | null
  images:           { id: string; url: string; order_index: number }[]
}

export default function PresetEditorPage() {
  const { id }  = useParams<{ id: string }>()

  const [preset,     setPreset]     = useState<PresetFull | null>(null)
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // Form state
  const [title,       setTitle]       = useState("")
  const [tagline,     setTagline]     = useState("")
  const [description, setDescription] = useState("")
  const [categoryId,  setCategoryId]  = useState("")
  const [price,       setPrice]       = useState("")
  const [originalPrice, setOriginalPrice] = useState("")
  const [isFree,      setIsFree]      = useState(false)
  const [isFeatured,  setIsFeatured]  = useState(false)
  const [isPublished, setIsPublished] = useState(true)
  const [badge,       setBadge]       = useState("")
  const [thumbnailUrl,setThumbnailUrl]= useState("")
  const [downloadUrl, setDownloadUrl] = useState("")
  const [mood,        setMood]        = useState("")
  const [tone,        setTone]        = useState("")
  const [aiTagsStr,   setAiTagsStr]   = useState("")
  const [featuresStr, setFeaturesStr] = useState("")
  const [rating,      setRating]      = useState("")
  const [reviewCount, setReviewCount] = useState("")

  useEffect(() => {
    async function load() {
      const [presetRes, catsRes] = await Promise.all([
        fetch(`/api/admin/presets/${id}`),
        fetch("/api/admin/categories"),
      ])
      const presetJson = await presetRes.json()
      const catsJson   = await catsRes.json()

      if (presetJson.success) {
        const p: PresetFull = presetJson.data
        setPreset(p)
        setTitle(p.title)
        setTagline(p.tagline ?? "")
        setDescription(p.description ?? "")
        setCategoryId(p.category_id ?? "")
        setPrice(String(p.price))
        setOriginalPrice(p.original_price ? String(p.original_price) : "")
        setIsFree(p.is_free)
        setIsFeatured(p.is_featured)
        setIsPublished(p.is_published)
        setBadge(p.badge ?? "")
        setThumbnailUrl(p.thumbnail_url ?? "")
        setDownloadUrl(p.download_url ?? "")
        setMood(p.mood ?? "")
        setTone(p.tone ?? "")
        setAiTagsStr(p.ai_tags.join(", "))
        setFeaturesStr(p.features.join("\n"))
        setRating(String(p.rating))
        setReviewCount(String(p.review_count))
      } else {
        setError("Preset not found.")
      }

      if (catsJson.success) setCategories(catsJson.data)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)

    const res = await fetch(`/api/admin/presets/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        title,
        tagline:       tagline      || null,
        description:   description  || null,
        category_id:   categoryId   || null,
        thumbnail_url: thumbnailUrl || null,
        download_url:  downloadUrl  || null,
        price:         parseFloat(price) || 0,
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        is_free:       isFree,
        is_featured:   isFeatured,
        is_published:  isPublished,
        badge:         badge || null,
        mood:          mood  || null,
        tone:          tone  || null,
        ai_tags:       aiTagsStr.split(",").map((s) => s.trim()).filter(Boolean),
        features:      featuresStr.split("\n").map((s) => s.trim()).filter(Boolean),
        rating:        parseFloat(rating)  || 5.0,
        review_count:  parseInt(reviewCount) || 0,
      }),
    })

    const json = await res.json()
    if (json.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError(json.error ?? "Save failed.")
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/70 text-[0.875rem]">Loading…</p>
      </div>
    )
  }

  if (!preset) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-white/70">{error ?? "Preset not found."}</p>
        <Link href="/admin/presets" className="text-gold text-[0.875rem] hover:underline">← Back to presets</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-3xl w-full">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <Link href="/admin/presets" className="text-[0.75rem] text-white/70 hover:text-white/85 transition-colors">
            ← Back to presets
          </Link>
          <h1 className="font-display font-black text-[1.5rem] text-white/90">
            Edit Preset
          </h1>
          <p className="text-[0.8125rem] text-white/70">/presets/{preset.slug}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {saved && <span className="text-[0.8125rem] text-emerald-400">✓ Saved</span>}
          <Link
            href={`/presets/${preset.slug}`}
            target="_blank"
            className="rounded-xl border border-white/10 text-white/85 text-[0.8125rem] font-medium px-4 py-2 hover:text-white/92 transition-colors"
          >
            View →
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-gold text-background font-semibold px-5 py-2 text-[0.875rem] hover:bg-gold-dim transition-all disabled:opacity-40 active:scale-95"
          >
            {saving ? "Saving…" : "( Save Changes )"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[0.8125rem] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Form */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Field label="Title" span={2}>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="admin-input" />
          </Field>

          <Field label="Tagline" span={2}>
            <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One-line description…" className="admin-input" />
          </Field>

          <Field label="Category">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="admin-input">
              <option value="">— None —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Badge">
            <select value={badge} onChange={(e) => setBadge(e.target.value)} className="admin-input">
              <option value="">— None —</option>
              {["New","Best Seller","Sale","Free"].map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>

          <Field label="Price ($)">
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="admin-input" />
          </Field>

          <Field label="Original Price ($)">
            <input type="number" min="0" step="0.01" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="Leave blank if no sale" className="admin-input" />
          </Field>

          <Field label="Thumbnail URL" span={2}>
            <input type="url" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://…" className="admin-input" />
          </Field>

          <Field label="Download URL" span={2}>
            <input type="url" value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} placeholder="https://payhip.com/…" className="admin-input" />
          </Field>

          <Field label="Mood">
            <input type="text" value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Warm, Moody, Clean…" className="admin-input" />
          </Field>

          <Field label="Tone">
            <input type="text" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Gold, Teal-Orange…" className="admin-input" />
          </Field>

          <Field label="Rating (0–5)">
            <input type="number" min="0" max="5" step="0.1" value={rating} onChange={(e) => setRating(e.target.value)} className="admin-input" />
          </Field>

          <Field label="Review Count">
            <input type="number" min="0" value={reviewCount} onChange={(e) => setReviewCount(e.target.value)} className="admin-input" />
          </Field>

          <Field label="Description" span={2}>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="admin-input resize-none" />
          </Field>

          <Field label="Features — one per line" span={2}>
            <textarea value={featuresStr} onChange={(e) => setFeaturesStr(e.target.value)} rows={5} className="admin-input resize-none font-mono text-[0.8125rem]" />
          </Field>

          <Field label="AI Tags — comma separated" span={2}>
            <input type="text" value={aiTagsStr} onChange={(e) => setAiTagsStr(e.target.value)} className="admin-input" />
          </Field>

        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-5 mt-5 pt-5 border-t border-white/[0.06]">
          {[
            { label: "Free",      value: isFree,      set: setIsFree      },
            { label: "Featured",  value: isFeatured,  set: setIsFeatured  },
            { label: "Published", value: isPublished, set: setIsPublished },
          ].map(({ label, value, set }) => (
            <label key={label} className="flex items-center gap-2.5 cursor-pointer select-none">
              <div onClick={() => set(!value)} className={cn("h-5 w-9 rounded-full transition-colors cursor-pointer relative", value ? "bg-gold/80" : "bg-white/10")}>
                <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", value ? "left-[18px]" : "left-0.5")} />
              </div>
              <span className="text-[0.8125rem] text-white/85">{label}</span>
            </label>
          ))}
        </div>
      </div>

    </div>
  )
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div className={cn("flex flex-col gap-1.5", span === 2 && "md:col-span-2")}>
      <label className="text-[0.75rem] text-white/70 tracking-widest">( {label} )</label>
      {children}
    </div>
  )
}
