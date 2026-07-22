/**
 * src/lib/presets/adapter.ts
 *
 * Converts Supabase database rows into the existing Preset interface.
 * This keeps all existing frontend components working unchanged.
 *
 * PresetWithRelations (DB) ──► Preset (frontend type)
 */

import type { Preset, PresetCategory } from "@/types/product"
import type { PresetWithRelations }     from "@/types/database"

/**
 * Map a fully-joined Supabase preset row to the frontend Preset type.
 */
export function adaptPreset(row: PresetWithRelations): Preset {
  return {
    id:            row.id,
    slug:          row.slug,
    name:          row.title,
    tagline:       row.tagline        ?? "",
    description:   row.description   ?? undefined,
    price:         Number(row.price),
    originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    category:      (row.category?.name ?? "Cinematic") as PresetCategory,
    rating:        row.review_count > 0 ? Number(row.rating) : undefined,
    reviewCount:   row.review_count > 0 ? row.review_count : undefined,
    badge:         row.badge          ?? undefined,
    isFeatured:    row.is_featured,
    isFree:        row.is_free,

    /* Public download counter (social proof). download_count predates the
       generated Database row type, so read it defensively. */
    downloadCount: Number((row as unknown as Record<string, unknown>).download_count ?? 0),

    /* ── Media ── */
    thumbnailUrl:  row.thumbnail_url  ?? undefined,
    images:        row.images
      .sort((a, b) => a.order_index - b.order_index)
      .map((img) => img.url),
    beforeUrl:     row.before_url     ?? undefined,
    afterUrl:      row.after_url      ?? undefined,

    /* ── Detail page ── */
    features:        row.features,
    compatibility:   row.compatibility,
    includeCount:    row.include_count ?? undefined,
    downloadFileName: row.download_file_name ?? undefined,

    /* ── AI Studio ── */
    aiTags:  row.ai_tags,

    /* ── Unlock system ── */
    youtubeVideoTitle: (row as unknown as Record<string, unknown>).youtube_video_title as string | null ?? null,

    /* ── Conversion & pricing metadata (static-data only; not in DB) ── */
    /* conversionTag and priceTier are set in src/data/presets.ts for the
       static catalogue. DB-sourced presets won't have these fields, which
       is intentional — they're only used for the static fallback display. */
  }
}

/**
 * Adapt an array of rows.
 */
export function adaptPresets(rows: PresetWithRelations[]): Preset[] {
  return rows.map(adaptPreset)
}
