"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface AdminPreset {
  id:            string
  name:          string
  slug:          string
  thumbnail_url: string | null
  price_usd:     number
  category:      string | { name: string } | null
  is_published:  boolean
}

function categoryName(cat: AdminPreset["category"]): string {
  if (!cat) return "—"
  if (typeof cat === "string") return cat
  return cat.name ?? "—"
}

interface PickedPreset extends AdminPreset {
  orderIndex: number
}

interface BundleFormState {
  name:               string
  slug:               string
  tagline:            string
  description:        string
  seoTitle:           string
  seoDescription:     string
  thumbnailUrl:       string
  bannerUrl:          string
  badge:              string
  displayOrder:       number
  bundlePriceUsd:     number
  compareAtPriceUsd:  string
  downloadUrl:        string
  isPublished:        boolean
  isFeatured:         boolean
}

const EMPTY: BundleFormState = {
  name: "", slug: "", tagline: "", description: "", seoTitle: "",
  seoDescription: "", thumbnailUrl: "", bannerUrl: "", badge: "",
  displayOrder: 0, bundlePriceUsd: 0, compareAtPriceUsd: "",
  downloadUrl: "", isPublished: false, isFeatured: false,
}

export default function BundleEditorPage() {
  const params   = useParams()
  const router   = useRouter()
  const isNew    = params.id === "new"
  const bundleId = isNew ? null : params.id as string

  const [form, setForm]           = useState<BundleFormState>(EMPTY)
  const [picked, setPicked]       = useState<PickedPreset[]>([])
  const [allPresets, setAllPresets] = useState<AdminPreset[]>([])
  const [search, setSearch]       = useState("")
  const [catFilter, setCatFilter] = useState("All")
  const [saving, setSaving]       = useState(false)
  const [loading, setLoading]     = useState(!isNew)
  const [saveMsg, setSaveMsg]     = useState<{ ok: boolean; text: string } | null>(null)
  const [dragId, setDragId]       = useState<string | null>(null)
  const dragOver                  = useRef<string | null>(null)

  /* ── Load presets for picker ── */
  useEffect(() => {
    fetch("/api/admin/presets")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return
        // API returns `title` and `price` (DB column names); normalize to interface shape
        setAllPresets(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          j.data.map((p: any) => ({
            ...p,
            name:      p.title      ?? p.name      ?? "",
            price_usd: p.price      ?? p.price_usd ?? 0,
          }))
        )
      })
      .catch(() => {})
  }, [])

  /* ── Load existing bundle ── */
  const loadBundle = useCallback(async () => {
    if (!bundleId) return
    setLoading(true)
    const res  = await fetch(`/api/admin/bundles/${bundleId}`)
    const json = await res.json()
    if (!json.success) { setLoading(false); return }
    const b = json.data
    setForm({
      name:              b.name ?? "",
      slug:              b.slug ?? "",
      tagline:           b.tagline ?? "",
      description:       b.description ?? "",
      seoTitle:          b.seo_title ?? "",
      seoDescription:    b.seo_description ?? "",
      thumbnailUrl:      b.thumbnail_url ?? "",
      bannerUrl:         b.banner_url ?? "",
      badge:             b.badge ?? "",
      displayOrder:      b.display_order ?? 0,
      bundlePriceUsd:    b.bundle_price_usd ?? 0,
      compareAtPriceUsd: b.compare_at_price_usd != null ? String(b.compare_at_price_usd) : "",
      downloadUrl:       b.download_url ?? "",
      isPublished:       b.is_published ?? false,
      isFeatured:        b.is_featured ?? false,
    })
    // Map bundle_presets → picked
    const bps: Array<{ preset_id: string; order_index: number }> = b.bundle_presets ?? []
    setLoading(false)
    /* We need allPresets loaded to resolve names — defer until both are ready */
    setPicked(
      bps.sort((a, b) => a.order_index - b.order_index).map((bp) => ({
        id:            bp.preset_id,
        name:          "",
        slug:          "",
        thumbnail_url: null,
        price_usd:     0,
        category:      null,
        is_published:  true,
        orderIndex:    bp.order_index,
      }))
    )
  }, [bundleId])

  useEffect(() => { loadBundle() }, [loadBundle])

  /* Once allPresets loads, enrich picked with full preset info */
  useEffect(() => {
    if (allPresets.length === 0) return
    setPicked((prev) =>
      prev.map((p) => {
        const full = allPresets.find((x) => x.id === p.id)
        return full ? { ...full, orderIndex: p.orderIndex } : p
      })
    )
  }, [allPresets])

  /* ── Auto-slug from name ── */
  function handleNameChange(v: string) {
    setForm((f) => ({
      ...f,
      name: v,
      slug: isNew ? v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : f.slug,
    }))
  }

  /* ── Preset picker helpers ── */
  const categories = ["All", ...Array.from(new Set(allPresets.map((p) => categoryName(p.category))))]

  const visiblePresets = allPresets.filter((p) => {
    const matchCat = catFilter === "All" || categoryName(p.category) === catFilter
    const q = search.toLowerCase()
    const matchQ = !q
      || (p.name  ?? "").toLowerCase().includes(q)
      || (p.slug  ?? "").toLowerCase().includes(q)
      || categoryName(p.category).toLowerCase().includes(q)
    return matchCat && matchQ
  })

  function togglePreset(preset: AdminPreset) {
    setPicked((prev) => {
      const exists = prev.find((p) => p.id === preset.id)
      if (exists) return prev.filter((p) => p.id !== preset.id)
      return [...prev, { ...preset, orderIndex: prev.length }]
    })
  }

  function removePreset(id: string) {
    setPicked((prev) =>
      prev.filter((p) => p.id !== id).map((p, i) => ({ ...p, orderIndex: i }))
    )
  }

  /* ── Drag-and-drop reorder ── */
  function onDragStart(id: string) { setDragId(id) }
  function onDragEnter(id: string) { dragOver.current = id }
  function onDragEnd() {
    if (!dragId || !dragOver.current || dragId === dragOver.current) {
      setDragId(null); return
    }
    setPicked((prev) => {
      const arr   = [...prev]
      const from  = arr.findIndex((p) => p.id === dragId)
      const to    = arr.findIndex((p) => p.id === dragOver.current)
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr.map((p, i) => ({ ...p, orderIndex: i }))
    })
    setDragId(null)
    dragOver.current = null
  }

  /* ── Computed totals ── */
  const totalValue = picked.reduce((s, p) => s + (p.price_usd ?? 0), 0)
  const savings    = Math.max(0, totalValue - form.bundlePriceUsd)

  /* ── Save ── */
  async function handleSave() {
    if (!form.name) { setSaveMsg({ ok: false, text: "Name is required" }); return }
    setSaving(true)
    setSaveMsg(null)

    const payload = {
      name:               form.name,
      slug:               form.slug || undefined,
      tagline:            form.tagline || null,
      description:        form.description || null,
      seoTitle:           form.seoTitle || null,
      seoDescription:     form.seoDescription || null,
      thumbnailUrl:       form.thumbnailUrl || null,
      bannerUrl:          form.bannerUrl || null,
      badge:              form.badge || null,
      displayOrder:       form.displayOrder,
      bundlePriceUsd:     form.bundlePriceUsd,
      compareAtPriceUsd:  form.compareAtPriceUsd ? Number(form.compareAtPriceUsd) : null,
      downloadUrl:        form.downloadUrl || null,
      isPublished:        form.isPublished,
      isFeatured:         form.isFeatured,
      presetIds:          picked.map((p) => p.id),
    }

    try {
      let res: Response
      if (isNew) {
        res = await fetch("/api/admin/bundles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/admin/bundles/${bundleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      const json = await res.json()
      if (json.success) {
        setSaveMsg({ ok: true, text: "Saved successfully" })
        if (isNew) router.replace(`/admin/bundles/${json.data.id}`)
      } else {
        setSaveMsg({ ok: false, text: json.error ?? "Save failed" })
      }
    } catch {
      setSaveMsg({ ok: false, text: "Network error" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-5xl w-full">
        <div className="h-8 w-48 rounded-lg bg-white/[0.06] animate-pulse" />
        <div className="h-64 rounded-xl bg-white/[0.03] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-5xl w-full pb-24">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Link href="/admin/bundles" className="text-[0.75rem] text-white/40 hover:text-white/70 transition-colors">
              Bundles
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-[0.75rem] text-white/60">{isNew ? "New Bundle" : form.name || "Edit"}</span>
          </div>
          <h1 className="font-display font-bold text-[1.75rem] text-white/90">
            {isNew ? "New Bundle" : "Edit Bundle"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className={cn("text-[0.8rem]", saveMsg.ok ? "text-green-400" : "text-red-400")}>
              {saveMsg.text}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gold text-background font-semibold px-5 py-2.5 text-[0.875rem] hover:bg-gold-dim transition-all active:scale-95 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Bundle"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

        {/* ── Left column ── */}
        <div className="flex flex-col gap-6">

          {/* Core details */}
          <Section title="Bundle Details">
            <Field label="Name" required>
              <Input value={form.name} onChange={(v) => handleNameChange(v)} placeholder="Desert Gold Mega Pack" />
            </Field>
            <Field label="URL Slug">
              <Input value={form.slug} onChange={(v) => setForm((f) => ({ ...f, slug: v }))} placeholder="desert-gold-mega-pack" mono />
            </Field>
            <Field label="Tagline">
              <Input value={form.tagline} onChange={(v) => setForm((f) => ({ ...f, tagline: v }))} placeholder="Your one-stop pack for warm cinematic shots" />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                placeholder="Full description shown on the bundle page…"
                className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-[0.875rem] text-white/90 placeholder-white/25 resize-y outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all"
              />
            </Field>
            <Field label="Badge" hint="e.g. Best Seller, New, Limited">
              <Input value={form.badge} onChange={(v) => setForm((f) => ({ ...f, badge: v }))} placeholder="Best Seller" />
            </Field>
          </Section>

          {/* Pricing */}
          <Section title="Pricing">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Bundle Price (USD)" required>
                <Input
                  type="number"
                  value={String(form.bundlePriceUsd)}
                  onChange={(v) => setForm((f) => ({ ...f, bundlePriceUsd: Number(v) }))}
                  placeholder="29"
                />
              </Field>
              <Field label="Compare-at Price (USD)" hint="Crossed-out original">
                <Input
                  type="number"
                  value={form.compareAtPriceUsd}
                  onChange={(v) => setForm((f) => ({ ...f, compareAtPriceUsd: v }))}
                  placeholder="49"
                />
              </Field>
            </div>
            {picked.length > 0 && (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 flex items-center justify-between text-[0.85rem]">
                <span className="text-white/50">Individual total: <span className="text-white/80 font-medium">${totalValue.toFixed(2)}</span></span>
                <span className="text-white/50">Bundle: <span className="text-gold font-semibold">${form.bundlePriceUsd.toFixed(2)}</span></span>
                <span className="text-green-400 font-medium">Save ${savings.toFixed(2)} ({totalValue > 0 ? Math.round((savings / totalValue) * 100) : 0}%)</span>
              </div>
            )}
          </Section>

          {/* Download */}
          <Section title="Download">
            <Field label="Download URL" hint="HTTPS link — Drive, Dropbox, OneDrive, Supabase Storage, etc.">
              <Input value={form.downloadUrl} onChange={(v) => setForm((f) => ({ ...f, downloadUrl: v }))} placeholder="https://drive.google.com/…" />
            </Field>
          </Section>

          {/* Media */}
          <Section title="Media">
            <Field label="Thumbnail URL" hint="Small square card image">
              <Input value={form.thumbnailUrl} onChange={(v) => setForm((f) => ({ ...f, thumbnailUrl: v }))} placeholder="https://…" />
            </Field>
            <Field label="Banner URL" hint="Wide banner shown on the detail page">
              <Input value={form.bannerUrl} onChange={(v) => setForm((f) => ({ ...f, bannerUrl: v }))} placeholder="https://…" />
            </Field>
          </Section>

          {/* SEO */}
          <Section title="SEO">
            <Field label="SEO Title">
              <Input value={form.seoTitle} onChange={(v) => setForm((f) => ({ ...f, seoTitle: v }))} placeholder="Fallback: bundle name" />
            </Field>
            <Field label="SEO Description">
              <Input value={form.seoDescription} onChange={(v) => setForm((f) => ({ ...f, seoDescription: v }))} placeholder="Short description for search engines" />
            </Field>
          </Section>

          {/* ── Preset Picker ── */}
          <Section title={`Included Presets (${picked.length})`}>

            {/* Search + filter */}
            <div className="flex gap-2 flex-wrap">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search presets…"
                className="flex-1 min-w-[180px] rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-[0.8125rem] text-white/90 placeholder-white/25 outline-none focus:border-gold/40 transition-all"
              />
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-[0.8125rem] text-white/70 outline-none focus:border-gold/40 transition-all"
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Available presets grid */}
            <div className="max-h-[320px] overflow-y-auto rounded-lg border border-white/[0.06] divide-y divide-white/[0.04]">
              {visiblePresets.length === 0 && (
                <p className="px-4 py-6 text-center text-[0.8rem] text-white/30">No presets match</p>
              )}
              {visiblePresets.map((preset) => {
                const isSelected = picked.some((p) => p.id === preset.id)
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => togglePreset(preset)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      isSelected ? "bg-gold/8 hover:bg-gold/12" : "hover:bg-white/[0.03]"
                    )}
                  >
                    <div className="h-9 w-9 shrink-0 rounded-md bg-white/[0.06] overflow-hidden">
                      {preset.thumbnail_url && (
                        <img src={preset.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.8125rem] font-medium text-white/90 truncate">{preset.name}</p>
                      <p className="text-[0.7rem] text-white/40">{categoryName(preset.category)} · ${preset.price_usd}</p>
                    </div>
                    <div className={cn(
                      "h-5 w-5 shrink-0 rounded border flex items-center justify-center transition-colors",
                      isSelected ? "bg-gold border-gold text-background" : "border-white/20"
                    )}>
                      {isSelected && <CheckIcon />}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Selected / reorder zone */}
            {picked.length > 0 && (
              <div className="flex flex-col gap-1 mt-2">
                <p className="text-[0.75rem] text-white/40 px-1">Drag to reorder</p>
                {picked.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => onDragStart(p.id)}
                    onDragEnter={() => onDragEnter(p.id)}
                    onDragEnd={onDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg border transition-all cursor-grab",
                      dragId === p.id
                        ? "border-gold/40 bg-gold/8 opacity-60"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"
                    )}
                  >
                    <GripIcon />
                    <div className="h-8 w-8 shrink-0 rounded-md bg-white/[0.06] overflow-hidden">
                      {p.thumbnail_url && (
                        <img src={p.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <span className="flex-1 text-[0.8125rem] text-white/80 truncate">{p.name || p.id}</span>
                    <span className="text-[0.75rem] text-white/40">${p.price_usd}</span>
                    <button
                      type="button"
                      onClick={() => removePreset(p.id)}
                      className="ml-1 text-white/30 hover:text-red-400 transition-colors"
                    >
                      <XIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-4 sticky top-8">

          {/* Status */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col gap-4">
            <p className="text-[0.75rem] text-white/40 tracking-widest font-medium">( STATUS )</p>

            <Toggle
              label="Published"
              description="Visible on the public site"
              checked={form.isPublished}
              onChange={(v) => setForm((f) => ({ ...f, isPublished: v }))}
            />
            <Toggle
              label="Featured"
              description="Shown in homepage / landing sections"
              checked={form.isFeatured}
              onChange={(v) => setForm((f) => ({ ...f, isFeatured: v }))}
            />

            <Field label="Display Order" hint="Lower = first">
              <Input
                type="number"
                value={String(form.displayOrder)}
                onChange={(v) => setForm((f) => ({ ...f, displayOrder: Number(v) }))}
              />
            </Field>
          </div>

          {/* Stats */}
          {picked.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col gap-3">
              <p className="text-[0.75rem] text-white/40 tracking-widest font-medium">( SUMMARY )</p>
              <StatRow label="Presets" value={String(picked.length)} />
              <StatRow label="Individual Value" value={`$${totalValue.toFixed(2)}`} />
              <StatRow label="Bundle Price" value={`$${form.bundlePriceUsd.toFixed(2)}`} gold />
              <StatRow label="Savings" value={`$${savings.toFixed(2)} (${totalValue > 0 ? Math.round((savings / totalValue) * 100) : 0}%)`} green />
            </div>
          )}

          {/* Danger zone */}
          {!isNew && (
            <div className="rounded-xl border border-red-500/10 bg-red-500/[0.03] p-5 flex flex-col gap-3">
              <p className="text-[0.75rem] text-red-400/60 tracking-widest font-medium">( DANGER ZONE )</p>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("Delete this bundle? This cannot be undone.")) return
                  await fetch(`/api/admin/bundles/${bundleId}`, { method: "DELETE" })
                  router.push("/admin/bundles")
                }}
                className="text-[0.8125rem] text-red-400 hover:text-red-300 transition-colors text-left"
              >
                Delete bundle →
              </button>
            </div>
          )}

        </div>
      </div>

    </div>
  )
}

/* ── Sub-components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 flex flex-col gap-4">
      <p className="text-[0.75rem] text-white/40 tracking-widest font-medium">( {title.toUpperCase()} )</p>
      {children}
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.8rem] font-medium text-white/60">
        {label}{required && <span className="text-gold ml-0.5">*</span>}
        {hint && <span className="ml-2 text-white/30 font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function Input({
  value, onChange, placeholder, type = "text", mono,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2.5",
        "text-[0.875rem] text-white/90 placeholder-white/25 outline-none",
        "focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all",
        mono && "font-mono"
      )}
    />
  )
}

function Toggle({
  label, description, checked, onChange,
}: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[0.875rem] font-medium text-white/80">{label}</p>
        <p className="text-[0.75rem] text-white/40">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200",
          checked ? "bg-gold" : "bg-white/10"
        )}
      >
        <span className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )} />
      </button>
    </div>
  )
}

function StatRow({ label, value, gold, green }: { label: string; value: string; gold?: boolean; green?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[0.8125rem]">
      <span className="text-white/50">{label}</span>
      <span className={cn("font-medium", gold ? "text-gold" : green ? "text-green-400" : "text-white/80")}>{value}</span>
    </div>
  )
}

function CheckIcon() {
  return <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
}
function GripIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/25 shrink-0"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
}
function XIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
