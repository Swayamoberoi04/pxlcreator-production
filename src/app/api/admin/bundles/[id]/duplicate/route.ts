/**
 * POST /api/admin/bundles/[id]/duplicate — duplicate a bundle
 * Creates an identical bundle with a new slug ("<slug>-copy") and is_published=false.
 * Also duplicates the bundle_presets list.
 */

import type { NextRequest }  from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin, getAdminSession } from "@/lib/admin/guard"
import { audit }             from "@/lib/admin/audit"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")
}

async function uniqueSlug(supabase: ReturnType<typeof createAdminClient>, base: string): Promise<string> {
  let slug = base
  let n    = 1
  while (true) {
    const { data } = await supabase.from("bundles").select("id").eq("slug", slug).maybeSingle()
    if (!data) return slug
    slug = `${base}-${n++}`
  }
}

export async function POST(_req: NextRequest, { params }: RouteContext): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id } = await params
  const supabase = createAdminClient()

  // Fetch source bundle
  const { data: src, error } = await supabase
    .from("bundles")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !src) {
    return Response.json({ success: false, error: "Bundle not found." }, { status: 404 })
  }

  // Fetch preset list
  const { data: bpRows } = await supabase
    .from("bundle_presets")
    .select("preset_id, order_index")
    .eq("bundle_id", id)
    .order("order_index", { ascending: true })

  // Build new slug
  const baseSlug = slugify(`${src.slug}-copy`)
  const newSlug  = await uniqueSlug(supabase, baseSlug)

  const { data: newBundle, error: insErr } = await supabase
    .from("bundles")
    .insert({
      slug:                 newSlug,
      title:                `${src.title} (Copy)`,
      tagline:              src.tagline,
      description:          src.description,
      why_creators_love_it: src.why_creators_love_it,
      thumbnail_url:        src.thumbnail_url,
      price_usd:            src.price_usd,
      sale_price_usd:       src.sale_price_usd,
      compare_at_price_usd: src.compare_at_price_usd,
      individual_value_usd: src.individual_value_usd,
      bundle_badge:         src.bundle_badge,
      is_featured:          false,
      is_published:         false, // duplicates start unpublished
      target_audience:      src.target_audience,
      use_cases:            src.use_cases,
      features:             src.features,
      order_index:          (src.order_index ?? 0) + 1,
    })
    .select()
    .single()

  if (insErr || !newBundle) {
    return Response.json({ success: false, error: insErr?.message ?? "Insert failed." }, { status: 500 })
  }

  // Clone preset list
  if (bpRows && bpRows.length > 0) {
    await supabase.from("bundle_presets").insert(
      bpRows.map((r) => ({
        bundle_id:   newBundle.id,
        preset_id:   r.preset_id,
        order_index: r.order_index,
      })),
    )
  }

  const s = await getAdminSession()
  await audit({ event: "bundle.duplicate", email: s?.email, targetId: newBundle.id, meta: { from: id } })
  return Response.json({ success: true, data: newBundle }, { status: 201 })
}
