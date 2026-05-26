/**
 * PATCH /api/admin/presets/bulk-price
 *
 * Updates price (and is_free) for all presets in each specified category.
 *
 * Body: { updates: { category_id: string | null; price: number; is_free: boolean }[] }
 * Returns: { success, updated, errors? }
 */

import type { NextRequest }  from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin }      from "@/lib/admin/guard"

export const dynamic = "force-dynamic"

export async function PATCH(request: NextRequest): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  try {
    const body = await request.json()
    const updates: { category_id: string | null; price: number; is_free: boolean }[] =
      body.updates ?? []

    if (!Array.isArray(updates) || updates.length === 0) {
      return Response.json({ success: false, error: "No updates provided." }, { status: 400 })
    }

    // Validate every entry before touching the database
    for (let i = 0; i < updates.length; i++) {
      const { price, is_free } = updates[i]
      const p = Number(price)
      if (isNaN(p) || p < 0 || p > 100_000) {
        return Response.json(
          { success: false, error: `Entry ${i}: price must be between 0 and 100000.` },
          { status: 400 }
        )
      }
      if (typeof is_free !== "boolean") {
        return Response.json(
          { success: false, error: `Entry ${i}: is_free must be a boolean.` },
          { status: 400 }
        )
      }
    }

    const supabase = createAdminClient()
    let updated    = 0
    const errors: string[] = []

    for (const { category_id, price, is_free } of updates) {
      const { error, count } =
        category_id === null
          ? await supabase
              .from("presets")
              .update({ price, is_free }, { count: "exact" })
              .is("category_id", null)
          : await supabase
              .from("presets")
              .update({ price, is_free }, { count: "exact" })
              .eq("category_id", category_id)

      if (error) {
        errors.push(`category ${category_id ?? "uncategorized"}: ${error.message}`)
      } else {
        updated += count ?? 0
      }
    }

    return Response.json({
      success: true,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    return Response.json({ success: false, error: String(err) }, { status: 500 })
  }
}

/* ── GET — return categories with preset counts + real DB state ── */

export async function GET(): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  try {
    const supabase = createAdminClient()

    const [{ data: cats }, { data: presets }] = await Promise.all([
      supabase.from("categories").select("id, name, slug").order("order_index"),
      supabase.from("presets").select("id, category_id, price, is_free"),
    ])

    // Per-category: count, first non-zero price found, actual is_free majority
    const countByCat:  Record<string, number>  = {}
    const priceByCat:  Record<string, number>  = {}   // first non-zero price
    const isFreeByCat: Record<string, boolean> = {}   // majority is_free value
    const isFreeVotes: Record<string, { free: number; paid: number }> = {}

    for (const p of presets ?? []) {
      const key = p.category_id ?? "__none__"
      countByCat[key] = (countByCat[key] ?? 0) + 1
      if (p.price > 0 && priceByCat[key] == null) priceByCat[key] = p.price
      if (!isFreeVotes[key]) isFreeVotes[key] = { free: 0, paid: 0 }
      if (p.is_free) isFreeVotes[key].free++; else isFreeVotes[key].paid++
    }
    for (const [key, votes] of Object.entries(isFreeVotes)) {
      isFreeByCat[key] = votes.free >= votes.paid
    }

    const categories = (cats ?? []).map((c) => ({
      id:            c.id,
      name:          c.name,
      slug:          c.slug,
      presetCount:   countByCat[c.id]  ?? 0,
      currentPrice:  priceByCat[c.id]  ?? 0,
      currentIsFree: isFreeByCat[c.id] ?? false,
    }))

    const uncatKey = "__none__"
    return Response.json({
      success:              true,
      categories,
      uncategorizedCount:   countByCat[uncatKey]  ?? 0,
      uncategorizedPrice:   priceByCat[uncatKey]  ?? 0,
      uncategorizedIsFree:  isFreeByCat[uncatKey] ?? false,
    })
  } catch (err) {
    return Response.json({ success: false, error: String(err) }, { status: 500 })
  }
}
