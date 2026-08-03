import { NextRequest }       from "next/server"
import { requireAdmin, getAdminSession } from "@/lib/admin/guard"
import { createAdminClient }             from "@/lib/supabase/admin"
import { audit }                         from "@/lib/admin/audit"
import type { Database }                 from "@/types/database"

type BundleUpdate = Database["public"]["Tables"]["bundles"]["Update"]

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

const BUNDLE_SELECT = `
  *,
  bundle_presets ( preset_id, order_index )
` as const

const PATCH_ALLOWLIST = new Set([
  "name", "slug", "tagline", "description", "seo_title", "seo_description",
  "thumbnail_url", "banner_url", "badge", "display_order",
  "bundle_price_usd", "compare_at_price_usd", "download_url",
  "is_published", "is_featured",
])

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id } = await ctx.params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("bundles")
    .select(BUNDLE_SELECT)
    .eq("id", id)
    .single()

  if (error) return Response.json({ success: false, error: error.message }, { status: 404 })
  return Response.json({ success: true, data })
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id }  = await ctx.params
  const body     = await req.json().catch(() => null)
  if (!body) return Response.json({ success: false, error: "Invalid body" }, { status: 400 })

  const supabase = createAdminClient()

  // Replace preset membership: delete existing, insert new
  if (Array.isArray(body.presetIds)) {
    await supabase.from("bundle_presets").delete().eq("bundle_id", id)
    if (body.presetIds.length > 0) {
      await supabase.from("bundle_presets").insert(
        body.presetIds.map((pid: string, i: number) => ({
          bundle_id:   id,
          preset_id:   pid,
          order_index: i,
        }))
      )
    }
  }

  const update: BundleUpdate = {}
  if ("name"             in body) update.name                 = body.name
  if ("slug"             in body) update.slug                 = body.slug
  if ("tagline"          in body) update.tagline              = body.tagline          ?? null
  if ("description"      in body) update.description          = body.description      ?? null
  if ("seoTitle"         in body) update.seo_title            = body.seoTitle         ?? null
  if ("seoDescription"   in body) update.seo_description      = body.seoDescription   ?? null
  if ("thumbnailUrl"     in body) update.thumbnail_url        = body.thumbnailUrl     ?? null
  if ("bannerUrl"        in body) update.banner_url           = body.bannerUrl        ?? null
  if ("badge"            in body) update.badge                = body.badge            ?? null
  if ("displayOrder"     in body) update.display_order        = body.displayOrder
  if ("bundlePriceUsd"   in body) update.bundle_price_usd    = body.bundlePriceUsd
  if ("compareAtPriceUsd" in body) update.compare_at_price_usd = body.compareAtPriceUsd ?? null
  if ("downloadUrl"      in body) update.download_url         = body.downloadUrl      ?? null
  if ("isPublished"      in body) update.is_published         = body.isPublished
  if ("isFeatured"       in body) update.is_featured          = body.isFeatured

  const { data, error } = await supabase
    .from("bundles")
    .update(update)
    .eq("id", id)
    .select(BUNDLE_SELECT)
    .single()

  if (error) return Response.json({ success: false, error: error.message }, { status: 500 })

  const session = await getAdminSession()
  await audit({ event: "bundle.updated", email: session?.email, targetId: id })

  return Response.json({ success: true, data })
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id }  = await ctx.params
  const body     = await req.json().catch(() => null)
  if (!body) return Response.json({ success: false, error: "Invalid body" }, { status: 400 })

  const patch: BundleUpdate = {}
  for (const [k, v] of Object.entries(body)) {
    if (PATCH_ALLOWLIST.has(k)) (patch as Record<string, unknown>)[k] = v
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ success: false, error: "No patchable fields" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("bundles")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error) return Response.json({ success: false, error: error.message }, { status: 500 })

  const session = await getAdminSession()
  await audit({ event: "bundle.patched", email: session?.email, targetId: id, meta: patch })

  return Response.json({ success: true, data })
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id } = await ctx.params
  const supabase = createAdminClient()

  const { error } = await supabase.from("bundles").delete().eq("id", id)
  if (error) return Response.json({ success: false, error: error.message }, { status: 500 })

  const session = await getAdminSession()
  await audit({ event: "bundle.deleted", email: session?.email, targetId: id })

  return Response.json({ success: true })
}
