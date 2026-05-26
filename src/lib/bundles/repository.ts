/**
 * src/lib/bundles/repository.ts
 *
 * Data access layer for bundles.
 *
 * Mirrors the presets repository pattern:
 *   1. Try Supabase (live DB) if env vars are configured.
 *   2. Fall back to static ALL_BUNDLES from src/data/bundles.ts.
 *
 * This means the bundle store works out of the box with static data,
 * and automatically switches to live DB once bundles are populated in
 * Supabase (via migration 005_bundles_schema.sql).
 *
 * Used in Server Components and Route Handlers ONLY.
 * Never import this in "use client" files.
 */

import type { Bundle }               from "@/types/bundle"
import type { BundleBadgeLabel, UseCaseTag } from "@/types/bundle"
import { ALL_BUNDLES, FEATURED_BUNDLES }     from "@/data/bundles"

/* ── Supabase availability check ────────────────────────── */

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co"
  )
}

/* ── Supabase select fragment ───────────────────────────── */

const BUNDLE_SELECT = `
  *,
  included_packs:bundle_included_packs(*)
` as const

/* ── Query options ──────────────────────────────────────── */

export interface BundleQueryOptions {
  featured?:  boolean
  published?: boolean
  limit?:     number
  offset?:    number
  orderBy?:   "order_index" | "price_usd" | "created_at"
  ascending?: boolean
}

/* ── getBundles ─────────────────────────────────────────── */

/**
 * Fetch all bundles with optional filters.
 * Falls back to static data if Supabase is not configured or table is empty.
 */
export async function getBundles(opts: BundleQueryOptions = {}): Promise<Bundle[]> {
  if (!isSupabaseConfigured()) {
    return filterStaticBundles(ALL_BUNDLES, opts)
  }

  try {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from("bundles")
      .select(BUNDLE_SELECT)
      .eq("is_published", opts.published ?? true)

    if (opts.featured === true) {
      query = query.eq("is_featured", true)
    }

    const orderCol = opts.orderBy ?? "order_index"
    query = query.order(orderCol, { ascending: opts.ascending ?? true })

    if (opts.limit)  query = query.limit(opts.limit)
    if (opts.offset) query = query.range(
      opts.offset,
      opts.offset + (opts.limit ?? 50) - 1
    )

    const { data, error } = await query

    if (error) {
      // "schema cache" = migration 005 not applied yet — expected during dev.
      // Fall back silently; only log real (unexpected) DB errors as errors.
      const isTableMissing =
        error.message.includes("schema cache") ||
        error.message.includes("does not exist")

      if (!isTableMissing) {
        console.error("[bundles/repository.getBundles] Supabase error:", error.message)
      }
      return filterStaticBundles(ALL_BUNDLES, opts)
    }

    // DB table exists but has no rows yet — use static data
    if (!data || data.length === 0) {
      return filterStaticBundles(ALL_BUNDLES, opts)
    }

    return (data as unknown as BundleDbRow[]).map(adaptBundleRow)
  } catch (err) {
    // "Dynamic server usage" = Next.js static pre-render attempted to call
    // cookies() which isn't available at build time. Expected — fall back silently.
    const msg = err instanceof Error ? err.message : String(err)
    const isBuildTimeError = msg.includes("Dynamic server usage") || msg.includes("cookies")
    if (!isBuildTimeError) {
      console.error("[bundles/repository.getBundles] Unexpected error:", err)
    }
    return filterStaticBundles(ALL_BUNDLES, opts)
  }
}

/* ── getBundleBySlug ────────────────────────────────────── */

export async function getBundleBySlug(slug: string): Promise<Bundle | null> {
  if (!isSupabaseConfigured()) {
    return ALL_BUNDLES.find((b) => b.slug === slug) ?? null
  }

  try {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("bundles")
      .select(BUNDLE_SELECT)
      .eq("slug", slug)
      .eq("is_published", true)
      .single()

    if (error || !data) {
      // Not found in DB — try static data (covers the "table empty" case)
      return ALL_BUNDLES.find((b) => b.slug === slug) ?? null
    }

    return adaptBundleRow(data as unknown as BundleDbRow)
  } catch {
    return ALL_BUNDLES.find((b) => b.slug === slug) ?? null
  }
}

/* ── getFeaturedBundles ─────────────────────────────────── */

export async function getFeaturedBundles(limit = 4): Promise<Bundle[]> {
  if (!isSupabaseConfigured()) {
    return FEATURED_BUNDLES.slice(0, limit)
  }
  return getBundles({ featured: true, limit, orderBy: "order_index" })
}

/* ── Static data fallback filter ─────────────────────────── */

function filterStaticBundles(bundles: Bundle[], opts: BundleQueryOptions): Bundle[] {
  let list = [...bundles]

  if (opts.featured) list = list.filter((b) => b.isFeatured)

  if (opts.limit) {
    list = list.slice(opts.offset ?? 0, (opts.offset ?? 0) + opts.limit)
  }

  return list
}

/* ── Internal DB row shapes (used only in adapter) ──────── */

interface BundleIncludedPackDbRow {
  id:           string
  bundle_id:    string
  name:         string
  preset_count: number
  category:     string
  description:  string | null
  icon:         string | null
  order_index:  number
}

interface BundleDbRow {
  id:                   string
  slug:                 string
  title:                string
  tagline:              string | null
  description:          string | null
  why_creators_love_it: string | null
  preset_id:            string | null
  price_usd:            number
  individual_value_usd: number
  bundle_badge:         string
  is_featured:          boolean
  is_published:         boolean
  target_audience:      string[]
  use_cases:            string[]
  features:             string[]
  thumbnail_url:        string | null
  order_index:          number
  included_packs:       BundleIncludedPackDbRow[]
}

/* ── DB row → Bundle type adapter ───────────────────────── */

function adaptBundleRow(row: BundleDbRow): Bundle {
  const packs = (row.included_packs ?? []).sort(
    (a, b) => a.order_index - b.order_index
  )

  const totalPresets = packs.reduce((sum, p) => sum + (p.preset_count ?? 0), 0)

  // Map bundle_badge to the Preset badge field
  const presetBadge: Bundle["badge"] =
    row.bundle_badge === "BESTSELLER" || row.bundle_badge === "MOST POPULAR"
      ? "Best Seller"
      : row.bundle_badge === "NEW"
      ? "New"
      : "Sale"

  return {
    /* ── Preset base fields (Bundle extends Preset) ─── */
    id:               row.id,
    slug:             row.slug,
    name:             row.title,
    tagline:          row.tagline ?? "",
    description:      row.description ?? "",
    category:         "Bundle",
    price:            row.price_usd,
    originalPrice:    row.individual_value_usd,
    rating:           0,
    reviewCount:      0,
    badge:            presetBadge,
    isFeatured:       row.is_featured,
    isFree:           false,
    thumbnailUrl:     row.thumbnail_url ?? undefined,
    images:           [],
    beforeUrl:        undefined,
    afterUrl:         undefined,
    includeCount:     totalPresets || undefined,
    features:         row.features ?? [],
    compatibility:    [],
    aiTags:           [],
    downloadFileName: undefined,

    /* ── Bundle-specific fields ─────────────────────── */
    bundleBadge:        row.bundle_badge as BundleBadgeLabel,
    individualValueUsd: row.individual_value_usd,
    includedPacks: packs.map((p) => ({
      name:        p.name,
      presetCount: p.preset_count,
      category:    p.category,
      description: p.description ?? "",
      icon:        p.icon ?? "📦",
    })),
    whyCreatorsLoveIt: row.why_creators_love_it ?? "",
    targetAudience:    row.target_audience ?? [],
    useCases:          (row.use_cases ?? []) as UseCaseTag[],
  }
}
