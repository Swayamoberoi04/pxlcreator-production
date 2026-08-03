import { NextRequest }       from "next/server"
import { requireAdmin, getAdminSession } from "@/lib/admin/guard"
import { createAdminClient }             from "@/lib/supabase/admin"
import { audit }                         from "@/lib/admin/audit"

export const dynamic = "force-dynamic"

async function uniqueBundleSlug(base: string): Promise<string> {
  const supabase = createAdminClient()
  let slug = base, attempt = 0
  while (attempt < 10) {
    const { data } = await supabase.from("bundles").select("id").eq("slug", slug).maybeSingle()
    if (!data) return slug
    slug = `${base}-${++attempt}`
  }
  return `${base}-${Date.now()}`
}

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, ctx: RouteContext) {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id } = await ctx.params
  const supabase = createAdminClient()

  const { data: src, error: srcErr } = await supabase
    .from("bundles")
    .select("*")
    .eq("id", id)
    .single()

  if (srcErr || !src) {
    return Response.json({ success: false, error: "Bundle not found" }, { status: 404 })
  }

  const { data: bpRows } = await supabase
    .from("bundle_presets")
    .select("preset_id, order_index")
    .eq("bundle_id", id)

  const newSlug = await uniqueBundleSlug(`${src.slug}-copy`)

  const { data: copy, error: copyErr } = await supabase
    .from("bundles")
    .insert({
      name:                 `${src.name} (Copy)`,
      slug:                 newSlug,
      tagline:              src.tagline,
      description:          src.description,
      seo_title:            src.seo_title,
      seo_description:      src.seo_description,
      thumbnail_url:        src.thumbnail_url,
      banner_url:           src.banner_url,
      badge:                src.badge,
      display_order:        src.display_order,
      bundle_price_usd:     src.bundle_price_usd,
      compare_at_price_usd: src.compare_at_price_usd,
      download_url:         src.download_url,
      is_published:         false,
      is_featured:          false,
    })
    .select()
    .single()

  if (copyErr || !copy) {
    return Response.json({ success: false, error: copyErr?.message ?? "Insert failed" }, { status: 500 })
  }

  if (bpRows && bpRows.length > 0) {
    await supabase.from("bundle_presets").insert(
      bpRows.map((bp) => ({
        bundle_id:   copy.id,
        preset_id:   bp.preset_id,
        order_index: bp.order_index,
      }))
    )
  }

  const session = await getAdminSession()
  await audit({ event: "bundle.duplicated", email: session?.email, targetId: copy.id, meta: { sourceId: id } })

  return Response.json({ success: true, data: copy }, { status: 201 })
}
