/**
 * POST /api/community/waitlist
 *
 * Public, unauthenticated: joins an email to a feature waitlist.
 *
 * Phase 5.8: this endpoint has never worked. It upserts into
 * `community_waitlist`, a table no migration ever created, so every
 * submission threw PGRST205 and returned 500 — confirmed against production.
 * The table is created in migration 050.
 *
 * Because it is the only unauthenticated write in the community surface, it
 * is also the only one an anonymous client can flood. It now enforces:
 *   • a per-IP rate limit
 *   • length caps on every field
 *   • a closed set of feature keys, so `feature` can't be used to write
 *     arbitrary strings into the table
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient }         from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { createLogger }              from "@/lib/observability/logger"
import { increment }                 from "@/lib/observability/metrics"

export const runtime = "nodejs"

const log = createLogger("community/waitlist")
const limiter = makeRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 })

/** Feature keys the UI actually offers. Anything else is rejected. */
const FEATURES = ["general", "channels", "teams", "spaces", "events", "collab"] as const

const MAX_EMAIL = 254   // RFC 5321 maximum
const MAX_NAME  = 120

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (limiter.check(getClientIp(req))) {
    return NextResponse.json(
      { error: "Too many signups from this network. Please try again later." },
      { status: 429 }
    )
  }

  let body: { name?: string; email?: string; feature?: string }
  try {
    body = await req.json() as typeof body
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const email   = (body.email ?? "").trim().toLowerCase()
  const name    = (body.name  ?? "").trim()
  const feature = (body.feature ?? "general").trim()

  if (!email || email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 })
  }
  if (name.length > MAX_NAME) {
    return NextResponse.json({ error: `Name must be ${MAX_NAME} characters or fewer.` }, { status: 400 })
  }
  if (!FEATURES.includes(feature as typeof FEATURES[number])) {
    return NextResponse.json({ error: "Unknown waitlist." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Upsert so re-submitting the same address for the same feature is
    // idempotent rather than an error the user has to interpret.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("community_waitlist")
      .upsert(
        { email, name: name || null, feature, joined_at: new Date().toISOString() },
        { onConflict: "email,feature" }
      )

    if (error) {
      // Deliberately does not log the email address — this endpoint's whole
      // payload is personal data, and a failure is diagnosable without it.
      log.error("waitlist_upsert_failed", { feature, code: error.code, message: error.message })
      increment("community.write_failed")
      return NextResponse.json({ error: "Couldn't join the waitlist. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    log.error("waitlist_unexpected", { feature, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: "Couldn't join the waitlist. Please try again." }, { status: 500 })
  }
}
