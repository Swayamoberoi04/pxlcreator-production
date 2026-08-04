import { createAdminClient } from "@/lib/supabase/admin"
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

type PresetRow = { id: string; title: string; slug: string; thumbnail_url: string | null; price: number }

async function fetchPresetsForBundleIds(
  supabase: ReturnType<typeof createAdminClient>,
  bundleIds: string[],
) {
  if (bundleIds.length === 0) return { bpRows: [], presetRows: [] }

  const { data: bpRows } = await supabase
    .from("bundle_presets")
    .select("bundle_id, order_index, preset_id")
    .in("bundle_id", bundleIds)

  const presetIds = [...new Set((bpRows ?? []).map((r) => r.preset_id as string))]
  if (presetIds.length === 0) return { bpRows: bpRows ?? [], presetRows: [] as PresetRow[] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: presetRows } = await (supabase.from("presets") as any)
    .select("id, title, slug, thumbnail_url, price")
    .in("id", presetIds) as { data: PresetRow[] | null }

  return { bpRows: bpRows ?? [], presetRows: presetRows ?? [] }
}

function buildPresets(
  bpRows: Array<{ bundle_id?: string; preset_id: string; order_index: number }>,
  presetRows: PresetRow[],
  bundleId?: string,
) {
  const rows = bundleId ? bpRows.filter((r) => (r as { bundle_id: string }).bundle_id === bundleId) : bpRows
  return rows
    .sort((a, b) => a.order_index - b.order_index)
    .map((bp) => {
      const p = presetRows.find((pr) => pr.id === bp.preset_id)
      return {
        presetId:     bp.preset_id,
        orderIndex:   bp.order_index,
        name:         p?.title ?? "",
        slug:         p?.slug ?? "",
        thumbnailUrl: p?.thumbnail_url ?? null,
        priceUsd:     p?.price ?? 0,
        category:     null,
      }
    })
}

export async function getBundles(): Promise<BundleWithPresets[]> {
  const supabase = createAdminClient()
  console.log("[getBundles] starting query")

  const { data: bundles, error } = await supabase
    .from("bundles")
    .select("*")
    .eq("is_published", true)
    .order("display_order", { ascending: true })

  console.log("[getBundles] bundles:", JSON.stringify(bundles))
  console.log("[getBundles] error:", JSON.stringify(error))
  console.log("[getBundles] count:", bundles?.length)

  if (error || !bundles || bundles.length === 0) return []

  const bundleIds = bundles.map((b) => b.id as string)
  const { bpRows, presetRows } = await fetchPresetsForBundleIds(supabase, bundleIds)

  return bundles.map((b) => {
    const bundle = mapRow(b as Record<string, unknown>)
    const presets = buildPresets(
      bpRows as Array<{ bundle_id: string; preset_id: string; order_index: number }>,
      presetRows,
      bundle.id,
    )
    const totalValue = presets.reduce((s, p) => s + p.priceUsd, 0)
    return { ...bundle, presets, presetCount: presets.length, totalValue, savings: Math.max(0, totalValue - bundle.bundlePriceUsd) }
  })
}

export async function getFeaturedBundles(limit = 4): Promise<BundleWithPresets[]> {
  const supabase = createAdminClient()

  const { data: bundles, error } = await supabase
    .from("bundles")
    .select("*")
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("display_order", { ascending: true })
    .limit(limit)

  if (error || !bundles || bundles.length === 0) return []

  const bundleIds = bundles.map((b) => b.id as string)
  const { bpRows, presetRows } = await fetchPresetsForBundleIds(supabase, bundleIds)

  return bundles.map((b) => {
    const bundle = mapRow(b as Record<string, unknown>)
    const presets = buildPresets(
      bpRows as Array<{ bundle_id: string; preset_id: string; order_index: number }>,
      presetRows,
      bundle.id,
    )
    const totalValue = presets.reduce((s, p) => s + p.priceUsd, 0)
    return { ...bundle, presets, presetCount: presets.length, totalValue, savings: Math.max(0, totalValue - bundle.bundlePriceUsd) }
  })
}

export async function getBundleBySlug(slug: string): Promise<BundleWithPresets | null> {
  const supabase = createAdminClient()

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
  let presetRows: PresetRow[] = []
  if (presetIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows } = await (supabase.from("presets") as any)
      .select("id, title, slug, thumbnail_url, price")
      .in("id", presetIds) as { data: PresetRow[] | null }
    presetRows = rows ?? []
  }

  const presets = buildPresets(
    (bpRows ?? []) as Array<{ preset_id: string; order_index: number }>,
    presetRows,
  )

  const totalValue = presets.reduce((s, p) => s + p.priceUsd, 0)
  return { ...bundle, presets, presetCount: presets.length, totalValue, savings: Math.max(0, totalValue - bundle.bundlePriceUsd) }
}
