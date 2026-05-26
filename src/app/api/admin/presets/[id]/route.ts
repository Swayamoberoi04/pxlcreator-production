/**
 * GET    /api/admin/presets/[id]  — fetch single preset (admin, includes unpublished)
 * PUT    /api/admin/presets/[id]  — update preset
 * DELETE /api/admin/presets/[id]  — delete preset
 * PATCH  /api/admin/presets/[id]  — partial update (e.g. toggle published/featured)
 */

import type { NextRequest }  from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin }      from "@/lib/admin/guard"
import type { Database }     from "@/types/database"

type PresetUpdate     = Database["public"]["Tables"]["presets"]["Update"]
type PresetImageInsert = Database["public"]["Tables"]["preset_images"]["Insert"]

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

/* ── GET ────────────────────────────────────────────────── */

export async function GET(_req: NextRequest, { params }: RouteContext): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("presets")
    .select(`
      *,
      category:categories!category_id(id, name, slug),
      images:preset_images(id, url, alt_text, order_index)
    `)
    .eq("id", id)
    .single()

  if (error || !data) {
    return Response.json({ success: false, error: "Preset not found." }, { status: 404 })
  }

  return Response.json({ success: true, data })
}

/* ── PUT ────────────────────────────────────────────────── */

export async function PUT(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id }  = await params
  const body    = await request.json()

  // Validate price if being updated
  if (body.price !== undefined) {
    const p = Number(body.price)
    if (isNaN(p) || p < 0 || p > 100_000) {
      return Response.json({ success: false, error: "Price must be between 0 and 100000." }, { status: 400 })
    }
  }

  const supabase = createAdminClient()

  // Build update payload (only include explicitly provided fields)
  const update: PresetUpdate = {}
  const fieldMap: Record<string, string> = {
    title:           "title",
    tagline:         "tagline",
    description:     "description",
    category_id:     "category_id",
    thumbnail_url:   "thumbnail_url",
    before_url:      "before_url",
    after_url:       "after_url",
    youtube_video_id:"youtube_video_id",
    youtube_url:     "youtube_url",
    download_url:    "download_url",
    download_file_name: "download_file_name",
    price:           "price",
    original_price:  "original_price",
    is_free:         "is_free",
    is_featured:     "is_featured",
    is_published:    "is_published",
    badge:           "badge",
    include_count:   "include_count",
    preset_type:     "preset_type",
    mood:            "mood",
    tone:            "tone",
    features:        "features",
    compatibility:   "compatibility",
    ai_tags:         "ai_tags",
    rating:          "rating",
    review_count:    "review_count",
    order_index:     "order_index",
  }

  for (const [bodyKey, dbKey] of Object.entries(fieldMap)) {
    if (body[bodyKey] !== undefined) {
      (update as Record<string, unknown>)[dbKey] = body[bodyKey]
    }
  }

  const { data, error } = await supabase
    .from("presets")
    .update(update)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }

  // Update images if provided
  if (Array.isArray(body.images)) {
    // Delete existing, re-insert
    await supabase.from("preset_images").delete().eq("preset_id", id)
    if (body.images.length > 0) {
      const imageRows: PresetImageInsert[] = body.images.map((url: string, i: number) => ({
        preset_id:   id,
        url,
        order_index: i,
      }))
      await supabase.from("preset_images").insert(imageRows)
    }
  }

  return Response.json({ success: true, data })
}

/* ── PATCH ──────────────────────────────────────────────── */

export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id }  = await params
  const body    = await request.json()
  const supabase = createAdminClient()

  const patch: PresetUpdate = body as PresetUpdate

  const { data, error } = await supabase
    .from("presets")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }

  return Response.json({ success: true, data })
}

/* ── DELETE ─────────────────────────────────────────────── */

export async function DELETE(_req: NextRequest, { params }: RouteContext): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id }  = await params
  const supabase = createAdminClient()

  const { error } = await supabase.from("presets").delete().eq("id", id)

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
