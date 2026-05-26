/**
 * src/lib/presets/repository.ts
 *
 * Data access layer for presets.
 *
 * All functions gracefully fall back to static ALL_PRESETS when
 * Supabase is not configured (no env vars). This means the site
 * works out of the box, and switches to live DB once Supabase is set up.
 *
 * Used in Server Components and Route Handlers only.
 */

import type { Preset, PresetCategory }    from "@/types/product"
import type { PresetWithRelations, CategoryRow } from "@/types/database"
import { adaptPreset, adaptPresets }       from "./adapter"
import { ALL_PRESETS, FEATURED_PRESETS }   from "@/data/presets"

/* ── Supabase availability check ────────────────────────── */

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co"
  )
}

/* ── Supabase select fragment ───────────────────────────── */

const PRESET_SELECT = `
  *,
  category:categories!category_id(id, name, slug, icon, color),
  images:preset_images(id, url, alt_text, order_index)
` as const

/* ── Query options ──────────────────────────────────────── */

export interface PresetQueryOptions {
  category?:  PresetCategory | "All" | "Free"
  search?:    string
  featured?:  boolean
  published?: boolean
  limit?:     number
  offset?:    number
  orderBy?:   "order_index" | "created_at" | "rating" | "review_count" | "price"
  ascending?: boolean
}

/* ── getPresets ─────────────────────────────────────────── */

/**
 * Fetch presets with optional filters.
 * Falls back to static data if Supabase is not configured.
 */
export async function getPresets(opts: PresetQueryOptions = {}): Promise<Preset[]> {
  if (!isSupabaseConfigured()) {
    return filterStaticPresets(ALL_PRESETS, opts)
  }

  try {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from("presets")
      .select(PRESET_SELECT)
      .eq("is_published", opts.published ?? true)

    // Category filter
    if (opts.category === "Free") {
      query = query.eq("is_free", true)
    } else if (opts.category && opts.category !== "All") {
      // Resolve category name → id; filter by category_id (reliable across join aliases)
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("name", opts.category)
        .maybeSingle()
      if (cat?.id) {
        query = query.eq("category_id", cat.id)
      } else {
        return filterStaticPresets(ALL_PRESETS, opts)
      }
    }

    // Featured filter
    if (opts.featured === true) {
      query = query.eq("is_featured", true)
    }

    // Full-text search
    if (opts.search?.trim()) {
      const q = opts.search.trim()
      query = query.or(
        `title.ilike.%${q}%,tagline.ilike.%${q}%,description.ilike.%${q}%`
      )
    }

    // Ordering
    const orderCol = opts.orderBy ?? "order_index"
    query = query.order(orderCol, { ascending: opts.ascending ?? true })

    // Pagination
    if (opts.limit)  query = query.limit(opts.limit)
    if (opts.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1)

    const { data, error } = await query

    if (error) {
      // Detect "table not yet migrated" — only log real unexpected errors
      const isTableMissing =
        error.message.includes("schema cache") ||
        error.message.includes("does not exist")
      if (!isTableMissing) {
        console.error("[repository.getPresets] Supabase error:", error.message)
      }
      return filterStaticPresets(ALL_PRESETS, opts)
    }

    return adaptPresets((data ?? []) as unknown as PresetWithRelations[])
  } catch (err) {
    // "Dynamic server usage" = Next.js static pre-render attempted to call
    // cookies() which isn't available at build time. Expected — fall back silently.
    const msg = err instanceof Error ? err.message : String(err)
    const isBuildTimeError = msg.includes("Dynamic server usage") || msg.includes("cookies")
    if (!isBuildTimeError) {
      console.error("[repository.getPresets] Unexpected error:", err)
    }
    return filterStaticPresets(ALL_PRESETS, opts)
  }
}

/* ── getPresetBySlug ────────────────────────────────────── */

export async function getPresetBySlug(slug: string): Promise<Preset | null> {
  if (!isSupabaseConfigured()) {
    return ALL_PRESETS.find((p) => p.slug === slug) ?? null
  }

  try {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("presets")
      .select(PRESET_SELECT)
      .eq("slug", slug)
      .eq("is_published", true)
      .single()

    if (error || !data) return null

    return adaptPreset(data as unknown as PresetWithRelations)
  } catch {
    return ALL_PRESETS.find((p) => p.slug === slug) ?? null
  }
}

/* ── getFeaturedPresets ─────────────────────────────────── */

export async function getFeaturedPresets(limit = 6): Promise<Preset[]> {
  if (!isSupabaseConfigured()) {
    return FEATURED_PRESETS.slice(0, limit)
  }
  return getPresets({ featured: true, limit, orderBy: "order_index" })
}

/* ── getRelatedPresets ──────────────────────────────────── */

export async function getRelatedPresets(
  category: PresetCategory,
  excludeId: string,
  limit = 3
): Promise<Preset[]> {
  if (!isSupabaseConfigured()) {
    return ALL_PRESETS
      .filter((p) => p.category === category && p.id !== excludeId)
      .slice(0, limit)
  }

  const staticFallback = () =>
    ALL_PRESETS
      .filter((p) => p.category === category && p.id !== excludeId)
      .slice(0, limit)

  try {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const supabase = await createServerSupabaseClient()

    // Resolve category name → id so we can filter by category_id
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("name", category)
      .maybeSingle()

    if (!cat?.id) return staticFallback()

    const { data, error } = await supabase
      .from("presets")
      .select(PRESET_SELECT)
      .eq("is_published", true)
      .eq("category_id", cat.id)
      .neq("id", excludeId)
      .order("order_index")
      .limit(limit)

    if (error || !data) return staticFallback()

    return adaptPresets(data as unknown as PresetWithRelations[])
  } catch {
    return staticFallback()
  }
}

/* ── getCategories ──────────────────────────────────────── */

export async function getCategories(): Promise<CategoryRow[]> {
  if (!isSupabaseConfigured()) {
    // Return static category list
    return [
      { id: "1", name: "Bundle",         slug: "bundle",         description: null, icon: "📦", color: "#ffd700", order_index: 1, created_at: "" },
      { id: "2", name: "Cinematic",      slug: "cinematic",      description: null, icon: "🎬", color: "#f59e0b", order_index: 2, created_at: "" },
      { id: "3", name: "Film Emulation", slug: "film-emulation", description: null, icon: "🎞️", color: "#d97706", order_index: 3, created_at: "" },
      { id: "4", name: "Portrait",       slug: "portrait",       description: null, icon: "🪞", color: "#ec4899", order_index: 4, created_at: "" },
      { id: "5", name: "Landscape",      slug: "landscape",      description: null, icon: "🏔️", color: "#10b981", order_index: 5, created_at: "" },
      { id: "6", name: "Street",         slug: "street",         description: null, icon: "🏙️", color: "#6366f1", order_index: 6, created_at: "" },
    ]
  }

  try {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const supabase = await createServerSupabaseClient()

    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("order_index")

    return (data ?? []) as CategoryRow[]
  } catch {
    return []
  }
}

/* ── getPresetStats ─────────────────────────────────────── */

export interface PresetStats {
  totalPresets:    number
  freePresets:     number
  totalCategories: number
  featuredPresets: number
}

export async function getPresetStats(): Promise<PresetStats> {
  if (!isSupabaseConfigured()) {
    return {
      totalPresets:    ALL_PRESETS.length,
      freePresets:     ALL_PRESETS.filter((p) => p.isFree).length,
      totalCategories: 6,
      featuredPresets: FEATURED_PRESETS.length,
    }
  }

  try {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const supabase = await createServerSupabaseClient()

    const [total, free, featured, cats] = await Promise.all([
      supabase.from("presets").select("id", { count: "exact", head: true }).eq("is_published", true),
      supabase.from("presets").select("id", { count: "exact", head: true }).eq("is_free",      true).eq("is_published", true),
      supabase.from("presets").select("id", { count: "exact", head: true }).eq("is_featured",  true).eq("is_published", true),
      supabase.from("categories").select("id", { count: "exact", head: true }),
    ])

    return {
      totalPresets:    total.count    ?? 0,
      freePresets:     free.count     ?? 0,
      totalCategories: cats.count     ?? 0,
      featuredPresets: featured.count ?? 0,
    }
  } catch {
    return { totalPresets: 0, freePresets: 0, totalCategories: 0, featuredPresets: 0 }
  }
}

/* ── Static data fallback filter ─────────────────────────── */

function filterStaticPresets(presets: Preset[], opts: PresetQueryOptions): Preset[] {
  let list = [...presets]

  if (opts.category === "Free") {
    list = list.filter((p) => p.isFree)
  } else if (opts.category && opts.category !== "All") {
    list = list.filter((p) => p.category === opts.category)
  }

  if (opts.featured) {
    list = list.filter((p) => p.isFeatured)
  }

  if (opts.search?.trim()) {
    const q = opts.search.toLowerCase()
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q)     ||
        p.tagline.toLowerCase().includes(q)  ||
        p.category.toLowerCase().includes(q) ||
        p.aiTags?.some((t) => t.includes(q))
    )
  }

  if (opts.limit) list = list.slice(opts.offset ?? 0, (opts.offset ?? 0) + opts.limit)

  return list
}

/* ── Slug generation helper ──────────────────────────────── */

export async function generateUniqueSlug(baseSlug: string): Promise<string> {
  if (!isSupabaseConfigured()) return baseSlug

  const { createAdminClient } = await import("@/lib/supabase/admin")
  const supabase = createAdminClient()

  let slug      = baseSlug
  let attempt   = 0

  while (attempt < 10) {
    const { data } = await supabase
      .from("presets")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()

    if (!data) return slug   // slug is available
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  return `${baseSlug}-${Date.now()}`
}
