/**
 * POST /api/community/report
 *
 * Report a post, comment, showcase, profile, channel, project, event or
 * resource. This is the public submission path into the moderation queue at
 * /admin/community/reports — which existed since migration 012 but had NO way
 * for a user to actually file a report. It has been an empty queue by
 * construction until now.
 *
 * Body: { target_type, target_id, reason, details? }
 *
 * Privacy: reporter_uid is stored but never returned by any public endpoint,
 * never shown to the reported party, and never included in a response here
 * beyond confirming the caller's own submission.
 *
 * Abuse prevention:
 *   • auth required — no anonymous reporting
 *   • unique(reporter_uid, target_type, target_id) — one report per person
 *     per target; re-reporting returns the existing report rather than
 *     stacking the queue
 *   • rate limited per IP
 *   • self-reporting refused
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
import { Validator } from "@/lib/api/validate"

export const runtime = "nodejs"

const limiter = makeRateLimiter({ max: 15, windowMs: 60 * 60 * 1000 })

const TARGET_TYPES = ["post", "comment", "showcase", "profile", "channel", "project", "event", "resource"] as const

const REASONS = [
  "spam",
  "harassment",
  "hate_speech",
  "sexual_content",
  "violence",
  "misinformation",
  "impersonation",
  "stolen_work",
  "other",
] as const

/** Which table owns each target type, and which column identifies its author. */
const TARGET_TABLES: Record<string, { table: string; ownerField: string | null; idField: string }> = {
  post:     { table: "channel_posts",     ownerField: "author_uid",   idField: "id" },
  comment:  { table: "post_comments",     ownerField: "author_uid",   idField: "id" },
  showcase: { table: "showcase_items",    ownerField: "author_uid",   idField: "id" },
  profile:  { table: "community_profiles", ownerField: "firebase_uid", idField: "firebase_uid" },
  channel:  { table: "community_channels", ownerField: "owner_uid",   idField: "id" },
  project:  { table: "project_listings",  ownerField: "poster_uid",   idField: "id" },
  event:    { table: "community_events",  ownerField: "organiser_uid", idField: "id" },
  resource: { table: "creator_resources", ownerField: null,           idField: "id" },
}

export async function POST(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: "Too many reports. Try again later." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const v = new Validator(body)
  v.required("target_type").oneOf("target_type", [...TARGET_TYPES])
  v.required("target_id")
  v.required("reason").oneOf("reason", [...REASONS])
  if (body.details !== undefined) v.maxLen("details", 1000)
  if (v.hasErrors()) {
    return NextResponse.json({ errors: v.errors() }, { status: 400 })
  }

  const { target_type, target_id, reason, details } = body as {
    target_type: string; target_id: string; reason: string; details?: string
  }

  try {
    const supabase = createAdminClient()
    const spec = TARGET_TABLES[target_type]

    // The target must actually exist — a report against nothing just pollutes
    // the queue.
    const selectFields = spec.ownerField ? `${spec.idField}, ${spec.ownerField}` : spec.idField
    const { data: target } = await supabase
      .from(spec.table)
      .select(selectFields)
      .eq(spec.idField, target_id)
      .maybeSingle()

    if (!target) {
      return NextResponse.json({ error: "That content no longer exists." }, { status: 404 })
    }

    if (spec.ownerField) {
      const ownerUid = (target as Record<string, unknown>)[spec.ownerField]
      if (ownerUid === uid) {
        return NextResponse.json({ error: "You can't report your own content." }, { status: 400 })
      }
    }

    const { data: report, error: insertError } = await supabase
      .from("content_reports")
      .insert({
        reporter_uid: uid,
        target_type,
        target_id,
        reason,
        details: details ?? null,
        status: "pending",
      })
      .select("id, status, created_at")
      .single()

    if (insertError) {
      // 23505 = the unique index from migration 048: this person already
      // reported this target. Treat as success — the report is on file.
      if (insertError.code === "23505") {
        return NextResponse.json({ reported: true, already_reported: true })
      }
      console.error("[community/report POST] insert", insertError)
      return NextResponse.json({ error: "Failed to submit report." }, { status: 500 })
    }

    // Deliberately returns nothing about who else reported this, how many
    // reports it has, or any moderator state.
    return NextResponse.json(
      { reported: true, already_reported: false, report_id: report.id },
      { status: 201 }
    )
  } catch (err) {
    console.error("[community/report POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
