"use client"

/**
 * /admin/bundles/[id]
 *
 * Bundle editor. id === "new" → create mode; otherwise edit mode.
 *
 * Sections:
 *   1. Basic Info   — name, slug, tagline, description, cover image, badge, marketing copy
 *   2. Pricing      — bundle price, sale price (optional), compare-at price (optional)
 *                     individual value shown read-only (auto-computed from preset prices)
 *   3. Presets      — ordered list of included presets + searchable add panel
 *   4. Settings     — featured, published, target audience, use cases
 *   5. Danger Zone  — delete bundle (edit mode only)
 */

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter }              from "next/navigation"
import Link                                  from "next/link"
import { cn }                                from "@/lib/utils"

/* ── Types ── */

interface BundleDetail {
  id:                   string
  slug:                 string
  title:                string
  tagline:              string | null
  description:          string | null
  why_creators_love_it: string | null
  thumbnail_url:        string | null
  price_usd:            number
  sale_price_usd:       number | null
  compare_at_price_usd: number | null
  individual_value_usd: number
  bundle_badge:         string
  is_featured:          boolean
  is_published:         boolean
  target_audience:      string[]
  use_cases:            string[]
  features:             string[]
}

interface PresetInBundle {
  id:           string
  slug:         string
  title:        string
  price:        number
  thumbnail_url: string | null
  is_published: boolean
  order_index:  number
}

interface AvailablePreset {
  id:           string
  slug:         string
  title:        string
  price:        number
  thumbnail_url: string | null
  is_published: boolean
}

const BADGE_OPTIONS = [
  "BESTSELLER","MOST POPULAR","CREATOR FAVORITE",
  "PRO LEVEL","TRENDING","BEST VALUE","LIMITED","NEW",
]

const USE_CASE_OPTIONS = [
  "Instagram","Reels","YouTube","Travel","Portraits",
  "Street","Landscapes","Film Look","Lifestyle",
  "Content Creation","Weddings","Night Photography","Fashion","Drone",
]

function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

/* ── Component ── */

export default function BundleEditorPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const isNew    = id === "new"

  /* ── Load state ── */
  const [loading,  setLoading]  = useState(!isNew)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  /* ── Form fields ── */
  const [title,           setTitle]           = useState("")
  const [slug,            setSlug]            = useState("")
  const [slugEdited,      setSlugEdited]       = useState(false)
  const [tagline,         setTagline]         = useState("")
  const [description,     setDescription]     = useState("")
  const [whyCreators,     setWhyCreators]     = useState("")
  const [thumbnailUrl,    setThumbnailUrl]    = useState("")
  const [badge,           setBadge]           = useState("NEW")
  const [priceUsd,        setPriceUsd]        = useState("")
  const [salePriceUsd,    setSalePriceUsd]    = useState("")
  const [compareAtPrice,  setCompareAtPrice]  = useState("")
  const [isFeatured,      setIsFeatured]      = useState(false)
  const [isPublished,     setIsPublished]     = useState(true)
  const [targetAudience,  setTargetAudience]  = useState("")
  const [useCases,        setUseCases]        = useState<string[]>([])

  /* ── Presets ── */
  const [bundlePresets,    setBundlePresets]    = useState<PresetInBundle[]>([])
  const [availablePresets, setAvailablePresets] = useState<AvailablePreset[]>([])
  const [presetSearch,     setPresetSearch]     = useState("")
  const [loadingPresets,   setLoadingPresets]   = useState(false)

  const individualValue = bundlePresets.reduce((s, p) => s + (p.price ?? 0), 0)

  /* ── Load bundle (edit mode) ── */
  useEffect(() => {
    if (isNew) return

    async function load() {
      const res  = await fetch(`/api/admin/bundles/${id}`)
      const json = await res.json()

      if (!json.success) {
        setError("Bundle not found.")
        setLoading(false)
        return
      }

      const b: BundleDetail     = json.data.bundle
      const p: PresetInBundle[] = json.data.presets ?? []

      setTitle(b.title)
      setSlug(b.slug)
      setSlugEdited(true)
      setTagline(b.tagline ?? "")
      setDescription(b.description ?? "")
      setWhyCreators(b.why_creators_love_it ?? "")
      setThumbnailUrl(b.thumbnail_url ?? "")
      setBadge(b.bundle_badge ?? "NEW")
      setPriceUsd(String(b.price_usd))
      setSalePriceUsd(b.sale_price_usd != null ? String(b.sale_price_usd) : "")
      setCompareAtPrice(b.compare_at_price_usd != null ? String(b.compare_at_price_usd) : "")
      setIsFeatured(b.is_featured)
      setIsPublished(b.is_published)
      setTargetAudience(b.target_audience?.join(", ") ?? "")
      setUseCases(b.use_cases ?? [])
      setBundlePresets(p)
      setLoading(false)
    }

    load()
  }, [id, isNew])

  /* ── Load all presets for the add-preset panel ── */
  useEffect(() => {
    fetch("/api/admin/presets")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setAvailablePresets(json.data ?? [])
      })
      .finally(() => setLoadingPresets(false))
  }, [])

  /* ── Auto-slug from title (new mode only) ── */
  useEffect(() => {
    if (!isNew || slugEdited) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlug(slugify(title))
  }, [title, isNew, slugEdited])

  /* ── Preset ordering helpers ── */
  function movePreset(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= bundlePresets.length) return
    const next = [...bundlePresets]
    ;[next[index], next[target]] = [next[target], next[index]]
    setBundlePresets(next)
  }

  function removePreset(presetId: string) {
    setBundlePresets((prev) => prev.filter((p) => p.id !== presetId))
  }

  function addPreset(preset: AvailablePreset) {
    if (bundlePresets.some((p) => p.id === preset.id)) return
    setBundlePresets((prev) => [
      ...prev,
      { ...preset, order_index: prev.length },
    ])
  }

  const bundlePresetIds = new Set(bundlePresets.map((p) => p.id))

  const addablePresets = availablePresets.filter((p) => {
    if (bundlePresetIds.has(p.id)) return false
    if (!presetSearch) return true
    return p.title.toLowerCase().includes(presetSearch.toLowerCase())
  })

  /* ── Save ── */
  const handleSave = useCallback(async () => {
    if (!title.trim()) { setError("Title is required."); return }
    if (!priceUsd || isNaN(Number(priceUsd))) { setError("Bundle price is required."); return }

    setSaving(true)
    setSaved(false)
    setError(null)

    const body = {
      title:                title.trim(),
      slug:                 slug.trim() || slugify(title),
      tagline:              tagline.trim()      || null,
      description:          description.trim()  || null,
      why_creators_love_it: whyCreators.trim()  || null,
      thumbnail_url:        thumbnailUrl.trim() || null,
      bundle_badge:         badge,
      price_usd:            Number(priceUsd),
      sale_price_usd:       salePriceUsd  ? Number(salePriceUsd)   : null,
      compare_at_price_usd: compareAtPrice ? Number(compareAtPrice) : null,
      individual_value_usd: Math.round(individualValue * 100) / 100,
      is_featured:          isFeatured,
      is_published:         isPublished,
      target_audience:      targetAudience.split(",").map((s) => s.trim()).filter(Boolean),
      use_cases:            useCases,
    }

    try {
      let bundleId = id

      if (isNew) {
        const res  = await fetch("/api/admin/bundles", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!json.success) { setError(json.error ?? "Create failed."); return }
        bundleId = json.data.id
      } else {
        const res  = await fetch(`/api/admin/bundles/${id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!json.success) { setError(json.error ?? "Save failed."); return }
      }

      // Save preset list
      const presetsRes = await fetch(`/api/admin/bundles/${bundleId}/presets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset_ids: bundlePresets.map((p) => p.id) }),
      })
      const presetsJson = await presetsRes.json()
      if (!presetsJson.success) {
        setError(presetsJson.error ?? "Preset list save failed.")
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)

      if (isNew) router.push(`/admin/bundles/${bundleId}`)
    } finally {
      setSaving(false)
    }
  }, [
    title, slug, tagline, description, whyCreators, thumbnailUrl, badge,
    priceUsd, salePriceUsd, compareAtPrice, individualValue,
    isFeatured, isPublished, targetAudience, useCases,
    bundlePresets, id, isNew, router,
  ])

  /* ── Delete ── */
  async function handleDelete() {
    if (!confirm(`Delete "${title}"? The bundle is removed but all presets remain untouched.`)) return
    setDeleting(true)
    const res  = await fetch(`/api/admin/bundles/${id}`, { method: "DELETE" })
    const json = await res.json()
    if (json.success) {
      router.push("/admin/bundles")
    } else {
      alert(json.error ?? "Delete failed.")
      setDeleting(false)
    }
  }

  /* ── Loading / error states ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/70 text-[0.875rem]">Loading bundle…</p>
      </div>
    )
  }

  if (!isNew && error && !title) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-white/70">{error ?? "Bundle not found."}</p>
        <Link href="/admin/bundles" className="text-gold text-[0.875rem] hover:underline">
          ← Back to bundles
        </Link>
      </div>
    )
  }

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-6 p-8 max-w-3xl w-full">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <Link href="/admin/bundles" className="text-[0.75rem] text-white/70 hover:text-white/85 transition-colors">
            ← Back to bundles
          </Link>
          <h1 className="font-display font-bold text-[1.5rem] text-white/90">
            {isNew ? "New Bundle" : "Edit Bundle"}
          </h1>
          {!isNew && <p className="text-[0.8125rem] text-white/50">/bundles/{slug}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {saved && <span className="text-[0.8125rem] text-emerald-400">✓ Saved</span>}
          {!isNew && (
            <Link
              href={`/bundles/${slug}`}
              target="_blank"
              className="rounded-xl border border-white/10 text-white/85 text-[0.8125rem] font-medium px-4 py-2 hover:text-white/92 transition-colors"
            >
              View →
            </Link>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-gold text-background font-semibold px-5 py-2 text-[0.875rem] hover:bg-gold/90 transition-all disabled:opacity-40 active:scale-95"
          >
            {saving ? "Saving…" : isNew ? "( Create Bundle )" : "( Save Changes )"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[0.8125rem] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* ── Section 1: Basic Info ── */}
      <Section title="Basic Info">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Field label="Bundle Name" span={2}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Cinema Director Bundle"
              className="admin-input"
            />
          </Field>

          <Field label="Slug" span={2}>
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugEdited(true) }}
              placeholder="cinema-director-bundle"
              className="admin-input font-mono text-[0.8125rem]"
            />
            <p className="text-[0.7rem] text-white/40 mt-0.5">
              pxlcreator.space/bundles/{slug || "…"}
            </p>
          </Field>

          <Field label="Tagline" span={2}>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Hollywood colour grading for every shot"
              className="admin-input"
            />
          </Field>

          <Field label="Badge">
            <select value={badge} onChange={(e) => setBadge(e.target.value)} className="admin-input">
              {BADGE_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>

          <Field label="Cover Image URL">
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://…"
              className="admin-input"
            />
          </Field>

          <Field label="Description" span={2}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Full marketing description shown on the bundle page…"
              className="admin-input resize-none"
            />
          </Field>

          <Field label="Why Creators Love It" span={2}>
            <textarea
              value={whyCreators}
              onChange={(e) => setWhyCreators(e.target.value)}
              rows={3}
              placeholder="2-3 sentence pitch paragraph…"
              className="admin-input resize-none"
            />
          </Field>

        </div>
      </Section>

      {/* ── Section 2: Pricing ── */}
      <Section title="Pricing">
        <p className="text-[0.75rem] text-white/40 mb-4 leading-relaxed">
          Bundle pricing is completely independent of preset prices. Set the bundle price here;
          individual preset prices are never inherited by the bundle.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <Field label="Bundle Price ($)" required>
            <input
              type="number"
              min="0" step="0.01"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              placeholder="9.99"
              className="admin-input"
            />
            <p className="text-[0.7rem] text-white/40 mt-0.5">What the customer pays</p>
          </Field>

          <Field label="Sale Price ($)">
            <input
              type="number"
              min="0" step="0.01"
              value={salePriceUsd}
              onChange={(e) => setSalePriceUsd(e.target.value)}
              placeholder="Leave blank if no sale"
              className="admin-input"
            />
            <p className="text-[0.7rem] text-white/40 mt-0.5">
              If set, replaces bundle price at checkout
            </p>
          </Field>

          <Field label="Compare-at Price ($)">
            <input
              type="number"
              min="0" step="0.01"
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
              placeholder="Leave blank to use individual value"
              className="admin-input"
            />
            <p className="text-[0.7rem] text-white/40 mt-0.5">
              Shown struck-through as reference price
            </p>
          </Field>

        </div>

        {/* Computed individual value */}
        <div className="mt-4 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[0.75rem] text-white/60 uppercase tracking-widest">
              Individual Value (auto-computed)
            </p>
            <p className="text-[0.8125rem] text-white/40 mt-0.5">
              Sum of all preset prices in this bundle — updates when you add/remove presets.
            </p>
          </div>
          <p className="text-[1.25rem] font-bold text-white/60 shrink-0">
            ${individualValue.toFixed(2)}
          </p>
        </div>

        {/* Savings preview */}
        {priceUsd && Number(priceUsd) > 0 && individualValue > 0 && (
          <div className="mt-2 text-[0.75rem] text-emerald-400/80">
            Customers save{" "}
            <span className="font-bold">
              {Math.round((1 - Number(salePriceUsd || priceUsd) / individualValue) * 100)}%
            </span>{" "}
            vs buying individually.
          </div>
        )}
      </Section>

      {/* ── Section 3: Included Presets ── */}
      <Section title="Included Presets">
        <p className="text-[0.75rem] text-white/40 mb-4">
          {bundlePresets.length} preset{bundlePresets.length !== 1 ? "s" : ""} in this bundle.
          Individual preset prices are shown read-only — they never affect the bundle price.
        </p>

        {/* Ordered preset list */}
        {bundlePresets.length > 0 ? (
          <div className="flex flex-col gap-2 mb-5">
            {bundlePresets.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5"
              >
                {p.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnail_url}
                    alt=""
                    className="h-8 w-8 rounded-md object-cover shrink-0 bg-white/5"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-md bg-white/5 shrink-0" />
                )}
                <p className="flex-1 text-[0.875rem] text-white/85 truncate">{p.title}</p>
                <p className="text-[0.75rem] text-white/40 shrink-0 font-mono">
                  ${p.price.toFixed(2)}
                </p>
                {!p.is_published && (
                  <span className="text-[0.6rem] text-white/30 bg-white/5 rounded px-1.5 py-0.5 shrink-0">
                    draft
                  </span>
                )}
                {/* Order controls */}
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => movePreset(i, -1)}
                    disabled={i === 0}
                    className="h-6 w-6 flex items-center justify-center rounded text-white/40 hover:text-white/80 disabled:opacity-20 transition-colors text-sm"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => movePreset(i, 1)}
                    disabled={i === bundlePresets.length - 1}
                    className="h-6 w-6 flex items-center justify-center rounded text-white/40 hover:text-white/80 disabled:opacity-20 transition-colors text-sm"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removePreset(p.id)}
                  className="h-6 w-6 flex items-center justify-center rounded text-red-400/40 hover:text-red-400/80 transition-colors shrink-0"
                  aria-label={`Remove ${p.title}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center mb-5">
            <p className="text-[0.8125rem] text-white/30">No presets added yet. Use the panel below to add presets.</p>
          </div>
        )}

        {/* Add preset panel */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[0.75rem] text-white/60 uppercase tracking-widest mb-3">Add Presets</p>
          <input
            type="text"
            placeholder="Search presets to add…"
            value={presetSearch}
            onChange={(e) => setPresetSearch(e.target.value)}
            className="admin-input mb-3"
          />
          {loadingPresets ? (
            <p className="text-[0.8125rem] text-white/40 py-3">Loading presets…</p>
          ) : (
            <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 scrollbar-thin">
              {addablePresets.length === 0 && (
                <p className="text-[0.8125rem] text-white/30 py-3 text-center">
                  {presetSearch ? "No presets match your search." : "All presets are already in this bundle."}
                </p>
              )}
              {addablePresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addPreset(p)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.05] transition-colors text-left w-full"
                >
                  {p.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.thumbnail_url}
                      alt=""
                      className="h-7 w-7 rounded object-cover shrink-0 bg-white/5"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded bg-white/5 shrink-0" />
                  )}
                  <span className="flex-1 text-[0.8125rem] text-white/80 truncate">{p.title}</span>
                  <span className="text-[0.75rem] text-white/40 font-mono shrink-0">${p.price.toFixed(2)}</span>
                  <span className="text-gold/70 text-[0.75rem] shrink-0">+</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ── Section 4: Settings ── */}
      <Section title="Settings">
        <div className="flex flex-col gap-5">

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
            {[
              { label: "Featured",  value: isFeatured,  set: setIsFeatured  },
              { label: "Published", value: isPublished, set: setIsPublished },
            ].map(({ label, value, set }) => (
              <label key={label} className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => set(!value)}
                  className={cn(
                    "h-5 w-9 rounded-full transition-colors cursor-pointer relative",
                    value ? "bg-gold/80" : "bg-white/10",
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                    value ? "left-[18px]" : "left-0.5",
                  )} />
                </div>
                <span className="text-[0.8125rem] text-white/85">{label}</span>
              </label>
            ))}
          </div>

          {/* Target audience */}
          <Field label="Target Audience — comma separated">
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Beginners, Travel creators, YouTubers…"
              className="admin-input"
            />
          </Field>

          {/* Use cases */}
          <div className="flex flex-col gap-2">
            <p className="text-[0.75rem] text-white/70 tracking-widest">( Use Cases )</p>
            <div className="flex flex-wrap gap-2">
              {USE_CASE_OPTIONS.map((uc) => {
                const active = useCases.includes(uc)
                return (
                  <button
                    key={uc}
                    type="button"
                    onClick={() =>
                      setUseCases((prev) =>
                        active ? prev.filter((u) => u !== uc) : [...prev, uc],
                      )
                    }
                    className={cn(
                      "rounded-full px-3 py-1 text-[0.75rem] font-medium transition-colors",
                      active
                        ? "bg-gold/20 text-gold border border-gold/30"
                        : "bg-white/[0.04] text-white/60 border border-white/8 hover:text-white/80",
                    )}
                  >
                    {uc}
                  </button>
                )
              })}
            </div>
          </div>

        </div>
      </Section>

      {/* ── Danger Zone (edit only) ── */}
      {!isNew && (
        <Section title="Danger Zone">
          <p className="text-[0.8125rem] text-white/50 mb-4">
            Deleting a bundle removes it from the store permanently. Individual presets in this bundle
            are NOT affected — they remain in the catalogue.
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-semibold px-5 py-2 text-[0.875rem] hover:bg-red-500/20 transition-colors disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Delete Bundle"}
          </button>
        </Section>
      )}

    </div>
  )
}

/* ── Sub-components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <h2 className="text-[0.75rem] font-semibold text-gold/60 uppercase tracking-widest mb-5">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({
  label, children, required, span,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
  span?: number
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", span === 2 && "md:col-span-2")}>
      <label className="text-[0.75rem] text-white/70 tracking-widest">
        ( {label}{required && <span className="text-red-400/70 ml-1">*</span>} )
      </label>
      {children}
    </div>
  )
}
