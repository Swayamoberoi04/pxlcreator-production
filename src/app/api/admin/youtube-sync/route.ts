/**
 * POST /api/admin/youtube-sync
 *
 * Crawls the configured YouTube channel, finds videos not yet in
 * Supabase, parses their metadata, and inserts them as published presets.
 *
 * Returns: { inserted, skipped, total, errors? }
 *
 * GET /api/admin/youtube-sync
 * Returns how many channel videos are already imported.
 */

import { createAdminClient }          from "@/lib/supabase/admin"
import { fetchAllChannelVideoIds, fetchVideoBatch } from "@/lib/youtube/api"
import { parseYouTubePreset, slugify } from "@/lib/youtube/parser"
import { generateUniqueSlug }         from "@/lib/presets/repository"
import { requireAdmin }               from "@/lib/admin/guard"
import type { Database }              from "@/types/database"

type PresetInsert = Database["public"]["Tables"]["presets"]["Insert"]

export const dynamic = "force-dynamic"

/* ── POST — run sync ────────────────────────────────────── */

export async function POST(): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const channelId = process.env.YOUTUBE_CHANNEL_ID
  if (!channelId) {
    return Response.json(
      { success: false, error: "YOUTUBE_CHANNEL_ID is not set in .env.local" },
      { status: 500 }
    )
  }
  if (!process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY.startsWith("your-")) {
    return Response.json(
      { success: false, error: "YOUTUBE_API_KEY is not configured. Add it to .env.local." },
      { status: 500 }
    )
  }

  try {
    const supabase = createAdminClient()

    /* 1. Get all video IDs from the channel */
    const channelVideoIds = await fetchAllChannelVideoIds(channelId)

    /* 2. Find which are already imported */
    const { data: existing } = await supabase
      .from("presets")
      .select("youtube_video_id")
      .not("youtube_video_id", "is", null)

    const existingIds = new Set((existing ?? []).map((r) => r.youtube_video_id!))
    const newVideoIds = channelVideoIds.filter((id) => !existingIds.has(id))

    if (newVideoIds.length === 0) {
      return Response.json({
        success: true,
        inserted: 0,
        skipped:  channelVideoIds.length,
        total:    channelVideoIds.length,
        message:  "All channel videos are already imported.",
      })
    }

    /* 3. Batch-fetch full metadata for new videos only */
    const videoDetails = await fetchVideoBatch(newVideoIds)

    /* 4. Load categories for slug→id mapping */
    const { data: cats } = await supabase
      .from("categories")
      .select("id, slug")
      .order("order_index")

    const catBySlug: Record<string, string> = {}
    for (const cat of cats ?? []) catBySlug[cat.slug] = cat.id

    /* 5. Current max order_index (new presets append after existing) */
    const { count: currentCount } = await supabase
      .from("presets")
      .select("id", { count: "exact", head: true })

    let orderIndex = currentCount ?? 0
    let inserted   = 0
    const errors: string[] = []

    /* 6. Parse and insert each new video */
    for (const video of videoDetails) {
      try {
        const parsed     = parseYouTubePreset(video)
        const slug       = await generateUniqueSlug(slugify(parsed.title))
        const categoryId = catBySlug[parsed.categorySlug] ?? null

        const row: PresetInsert = {
          slug,
          title:              parsed.title,
          tagline:            parsed.tagline      || null,
          description:        parsed.description  || null,
          category_id:        categoryId,
          thumbnail_url:      parsed.thumbnailUrl || null,
          youtube_video_id:   parsed.youtubeVideoId,
          youtube_url:        parsed.youtubeUrl,
          youtube_channel_id: channelId,
          youtube_raw_title:  video.title,
          youtube_raw_desc:   video.description,
          youtube_published:  video.publishedAt,
          youtube_thumbnail:  parsed.thumbnailUrl || null,
          price:              0,
          original_price:     null,
          is_free:            false,   // admin sets price later
          is_featured:        false,
          is_published:       true,    // live immediately
          badge:              null,
          download_url:       parsed.downloadUrl || null,
          preset_type:        parsed.presetType,
          mood:               parsed.mood || null,
          tone:               parsed.tone || null,
          features:           parsed.features,
          compatibility:      ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
          ai_tags:            parsed.aiTags,
          rating:             5.0,
          review_count:       0,
          order_index:        orderIndex++,
        }

        const { error } = await supabase.from("presets").insert(row)
        if (error) {
          errors.push(`"${parsed.title}": ${error.message}`)
        } else {
          inserted++
        }
      } catch (err) {
        errors.push(`"${video.title}": ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return Response.json({
      success:  true,
      inserted,
      skipped:  channelVideoIds.length - newVideoIds.length,
      total:    channelVideoIds.length,
      errors:   errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    return Response.json({ success: false, error: String(err) }, { status: 500 })
  }
}

/* ── GET — sync status ──────────────────────────────────── */

export async function GET(): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const channelId = process.env.YOUTUBE_CHANNEL_ID

  try {
    const supabase = createAdminClient()

    const { count: importedCount } = await supabase
      .from("presets")
      .select("id", { count: "exact", head: true })
      .eq("youtube_channel_id", channelId ?? "")

    return Response.json({
      success:       true,
      channelId:     channelId ?? null,
      importedCount: importedCount ?? 0,
      apiKeySet:     !!process.env.YOUTUBE_API_KEY && !process.env.YOUTUBE_API_KEY.startsWith("your-"),
    })
  } catch (err) {
    return Response.json({ success: false, error: String(err) }, { status: 500 })
  }
}
