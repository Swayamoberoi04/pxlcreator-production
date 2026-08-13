import "server-only"
import type { NextRequest } from "next/server"
import { trackFunnelEvent } from "@/lib/bi/track"
import { getClientIp }      from "@/lib/api/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VALID_EVENTS = new Set([
  "view_preset", "view_bundle",
  "add_to_cart", "remove_from_cart",
  "checkout_open", "payment_attempted",
  "payment_success", "payment_failed",
  "download_completed",
])

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json() as {
      eventType?:    string
      sessionKey?:   string
      firebaseUid?:  string
      resourceId?:   string
      resourceType?: string
      orderId?:      string
    }

    if (!body.eventType || !VALID_EVENTS.has(body.eventType)) {
      return Response.json({ ok: false }, { status: 400 })
    }

    trackFunnelEvent({
      eventType:    body.eventType,
      sessionKey:   body.sessionKey   ?? null,
      firebaseUid:  body.firebaseUid  ?? null,
      resourceId:   body.resourceId   ?? null,
      resourceType: body.resourceType ?? null,
      orderId:      body.orderId      ?? null,
      ip:           getClientIp(req),
    })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 500 })
  }
}
