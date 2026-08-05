/**
 * GET  /api/admin/presets/[id]/password — fetch password + metadata
 * PUT  /api/admin/presets/[id]/password — set/update password
 *
 * Security rules:
 *  - Admin session required for both verbs.
 *  - The raw password is returned to the admin UI (they need to see it
 *    in order to share it in the YouTube video). It is NEVER sent to
 *    public endpoints.
 *  - unlock_password is excluded from all public preset API responses.
 */

import type { NextRequest }          from "next/server"
import { createAdminClient }         from "@/lib/supabase/admin"
import { requireAdmin, getAdminSession } from "@/lib/admin/guard"
import { audit }                     from "@/lib/admin/audit"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

/* Shape returned to the admin UI. */
interface PasswordMeta {
  unlock_password:      string | null
  password_updated_at:  string | null
  password_updated_by:  string | null
  unlock_count:         number
}

/* ── GET ─────────────────────────────────────────────────── */

export async function GET(_req: NextRequest, { params }: RouteContext): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id }   = await params
  const supabase = createAdminClient()

  /* Fetch password + metadata */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: preset, error } = await (supabase as any)
    .from("presets")
    .select("id, unlock_password, password_updated_at, password_updated_by")
    .eq("id", id)
    .maybeSingle()

  if (error || !preset) {
    return Response.json({ success: false, error: "Preset not found." }, { status: 404 })
  }

  /* Count successful password unlocks for this preset */
  const { count } = await supabase
    .from("user_unlocks")
    .select("id", { count: "exact", head: true })
    .eq("preset_id", id)
    .eq("unlock_method", "password")

  const meta: PasswordMeta = {
    unlock_password:     preset.unlock_password     ?? null,
    password_updated_at: preset.password_updated_at ?? null,
    password_updated_by: preset.password_updated_by ?? null,
    unlock_count:        count ?? 0,
  }

  return Response.json({ success: true, data: meta })
}

/* ── PUT ─────────────────────────────────────────────────── */

export async function PUT(req: NextRequest, { params }: RouteContext): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const { id } = await params

  let password: string
  try {
    const body = await req.json()
    password   = typeof body?.password === "string" ? body.password.trim() : ""
  } catch {
    return Response.json({ success: false, error: "Invalid request body." }, { status: 400 })
  }

  /* Validation */
  if (!password) {
    return Response.json({ success: false, error: "Password cannot be empty." }, { status: 400 })
  }
  if (password.length > 128) {
    return Response.json({ success: false, error: "Password too long (max 128 chars)." }, { status: 400 })
  }

  const session  = await getAdminSession()
  const supabase = createAdminClient()

  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("presets")
    .update({
      unlock_password:     password,
      password_updated_at: now,
      password_updated_by: session?.email ?? "admin",
    })
    .eq("id", id)

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }

  await audit({
    event:    "preset.password.updated",
    email:    session?.email,
    targetId: id,
    meta:     { password_length: password.length, generated: password.startsWith("PXL-") },
  })

  return Response.json({
    success: true,
    data: {
      password_updated_at: now,
      password_updated_by: session?.email ?? "admin",
    },
  })
}
