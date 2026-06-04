/**
 * POST /api/behavior
 *
 * Records a user behavior event (view, download, favorite, click).
 * Used to improve personalized recommendations over time.
 *
 * Body: { event_type, resource_id, resource_type, source?, metadata? }
 */

import { NextRequest, NextResponse }  from "next/server"
import { createAdminClient }          from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest }  from "@/lib/account/auth"

export const runtime = "nodejs"

const VALID_EVENTS = ["view_preset", "download_preset", "favorite_preset", "apply_preset", "purchase", "click_rec", "search", "view_course", "view_challenge"] as const
type EventType = typeof VALID_EVENTS[number]

export async function POST(req: NextRequest): Promise<NextResponse> {
  const uid = await getFirebaseUidFromRequest(req)
  // Behavior tracking is best-effort — don't block on missing auth
  if (!uid) return NextResponse.json({ ok: false })

  let body: { event_type: EventType; resource_id?: string; resource_type?: string; source?: string; metadata?: Record<string, unknown> }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }) }

  if (!VALID_EVENTS.includes(body.event_type)) return NextResponse.json({ ok: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = createAdminClient()

  try {
    // Log to user_behavior table
    await db.from("user_behavior").insert({
      firebase_uid:  uid,
      event_type:    body.event_type,
      resource_id:   body.resource_id ?? null,
      resource_type: body.resource_type ?? null,
      metadata:      { source: body.source ?? "unknown", ...body.metadata },
    })

    // Also log to preset_interactions for preset-specific events
    if (body.resource_id && (
      body.event_type === "view_preset" ||
      body.event_type === "download_preset" ||
      body.event_type === "favorite_preset" ||
      body.event_type === "apply_preset" ||
      body.event_type === "purchase"
    )) {
      const actionMap: Record<string, string> = {
        view_preset: "view", download_preset: "download",
        favorite_preset: "favorite", apply_preset: "apply", purchase: "purchase",
      }
      await db.from("preset_interactions").insert({
        firebase_uid: uid,
        preset_id:    body.resource_id,
        action:       actionMap[body.event_type],
        source:       body.source ?? null,
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    // Silently fail — behavior tracking must never break the user experience
    return NextResponse.json({ ok: false })
  }
}
