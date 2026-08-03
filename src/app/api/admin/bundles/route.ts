/**
 * GET  /api/admin/bundles   — list all bundles (admin, includes unpublished)
 * POST /api/admin/bundles   — create a new bundle
 */

import type { NextRequest }  from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin, getAdminSession } from "@/lib/admin/guard"
import { audit }             from "@/lib/admin/audit"
import type { Database }     from "@/types/database"

type BundleInsert = Database["public"]["Tables"]["bundles"]["Insert"]

export const dynamic = "force-dynamic"

/* ── Inline slug helper (avoids importing server-only youtube/parser) ── */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

async function generateUniqueBundleSlug(
  supabase: ReturnType<typeof createAdminClient>,
  base: string,
): Promise<string> {
  const root = slugify(base)
  let   slug = root
  let   n    = 1

  while (true) {
    const { data } = await supabase
      .from("bundles")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()
    if (!data) return slug
    slug = `${root}-${n++}`
  }
}

/* ── GET ────────────────────────────────────────────────── */

export async function GET(request: NextRequest): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  try {
    const supabase = createAdminClient()
    const { searchParams } = request.nextUrl

    const search    = searchParams.get("search")    ?? ""
    const featured  = searchParams.get("featured")
    const published = searchParams.get("published")
    const presetId  = searchParams.get("preset_id") // filter: which bundles contain this preset

    // Fetch bundles with preset count via bundle_presets join
    let query = supabase
      .from("bundles")
      .select(`
        id, slug, title, tagline, thumbnail_url,
        price_usd, sale_price_usd, compare_at_price_usd, individual_value_usd,
        bundle_badge, is_featured, is_published, order_index,
        created_at, updated_at,
        bundle_presets(preset_id)
      `)
      .order("order_index", { ascending: true })

    if (search)            query = query.ilike("title", `%${search}%`)
    if (featured === "true") query = query.eq("is_featured", true)
    if (published !== undefined) query = query.eq("is_published", published === "true")

    const { data, error } = await query

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    // Shape: add preset_count and optionally mark containsPreset
    const bundles = (data ?? []).map((b) => {
      const presetIds = ((b.bundle_presets as unknown) as { preset_id: string }[] | null ?? []).map(
        (r) => r.preset_id,
      )
      return {
        ...b,
        bundle_presets: undefined,
        preset_count:   presetIds.length,
        contains_preset: presetId ? presetIds.includes(presetId) : undefined,
      }
    })

    return Response.json({ success: true, data: bundles })
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

    if (!body.title?.trim()) {
      return Response.json({ success: false, error: "Title is required." }, { status: 400 })
    }

    const priceUsd = Number(body.price_usd ?? 0)
    if (isNaN(priceUsd) || priceUsd < 0) {
      return Response.json({ success: false, error: "Bundle price must be ≥ 0." }, { status: 400 })
    }

    const supabase = createAdminClient()
    const baseSlug = body.slug?.trim() || slugify(body.title)
    const slug     = await generateUniqueBundleSlug(supabase, baseSlug)

    const { count } = await supabase
      .from("bundles")
      .select("id", { count: "exact", head: true })

    const insert: BundleInsert = {
      slug,
      title:                body.title.trim(),
      tagline:              body.tagline?.trim()           || null,
      description:          body.description?.trim()       || null,
      why_creators_love_it: body.why_creators_love_it?.trim() || null,
      thumbnail_url:        body.thumbnail_url             || null,
      price_usd:            priceUsd,
      sale_price_usd:       body.sale_price_usd != null ? Number(body.sale_price_usd) : null,
      compare_at_price_usd: body.compare_at_price_usd != null ? Number(body.compare_at_price_usd) : null,
      individual_value_usd: Number(body.individual_value_usd ?? 0),
      bundle_badge:         body.bundle_badge ?? "NEW",
      is_featured:          Boolean(body.is_featured ?? false),
      is_published:         Boolean(body.is_published ?? true),
      target_audience:      Array.isArray(body.target_audience) ? body.target_audience : [],
      use_cases:            Array.isArray(body.use_cases)       ? body.use_cases       : [],
      features:             Array.isArray(body.features)        ? body.features        : [],
      order_index:          count ?? 0,
    }

    const { data, error } = await supabase
      .from("bundles")
      .insert(insert)
      .select()
      .single()

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    const s = await getAdminSession()
    await audit({ event: "bundle.create", email: s?.email, targetId: data?.id, meta: { slug } })
    return Response.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return Response.json({ success: false, error: String(err) }, { status: 500 })
  }
}
