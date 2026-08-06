/**
 * GET  /api/admin/media?folder=&q=&page=&pageSize= — list media assets
 * POST /api/admin/media                            — upload (multipart/form-data)
 *
 * Body for POST: FormData { file: File, folder: string, altText?: string }
 */

import type { NextRequest }  from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePermission } from "@/lib/admin/permissions"
import { getAdminSession }   from "@/lib/admin/guard"
import { audit }             from "@/lib/admin/audit"
import { validateUpload }    from "@/lib/admin/validation"
import { uploadMedia, MEDIA_FOLDERS } from "@/lib/admin/storage"

export const dynamic = "force-dynamic"

/* ── GET ────────────────────────────────────────────────── */

export async function GET(request: NextRequest): Promise<Response> {
  const deny = await requirePermission("media:read")
  if (deny) return deny

  const { searchParams } = new URL(request.url)
  const folder   = searchParams.get("folder") ?? ""
  const q        = searchParams.get("q") ?? ""
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "48", 10) || 48))

  const supabase = createAdminClient()
  let query = supabase
    .from("storage_assets")
    .select("*", { count: "exact" })
    .eq("bucket", "media")
    .order("created_at", { ascending: false })

  if (folder && folder !== "all") query = query.eq("folder", folder)
  if (q) query = query.ilike("file_name", `%${q}%`)

  const from = (page - 1) * pageSize
  const { data, error, count } = await query.range(from, from + pageSize - 1)

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }

  return Response.json({
    success: true,
    data,
    meta: { page, pageSize, total: count ?? 0, folders: MEDIA_FOLDERS },
  })
}

/* ── POST (upload) ──────────────────────────────────────── */

export async function POST(request: NextRequest): Promise<Response> {
  const deny = await requirePermission("media:upload")
  if (deny) return deny

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ success: false, error: "Expected multipart/form-data." }, { status: 400 })
  }

  const file    = form.get("file")
  const folder  = String(form.get("folder") ?? "general")
  const altText = form.get("altText") ? String(form.get("altText")) : undefined

  if (!(file instanceof File)) {
    return Response.json({ success: false, error: "Missing file." }, { status: 400 })
  }
  if (!MEDIA_FOLDERS.includes(folder as (typeof MEDIA_FOLDERS)[number])) {
    return Response.json({ success: false, error: `Invalid folder. Must be one of: ${MEDIA_FOLDERS.join(", ")}.` }, { status: 400 })
  }

  const check = validateUpload({ type: file.type, size: file.size, name: file.name })
  if (!check.ok) {
    return Response.json({ success: false, error: check.error }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { asset } = await uploadMedia({
      buffer,
      fileName: file.name,
      mimeType: file.type,
      folder,
      altText,
    })

    const session = await getAdminSession()
    await audit({
      event: "media.upload",
      email: session?.email,
      targetId: asset.id,
      meta: { folder, fileName: file.name, size: buffer.byteLength },
    })

    return Response.json({ success: true, data: asset }, { status: 201 })
  } catch (e) {
    return Response.json(
      { success: false, error: e instanceof Error ? e.message : "Upload failed." },
      { status: 500 }
    )
  }
}
