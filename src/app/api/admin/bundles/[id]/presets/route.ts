/**
 * GET   /api/admin/bundles/[id]/presets — list presets in this bundle (ordered)
 * PUT   /api/admin/bundles/[id]/presets — replace the full preset list (from bundle editor)
 * PATCH /api/admin/bundles/[id]/presets — add or remove a single preset (from preset editor)
 */

import type { NextRequest }  from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin, getAdminSession } from "@/lib/admin/guard"
import { audit }             from "@/lib/admin/audit"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

/* ── GET ─────────────────────────────────────────────────── */

export async function GET(_req: NextRequest, { params }: RouteContext): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id } = await params
  const supabase = createAdminClient()

  const { data: bpRows, error } = await supabase
    .from("bundle_presets")
    .select("preset_id, order_index")
    .eq("bundle_id", id)
    .order("order_index", { ascending: true })

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }

  const presetIds = (bpRows ?? []).map((r) => r.preset_id)
  if (presetIds.length === 0) {
    return Response.json({ success: true, data: [] })
  }

  const { data: presets } = await supabase
    .from("presets")
    .select("id, slug, title, price, thumbnail_url, is_published")
    .in("id", presetIds)

  const byId = new Map((presets ?? []).map((p) => [p.id, p]))
  const ordered = (bpRows ?? [])
    .map((r, i) => ({ ...(byId.get(r.preset_id) ?? {}), order_index: i }))
    .filter((p) => "id" in p)

  return Response.json({ success: true, data: ordered })
}

/* ── PUT — replace full preset list ────────────────────── */

export async function PUT(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id }  = await params
  const body    = await request.json()

  if (!Array.isArray(body.preset_ids)) {
    return Response.json({ success: false, error: "preset_ids array is required." }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Atomic replace: delete all then re-insert in order
  const { error: delErr } = await supabase
    .from("bundle_presets")
    .delete()
    .eq("bundle_id", id)

  if (delErr) {
    return Response.json({ success: false, error: delErr.message }, { status: 500 })
  }

  const presetIds: string[] = body.preset_ids
  if (presetIds.length > 0) {
    const rows = presetIds.map((pid, i) => ({
      bundle_id:   id,
      preset_id:   pid,
      order_index: i,
    }))

    const { error: insErr } = await supabase.from("bundle_presets").insert(rows)
    if (insErr) {
      return Response.json({ success: false, error: insErr.message }, { status: 500 })
    }
  }

  // Recompute individual_value_usd from preset prices
  if (presetIds.length > 0) {
    const { data: presets } = await supabase
      .from("presets")
      .select("price")
      .in("id", presetIds)

    const total = (presets ?? []).reduce((s, p) => s + (p.price ?? 0), 0)
    await supabase
      .from("bundles")
      .update({ individual_value_usd: Math.round(total * 100) / 100 })
      .eq("id", id)
  } else {
    await supabase
      .from("bundles")
      .update({ individual_value_usd: 0 })
      .eq("id", id)
  }

  const s = await getAdminSession()
  await audit({ event: "bundle.presets_updated", email: s?.email, targetId: id, meta: { count: presetIds.length } })
  return Response.json({ success: true })
}

/* ── PATCH — add or remove a single preset ──────────────── */

export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id }  = await params
  const body    = await request.json()
  const { action, preset_id } = body as { action?: string; preset_id?: string }

  if (!preset_id || (action !== "add" && action !== "remove")) {
    return Response.json(
      { success: false, error: "action ('add'|'remove') and preset_id are required." },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  if (action === "remove") {
    const { error } = await supabase
      .from("bundle_presets")
      .delete()
      .eq("bundle_id", id)
      .eq("preset_id", preset_id)

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }
  } else {
    // Find next order_index
    const { data: existing } = await supabase
      .from("bundle_presets")
      .select("order_index")
      .eq("bundle_id", id)
      .order("order_index", { ascending: false })
      .limit(1)

    const nextIdx = existing?.[0]?.order_index != null ? existing[0].order_index + 1 : 0

    const { error } = await supabase
      .from("bundle_presets")
      .upsert({ bundle_id: id, preset_id, order_index: nextIdx })

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }
  }

  // Recompute individual_value_usd
  const { data: bpRows } = await supabase
    .from("bundle_presets")
    .select("preset_id")
    .eq("bundle_id", id)

  const pids = (bpRows ?? []).map((r) => r.preset_id)
  if (pids.length > 0) {
    const { data: presets } = await supabase
      .from("presets")
      .select("price")
      .in("id", pids)
    const total = (presets ?? []).reduce((s, p) => s + (p.price ?? 0), 0)
    await supabase
      .from("bundles")
      .update({ individual_value_usd: Math.round(total * 100) / 100 })
      .eq("id", id)
  } else {
    await supabase.from("bundles").update({ individual_value_usd: 0 }).eq("id", id)
  }

  return Response.json({ success: true })
}
