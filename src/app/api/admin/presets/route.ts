/**
 * GET  /api/admin/presets   — list all presets (including unpublished)
 * POST /api/admin/presets   — create a new preset
 */

import type { NextRequest }  from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateUniqueSlug } from "@/lib/presets/repository"
import { slugify }           from "@/lib/youtube/parser"
import { requireAdmin, getAdminSession } from "@/lib/admin/guard"
import { audit }             from "@/lib/admin/audit"
import type { Database }     from "@/types/database"

type PresetInsert    = Database["public"]["Tables"]["presets"]["Insert"]
type PresetImageInsert = Database["public"]["Tables"]["preset_images"]["Insert"]

export const dynamic = "force-dynamic"

/* ── GET ────────────────────────────────────────────────── */

export async function GET(request: NextRequest): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  try {
    const supabase = createAdminClient()
    const { searchParams } = request.nextUrl
    const search = searchParams.get("search") ?? ""

    let query = supabase
      .from("presets")
      .select(`
        id, slug, title, tagline, price, is_free, is_featured,
        is_published, badge, rating, review_count, order_index,
        thumbnail_url, youtube_video_id, created_at, updated_at,
        category:categories!category_id(id, name, slug)
      `)
      .order("order_index", { ascending: true })

    if (search) {
      query = query.ilike("title", `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, data: data ?? [] })
  } catch (err) {
    return Response.json({ success: false, error: String(err) }, { status: 500 })
  }
}

/* ── POST ───────────────────────────────────────────────── */

export async function POST(request: NextRequest): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.title?.trim()) {
      return Response.json({ success: false, error: "Title is required." }, { status: 400 })
    }
    const price = Number(body.price ?? 0)
    if (isNaN(price) || price < 0 || price > 100_000) {
      return Response.json({ success: false, error: "Price must be between 0 and 100000." }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Generate a unique slug
    const baseSlug = body.slug?.trim() || slugify(body.title)
    const slug     = await generateUniqueSlug(baseSlug)

    // Resolve category_id from slug if provided
    let categoryId = body.category_id ?? null
    if (!categoryId && body.categorySlug) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", body.categorySlug)
        .single()
      categoryId = cat?.id ?? null
    }

    // Determine order_index (append to end)
    const countResult = await supabase
      .from("presets")
      .select("id", { count: "exact", head: true })
    const orderIndex = countResult.count ?? 0

    const insertData: PresetInsert = {
      slug,
      title:              body.title.trim(),
      tagline:            body.tagline?.trim()     || null,
      description:        body.description?.trim() || null,
      category_id:        categoryId,
      thumbnail_url:      body.thumbnailUrl        || body.youtube_thumbnail || null,
      before_url:         body.beforeUrl           || null,
      after_url:          body.afterUrl            || null,
      youtube_video_id:   body.youtubeVideoId      || null,
      youtube_url:        body.youtubeUrl          || null,
      youtube_channel_id: body.channelId           || null,
      youtube_raw_title:  body.rawTitle            || null,
      youtube_raw_desc:   body.rawDesc             || null,
      youtube_published:  body.publishedAt         || null,
      youtube_thumbnail:  body.thumbnailUrl        || null,
      price:              Number(body.price ?? 0),
      original_price:     body.originalPrice ? Number(body.originalPrice) : null,
      is_free:            Boolean(body.isFree ?? body.price === 0),
      is_featured:        body.isFeatured  ?? false,
      is_published:       body.isPublished ?? true,
      badge:              body.badge       || null,
      download_url:       body.downloadUrl || null,
      download_file_name: body.downloadFileName || null,
      include_count:      body.includeCount ? Number(body.includeCount) : null,
      preset_type:        body.presetType   || "lightroom",
      mood:               body.mood         || null,
      tone:               body.tone         || null,
      features:           Array.isArray(body.features)       ? body.features       : [],
      compatibility:      Array.isArray(body.compatibility)  ? body.compatibility  : ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
      ai_tags:            Array.isArray(body.aiTags)         ? body.aiTags         : [],
      rating:             Number(body.rating        ?? 5.0),
      review_count:       Number(body.reviewCount   ?? 0),
      order_index:        orderIndex,
    }

    const { data, error } = await supabase
      .from("presets")
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    // Insert gallery images if provided
    if (Array.isArray(body.images) && body.images.length > 0) {
      const imageRows: PresetImageInsert[] = body.images.map((url: string, i: number) => ({
        preset_id:   data.id,
        url,
        alt_text:    `${body.title} — sample ${i + 1}`,
        order_index: i,
      }))
      await supabase.from("preset_images").insert(imageRows)
    }

    const s = await getAdminSession()
    await audit({ event: "preset.create", email: s?.email, targetId: data?.id, meta: { slug } })
    return Response.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return Response.json({ success: false, error: String(err) }, { status: 500 })
  }
}
