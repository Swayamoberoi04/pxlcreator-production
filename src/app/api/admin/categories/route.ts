/**
 * GET  /api/admin/categories  — list all categories
 * POST /api/admin/categories  — create a new category
 */

import type { NextRequest }  from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { slugify }           from "@/lib/youtube/parser"
import { requireAdmin }      from "@/lib/admin/guard"
import type { Database }     from "@/types/database"

type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"]

export const dynamic = "force-dynamic"

export async function GET(): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("categories")
      .select("*, preset_count:presets(count)")
      .order("order_index")

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, data: data ?? [] })
  } catch (err) {
    return Response.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  try {
    const body = await request.json()

    if (!body.name?.trim()) {
      return Response.json({ success: false, error: "Category name is required." }, { status: 400 })
    }
    if (body.name.trim().length > 100) {
      return Response.json({ success: false, error: "Category name must be 100 characters or fewer." }, { status: 400 })
    }

    const supabase = createAdminClient()
    const slug = body.slug?.trim() || slugify(body.name)

    const insertData: CategoryInsert = {
      name:        body.name.trim(),
      slug,
      description: body.description || null,
      icon:        body.icon        || null,
      color:       body.color       || null,
      order_index: body.order_index ?? 99,
    }

    const { data, error } = await supabase
      .from("categories")
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return Response.json({ success: false, error: String(err) }, { status: 500 })
  }
}
