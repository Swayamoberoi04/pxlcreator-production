/**
 * PATCH  /api/admin/media/[id] — rename / move folder / update alt text (replace)
 * DELETE /api/admin/media/[id] — delete
 */

import type { NextRequest }  from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePermission } from "@/lib/admin/permissions"
import { getAdminSession }   from "@/lib/admin/guard"
import { audit }             from "@/lib/admin/audit"
import { deleteMedia, MEDIA_FOLDERS } from "@/lib/admin/storage"
import type { Database }     from "@/types/database"

type AssetUpdate = Database["public"]["Tables"]["storage_assets"]["Update"]

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const deny = await requirePermission("media:upload")
  if (deny) return deny

  const { id } = await params
  const body    = await request.json()
  const supabase = createAdminClient()

  const patch: AssetUpdate = {}
  if (typeof body.altText === "string") patch.alt_text = body.altText
  if (typeof body.folder === "string") {
    if (!MEDIA_FOLDERS.includes(body.folder)) {
      return Response.json({ success: false, error: "Invalid folder." }, { status: 400 })
    }
    patch.folder = body.folder
  }

  const { data, error } = await supabase
    .from("storage_assets")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }

  const session = await getAdminSession()
  await audit({ event: "media.update", email: session?.email, targetId: id, meta: { fields: Object.keys(patch) } })
  return Response.json({ success: true, data })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext): Promise<Response> {
  const deny = await requirePermission("media:delete")
  if (deny) return deny

  const { id } = await params

  try {
    await deleteMedia(id)
  } catch (e) {
    return Response.json(
      { success: false, error: e instanceof Error ? e.message : "Delete failed." },
      { status: 500 }
    )
  }

  const session = await getAdminSession()
  await audit({ event: "media.delete", email: session?.email, targetId: id })
  return Response.json({ success: true })
}
