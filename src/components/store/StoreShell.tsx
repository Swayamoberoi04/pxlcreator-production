"use client"

import { useState, useMemo } from "react"
import Link                  from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { PresetCard }        from "./PresetCard"
import type { Preset, PresetCategory } from "@/types/product"
import { cn }                from "@/lib/utils"

type SortKey = "popular" | "price-asc" | "price-desc" | "rating" | "newest"

const CATEGORIES: Array<PresetCategory | "All" | "Free"> = [
  "All", "Cinematic", "Film Emulation", "Portrait", "Landscape", "Street", "Free"
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "popular",    label: "( Most Popular )"    },
  { value: "rating",     label: "( Highest Rated )"   },
  { value: "price-asc",  label: "( Price: Low → High )"},
  { value: "price-desc", label: "( Price: High → Low )"},
  { value: "newest",     label: "( Newest First )"    },
]

interface StoreShellProps {
  presets:          Preset[]
  initialCategory?: PresetCategory | "All" | "Free"
}

export function StoreShell({ presets, initialCategory = "All" }: StoreShellProps) {
  const [search,   setSearch]   = useState("")
  const [category, setCategory] = useState<PresetCategory | "All" | "Free">(initialCategory)
  const [sort,     setSort]     = useState<SortKey>("popular")

  /* Pre-compute counts for the filter pills */
  const freeCount = useMemo(() => presets.filter((p) => p.isFree).length, [presets])

  /* ── Filtered + sorted list ── */
  const visible = useMemo(() => {
    // Always exclude bundle-category items from the presets grid
    let list = [...presets].filter((p) => p.category !== "Bundle")

    if (category === "Free") {
      list = list.filter((p) => p.isFree)
    } else if (category !== "All") {
      list = list.filter((p) => p.category === category)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q)     ||
          p.tagline.toLowerCase().includes(q)  ||
          p.category.toLowerCase().includes(q) ||
          p.aiTags?.some((t) => t.includes(q))
      )
    }

    switch (sort) {
      case "popular":    list.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));  break
      case "rating":     list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));            break
      case "price-asc":  list.sort((a, b) => a.price - b.price);              break
      case "price-desc": list.sort((a, b) => b.price - a.price);              break
      case "newest":     list.sort((a, b) => Number(b.id) - Number(a.id));    break
    }

    return list
  }, [presets, category, search, sort])

  /* ── Featured free presets (spotlight row — shown when category is "All" / no search) ── */
  const spotlightFree = useMemo(() => {
    if (category !== "All" || search.trim()) return []
    return presets
      .filter((p) => p.isFree && (p.conversionTag === "MOST POPULAR" || p.conversionTag === "COMMUNITY FAVORITE" || p.isFeatured))
      .slice(0, 3)
  }, [presets, category, search])

  return (
    <div className="flex flex-col gap-10">

      {/* ── Free-preset spotlight callout ─────────────────────── */}
      {spotlightFree.length > 0 && (
        <section className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] overflow-hidden">
          <div className="px-5 py-4 border-b border-emerald-500/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <GiftIcon />
              <div>
                <p className="text-[0.8125rem] font-bold text-foreground">
                  {freeCount} free presets — no credit card, no catch
                </p>
                <p className="text-[0.75rem] text-muted/85 mt-0.5">
                  Start here. Download instantly after creating a free account.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCategory("Free")}
              suppressHydrationWarning
              className="shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[0.75rem] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors focus-visible:outline-none"
            >
              See all free →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-emerald-500/10">
            {spotlightFree.map((preset) => (
              <Link
                key={preset.id}
                href={`/presets/${preset.slug}`}
                className="flex items-center gap-3 px-5 py-4 bg-background/60 hover:bg-surface transition-colors group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <DownloadMiniIcon />
                </div>
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-semibold text-foreground group-hover:text-gold transition-colors truncate">
                    {preset.name}
                  </p>
                  <p className="text-[0.72rem] text-muted/85 truncate">
                    {preset.includeCount} presets · {preset.category}
                  </p>
                </div>
                <span className="ml-auto shrink-0 text-[0.65rem] font-black text-emerald-400">FREE</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Search ─────────────────────────────────────────────── */}
      <div className="relative max-w-lg">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/70" aria-hidden="true">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search presets…"
          suppressHydrationWarning
          className="w-full rounded-2xl border border-border bg-surface pl-11 pr-4 py-3 text-[0.9375rem] text-foreground placeholder:text-muted/70 focus:outline-none focus:border-gold/40 focus:shadow-[0_0_0_3px_rgba(255,214,10,0.10),0_0_16px_rgba(255,214,10,0.08)] transition-all duration-200"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            suppressHydrationWarning
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/70 hover:text-muted transition-colors focus-visible:outline-none"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {/* ── Filter bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 flex-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              suppressHydrationWarning
              className={cn(
                "relative rounded-full px-4 py-1.5 text-[0.75rem] font-semibold tracking-wide transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                category === cat
                  ? cat === "Free"
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                    : "bg-gold/12 border border-gold/40 text-gold"
                  : "border border-border text-muted/85 hover:border-border/80 hover:text-foreground"
              )}
            >
              ( {cat} )
              {/* Free count bubble */}
              {cat === "Free" && (
                <span className={cn(
                  "absolute -top-1.5 -right-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1",
                  "text-[0.55rem] font-black",
                  category === "Free"
                    ? "bg-emerald-400 text-background"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                )}>
                  {freeCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="relative shrink-0">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            suppressHydrationWarning
            className="appearance-none rounded-2xl border border-border bg-surface pl-4 pr-9 py-2 text-[0.8125rem] text-muted focus:outline-none focus:border-gold/40 transition-colors cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted/70" aria-hidden="true">
            <ChevronIcon />
          </span>
        </div>

      </div>

      {/* ── Results count ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 -mt-5">
        <span className="h-px flex-1 bg-border max-w-[40px]" aria-hidden="true" />
        <span className="text-[0.75rem] text-muted/85 font-medium">
          ( {visible.length} {visible.length === 1 ? "preset" : "presets"} )
        </span>
        {category === "Free" && (
          <span className="text-[0.72rem] text-emerald-400/70 font-medium">· all free</span>
        )}
        {search && (
          <span className="text-[0.75rem] text-muted/70">
            matching &ldquo;{search}&rdquo;
          </span>
        )}
      </div>

      {/* ── Grid ──────────────────────────────────────────────── */}
      {visible.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((preset) => (
              <motion.div
                key={preset.id}
                layout
                initial={{ opacity: 0, scale: 0.94, y: 10 }}
                animate={{ opacity: 1, scale: 1,    y: 0  }}
                exit={{    opacity: 0, scale: 0.94, y: -6 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
                <PresetCard preset={preset} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 py-20 rounded-2xl border border-border bg-surface text-center">
          <span className="text-4xl opacity-20" aria-hidden="true">( · )</span>
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-foreground">No presets found</p>
            <p className="text-[0.875rem] text-muted/85">
              Try a different search or filter
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setSearch(""); setCategory("All") }}
            suppressHydrationWarning
            className="rounded-full border border-border px-5 py-2 text-[0.8125rem] font-medium text-muted transition-colors hover:text-foreground hover:border-gold/30"
          >
            ( Clear filters )
          </button>
        </div>
      )}

      {/* ── Bundles callout ─────────────────────────────────── */}
      {category === "All" && !search.trim() && (
        <section className="rounded-2xl border border-gold/10 bg-gold/[0.025] overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BundlesIcon />
              <div>
                <p className="text-[0.8125rem] font-bold text-foreground">
                  Want everything at once? Browse our preset bundles.
                </p>
                <p className="text-[0.75rem] text-muted/85 mt-0.5">
                  Save 30–39% vs. buying individually — curated packs for every style.
                </p>
              </div>
            </div>
            <Link
              href="/bundles"
              className="shrink-0 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 text-[0.75rem] font-semibold text-gold hover:bg-gold/20 transition-colors focus-visible:outline-none"
            >
              View bundles →
            </Link>
          </div>
        </section>
      )}

    </div>
  )
}

/* ── Icons ── */
function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function CloseIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function ChevronIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
}
function GiftIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
}
function DownloadMiniIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}
function BundlesIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
}


