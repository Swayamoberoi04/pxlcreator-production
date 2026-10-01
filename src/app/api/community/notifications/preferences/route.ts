/**
 * GET /api/community/notifications/preferences → { muted_types, available_types }
 * PUT /api/community/notifications/preferences   { muted_types: string[] }
 *
 * Phase 5.9. Muting a type stops new notifications of that type from being
 * created (checked in lib/community/notify.ts); it does not delete history.
 * channel_token lives on the same row but is never returned from here.
 *
 * Requires: Authorization: Bearer <firebase_id_token>
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { createAdminClient as typedAdmin } from "@/lib/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"

// community_notifications.dedupe_key/group_key and community_notification_prefs
// (migration 051) are newer than src/types/database.ts, so use the untyped client.
const createAdminClient = () => typedAdmin() as unknown as SupabaseClient
import { guardMutation } from "@/lib/community/guard"
import { MUTABLE_NOTIFICATION_TYPES } from "@/lib/community/notify"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const { data, error } = await createAdminClient()
    .from("community_notification_prefs")
    .select("muted_types")
    .eq("firebase_uid", uid)
    .maybeSingle()
  if (error) return NextResponse.json({ error: "Couldn't load preferences." }, { status: 500 })

  return NextResponse.json({ muted_types: data?.muted_types ?? [], available_types: MUTABLE_NOTIFICATION_TYPES })
}

export async function PUT(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  const limited = guardMutation(req, uid, "notif-prefs")
  if (limited) return limited

  const body = (await req.json().catch(() => null)) as { muted_types?: unknown } | null
  const muted = body?.muted_types
  const allowed = MUTABLE_NOTIFICATION_TYPES as readonly string[]
  if (!Array.isArray(muted) || muted.some((t) => typeof t !== "string" || !allowed.includes(t))) {
    return NextResponse.json({ error: `muted_types must be a subset of: ${allowed.join(", ")}.` }, { status: 400 })
  }

  const { error } = await createAdminClient()
    .from("community_notification_prefs")
    .upsert(
      { firebase_uid: uid, muted_types: [...new Set(muted as string[])], updated_at: new Date().toISOString() } as never,
      { onConflict: "firebase_uid" }
    )
  if (error) return NextResponse.json({ error: "Couldn't save preferences." }, { status: 500 })
  return NextResponse.json({ muted_types: [...new Set(muted as string[])] })
}
