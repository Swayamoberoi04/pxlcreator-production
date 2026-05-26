/**
 * GET  /api/admin/messages   — list feedback messages (paginated, filterable)
 * PATCH /api/admin/messages  — mark message as read / archived
 *
 * Query params (GET):
 *   page     number  default 1
 *   limit    number  default 20 (max 100)
 *   unread   boolean  if "true", only return is_read=false
 *   archived boolean  if "true", return archived messages (default: exclude archived)
 *   q        string   search name / email / message (case-insensitive)
 *
 * PATCH body:
 *   id        string  required
 *   is_read?  boolean
 *   is_archived? boolean
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient }         from "@/lib/supabase/admin"
import { requireAdmin }              from "@/lib/admin/guard"
import { log }                       from "@/lib/api/logger"

export const dynamic = "force-dynamic"

/* ── GET ────────────────────────────────────────────────────────────── */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny as NextResponse

  const { searchParams } = req.nextUrl
  const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10))
  const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))
  const unread   = searchParams.get("unread")   === "true"
  const archived = searchParams.get("archived") === "true"
  const q        = searchParams.get("q")?.trim() ?? ""

  const supabase = createAdminClient()

  let query = supabase
    .from("feedback_messages")
    .select("id, name, email, subject, message, firebase_uid, is_read, is_archived, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (unread)   query = query.eq("is_read", false)
  if (!archived) query = query.eq("is_archived", false)
  else           query = query.eq("is_archived", true)

  if (q) {
    // Supabase ilike — partial match on name, email, or message
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,message.ilike.%${q}%`)
  }

  const { data, count, error } = await query

  if (error) {
    log.error("admin/messages", "Failed to fetch messages", { error: error.message })
    return NextResponse.json({ error: "Failed to fetch messages." }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data:    data ?? [],
    total:   count ?? 0,
    page,
    limit,
    pages:   Math.ceil((count ?? 0) / limit),
  })
}

/* ── PATCH ──────────────────────────────────────────────────────────── */

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const deny = await requireAdmin()
  if (deny) return deny as NextResponse

  let body: { id?: string; is_read?: boolean; is_archived?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { id, is_read, is_archived } = body

  if (!id?.trim()) {
    return NextResponse.json({ error: "Message id is required." }, { status: 400 })
  }

  type FeedbackUpdate = { is_read?: boolean; is_archived?: boolean }
  const updates: FeedbackUpdate = {}
  if (typeof is_read     === "boolean") updates.is_read     = is_read
  if (typeof is_archived === "boolean") updates.is_archived = is_archived

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("feedback_messages")
    .update(updates)
    .eq("id", id.trim())

  if (error) {
    log.error("admin/messages", "Failed to update message", { error: error.message, id })
    return NextResponse.json({ error: "Failed to update message." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
