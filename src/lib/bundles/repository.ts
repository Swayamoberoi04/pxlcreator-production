import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { BundleWithPresets, Bundle } from "@/types/bundle"

function mapRow(row: Record<string, unknown>): Bundle {
  return {
    id:                 row.id as string,
    name:               row.name as string,
    slug:               row.slug as string,
    tagline:            (row.tagline as string | null) ?? null,
    description:        (row.description as string | null) ?? null,
    seoTitle:           (row.seo_title as string | null) ?? null,
    seoDescription:     (row.seo_description as string | null) ?? null,
    thumbnailUrl:       (row.thumbnail_url as string | null) ?? null,
    bannerUrl:          (row.banner_url as string | null) ?? null,
    badge:              (row.badge as string | null) ?? null,
    displayOrder:       row.display_order as number,
    bundlePriceUsd:     row.bundle_price_usd as number,
    compareAtPriceUsd:  (row.compare_at_price_usd as number | null) ?? null,
    downloadUrl:        (row.download_url as string | null) ?? null,
    isPublished:        row.is_published as boolean,
    isFeatured:         row.is_featured as boolean,
    createdAt:          row.created_at as string,
    updatedAt:          row.updated_at as string,
  }
}

function mapWithPresets(row: Record<string, unknown>): BundleWithPresets {
  const bundle  = mapRow(row)
  const rawRows = (row.bundle_presets as Array<Record<string, unknown>>) ?? []
  const presets = rawRows
    .sort((a, b) => (a.order_index as number) - (b.order_index as number))
    .map((bp) => {
      const p = bp.presets as Record<string, unknown>
      return {
        presetId:    p.id as string,
        orderIndex:  bp.order_index as number,
        name:        p.name as string,
        slug:        p.slug as string,
        thumbnailUrl: (p.thumbnail_url as string | null) ?? null,
        priceUsd:    (p.price_usd as number) ?? 0,
        category:    (p.category as string | null) ?? null,
      }
    })
  const totalValue = presets.reduce((s, p) => s + p.priceUsd, 0)
  return {
    ...bundle,
    presets,
    presetCount: presets.length,
    totalValue,
    savings: Math.max(0, totalValue - bundle.bundlePriceUsd),
  }
}

const BUNDLE_SELECT = `
  *,
  bundle_presets (
    order_index,
    presets ( id, name, slug, thumbnail_url, price_usd, category )
  )
` as const

export async function getBundles(): Promise<BundleWithPresets[]> {
  const supabase = await createServerSupabaseClient()

  // Fetch bundles
  const { data: bundles, error } = await supabase
    .from("bundles")
    .select("*")
    .eq("is_published", true)
    .order("display_order", { ascending: true })
  if (error || !bundles) return []

  // Fetch preset links separately (avoids RLS join issues)
  const bundleIds = bundles.map((b) => b.id as string)
  const { data: bpRows } = await supabase
    .from("bundle_presets")
    .select("bundle_id, order_index, preset_id")
    .in("bundle_id", bundleIds)

  const presetIds = [...new Set((bpRows ?? []).map((r) => r.preset_id as string))]
  type PresetRow = { id: string; name: string; slug: string; thumbnail_url: string | null; price_usd: number }
  const { data: presetRows } = presetIds.length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await (supabase.from("presets") as any).select("id, name, slug, thumbnail_url, price_usd").in("id", presetIds) as { data: PresetRow[] | null }
    : { data: [] as PresetRow[] }

  return bundles.map((b) => {
    const row = b as Record<string, unknown>
    const bundle = mapRow(row)
    const myBps = (bpRows ?? [])
      .filter((r) => r.bundle_id === b.id)
      .sort((a, b) => (a.order_index as number) - (b.order_index as number))
    const presets = myBps.map((bp) => {
      const p = (presetRows ?? []).find((pr) => pr.id === bp.preset_id)
      return {
        presetId:    bp.preset_id as string,
        orderIndex:  bp.order_index as number,
        name:        p?.name ?? "",
        slug:        p?.slug ?? "",
        thumbnailUrl: p?.thumbnail_url ?? null,
        priceUsd:    p?.price_usd ?? 0,
        category:    null,
      }
    })
    const totalValue = presets.reduce((s, p) => s + p.priceUsd, 0)
    return { ...bundle, presets, presetCount: presets.length, totalValue, savings: Math.max(0, totalValue - bundle.bundlePriceUsd) }
  })
}

export async function getFeaturedBundles(limit = 4): Promise<BundleWithPresets[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("bundles")
    .select(BUNDLE_SELECT)
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("display_order", { ascending: true })
    .limit(limit)
  if (error || !data) return []
  return data.map((r) => mapWithPresets(r as unknown as Record<string, unknown>))
}

export async function getBundleBySlug(slug: string): Promise<BundleWithPresets | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("bundles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single()
  if (error || !data) return null

  const bundle = mapRow(data as Record<string, unknown>)

  const { data: bpRows } = await supabase
    .from("bundle_presets")
    .select("order_index, preset_id")
    .eq("bundle_id", bundle.id)

  const presetIds = (bpRows ?? []).map((r) => r.preset_id as string)
  type PresetRow2 = { id: string; name: string; slug: string; thumbnail_url: string | null; price_usd: number }
  const { data: presetRows } = presetIds.length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await (supabase.from("presets") as any).select("id, name, slug, thumbnail_url, price_usd").in("id", presetIds) as { data: PresetRow2[] | null }
    : { data: [] as PresetRow2[] }

  const presets = (bpRows ?? [])
    .sort((a, b) => (a.order_index as number) - (b.order_index as number))
    .map((bp) => {
      const p = (presetRows ?? []).find((pr) => pr.id === bp.preset_id)
      return {
        presetId:    bp.preset_id as string,
        orderIndex:  bp.order_index as number,
        name:        p?.name ?? "",
        slug:        p?.slug ?? "",
        thumbnailUrl: p?.thumbnail_url ?? null,
        priceUsd:    p?.price_usd ?? 0,
        category:    null,
      }
    })

  const totalValue = presets.reduce((s, p) => s + p.priceUsd, 0)
  return { ...bundle, presets, presetCount: presets.length, totalValue, savings: Math.max(0, totalValue - bundle.bundlePriceUsd) }
}
