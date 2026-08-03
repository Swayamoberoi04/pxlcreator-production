import { NextRequest }       from "next/server"
import { requireAdmin, getAdminSession } from "@/lib/admin/guard"
import { createAdminClient }             from "@/lib/supabase/admin"
import { audit }                         from "@/lib/admin/audit"
import { slugify }                       from "@/lib/youtube/parser"

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

const BUNDLE_SELECT = `
  *,
  bundle_presets ( preset_id, order_index )
` as const

export async function GET() {
  const deny = await requireAdmin()
  if (deny) return deny

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("bundles")
    .select(BUNDLE_SELECT)
    .order("display_order", { ascending: true })

  if (error) return Response.json({ success: false, error: error.message }, { status: 500 })
  return Response.json({ success: true, data })
}

export async function POST(req: NextRequest) {
  const deny = await requireAdmin()
  if (deny) return deny

  const body = await req.json().catch(() => null)
  if (!body?.name) {
    return Response.json({ success: false, error: "name is required" }, { status: 400 })
  }

  const supabase  = createAdminClient()
  const baseSlug  = body.slug ? slugify(body.slug) : slugify(body.name)
  const slug      = await uniqueBundleSlug(baseSlug)

  const { data, error } = await supabase
    .from("bundles")
    .insert({
      name:                 body.name,
      slug,
      tagline:              body.tagline              ?? null,
      description:          body.description          ?? null,
      seo_title:            body.seoTitle             ?? null,
      seo_description:      body.seoDescription       ?? null,
      thumbnail_url:        body.thumbnailUrl          ?? null,
      banner_url:           body.bannerUrl             ?? null,
      badge:                body.badge                ?? null,
      display_order:        body.displayOrder          ?? 0,
      bundle_price_usd:     body.bundlePriceUsd        ?? 0,
      compare_at_price_usd: body.compareAtPriceUsd     ?? null,
      download_url:         body.downloadUrl           ?? null,
      is_published:         body.isPublished           ?? false,
      is_featured:          body.isFeatured            ?? false,
    })
    .select()
    .single()

  if (error) return Response.json({ success: false, error: error.message }, { status: 500 })

  const session = await getAdminSession()
  await audit({ event: "bundle.created", email: session?.email, targetId: data.id, meta: { name: data.name } })

  return Response.json({ success: true, data }, { status: 201 })
}
