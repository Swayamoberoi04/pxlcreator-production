/**
 * GET    /api/admin/bundles/[id]  — fetch single bundle with preset list
 * PUT    /api/admin/bundles/[id]  — update bundle fields
 * DELETE /api/admin/bundles/[id]  — delete bundle (presets are NOT deleted)
 */

import type { NextRequest }  from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin, getAdminSession } from "@/lib/admin/guard"
import { audit }             from "@/lib/admin/audit"
import type { Database }     from "@/types/database"

type BundleUpdate = Database["public"]["Tables"]["bundles"]["Update"]
type RouteContext  = { params: Promise<{ id: string }> }

export const dynamic = "force-dynamic"

/* ── GET ────────────────────────────────────────────────── */

export async function GET(_req: NextRequest, { params }: RouteContext): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id } = await params
  const supabase = createAdminClient()

  const { data: bundle, error } = await supabase
    .from("bundles")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !bundle) {
    return Response.json({ success: false, error: "Bundle not found." }, { status: 404 })
  }

  // Fetch ordered presets in this bundle
  const { data: bpRows } = await supabase
    .from("bundle_presets")
    .select("preset_id, order_index")
    .eq("bundle_id", id)
    .order("order_index", { ascending: true })

  const presetIds = (bpRows ?? []).map((r) => r.preset_id)

  let presets: unknown[] = []
  if (presetIds.length > 0) {
    const { data: presetRows } = await supabase
      .from("presets")
      .select("id, slug, title, price, thumbnail_url, is_published, is_featured")
      .in("id", presetIds)

    // Re-order to match bundle order
    const byId = new Map((presetRows ?? []).map((p) => [p.id, p]))
    presets = (bpRows ?? [])
      .map((r) => byId.get(r.preset_id))
      .filter(Boolean)
      .map((p, i) => ({ ...(p as object), order_index: i }))
  }

  return Response.json({ success: true, data: { bundle, presets } })
}

/* ── PUT ────────────────────────────────────────────────── */

export async function PUT(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id }  = await params
  const body    = await request.json()
  const supabase = createAdminClient()

  const update: BundleUpdate = {}

  const FIELDS: (keyof BundleUpdate)[] = [
    "slug", "title", "tagline", "description", "why_creators_love_it",
    "thumbnail_url", "price_usd", "sale_price_usd", "compare_at_price_usd",
    "individual_value_usd", "bundle_badge", "is_featured", "is_published",
    "target_audience", "use_cases", "features", "order_index",
  ]

  for (const f of FIELDS) {
    if (body[f] !== undefined) {
      (update as Record<string, unknown>)[f] = body[f]
    }
  }

  const { data, error } = await supabase
    .from("bundles")
    .update(update)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }

  const s = await getAdminSession()
  await audit({ event: "bundle.update", email: s?.email, targetId: id, meta: { fields: Object.keys(update) } })
  return Response.json({ success: true, data })
}

/* ── DELETE ─────────────────────────────────────────────── */

export async function DELETE(_req: NextRequest, { params }: RouteContext): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id }  = await params
  const supabase = createAdminClient()

  // bundle_presets rows cascade-delete automatically (FK ON DELETE CASCADE).
  // Presets themselves are NOT touched.
  const { error } = await supabase.from("bundles").delete().eq("id", id)

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }

  const s = await getAdminSession()
  await audit({ event: "bundle.delete", outcome: "success", email: s?.email, targetId: id })
  return Response.json({ success: true })
}
