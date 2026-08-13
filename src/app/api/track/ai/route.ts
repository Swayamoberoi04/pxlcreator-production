import "server-only"
import type { NextRequest } from "next/server"
import { trackAiEvent }     from "@/lib/bi/track"
import { getClientIp }      from "@/lib/api/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VALID_EVENTS = new Set(["upload", "analyze", "analyze_failed", "cancelled"])

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json() as {
      eventType?:     string
      firebaseUid?:   string
      processingMs?:  number
      isError?:       boolean
      presetApplied?: string
    }

    if (!body.eventType || !VALID_EVENTS.has(body.eventType)) {
      return Response.json({ ok: false }, { status: 400 })
    }

    trackAiEvent({
      eventType:     body.eventType as "upload" | "analyze" | "analyze_failed" | "cancelled",
      firebaseUid:   body.firebaseUid   ?? null,
      processingMs:  body.processingMs  ?? null,
      isError:       body.isError       ?? false,
      presetApplied: body.presetApplied ?? null,
      ip:            getClientIp(req),
    })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 500 })
  }
}
