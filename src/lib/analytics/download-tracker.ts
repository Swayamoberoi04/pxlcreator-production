/**
 * src/lib/analytics/download-tracker.ts
 *
 * The ONE server-side entry point for counting a genuine preset download.
 *
 * Called from the download API routes at the exact moment a download URL
 * is successfully served — never on views, clicks, password attempts,
 * checkout, or any failure. Everything (dedup, event ledger, counter
 * bump) happens atomically inside the record_preset_download RPC
 * (migration 021); this module just gathers request context and calls it.
 *
 * Fire-and-forget by contract: a tracking failure must NEVER delay or
 * break the actual download. Callers do `void recordDownload(...)`.
 */

import { createHash } from "node:crypto"
import type { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { APP_VERSION } from "@/lib/version"

/** Duplicate downloads by the same actor+preset inside this window don't re-count. */
const COOLDOWN_SECONDS = 10 * 60   // 10 minutes

export interface RecordDownloadInput {
  /** DB preset id when known; else null and we resolve from slug */
  presetId?:   string | null
  presetSlug:  string
  type:        "free" | "paid"
  /** Firebase uid when authenticated */
  uid?:        string | null
  request:     NextRequest
  /** Paid: order id / download-token id for audit trail */
  orderReference?: string | null
}

export async function recordDownload(input: RecordDownloadInput): Promise<{ counted: boolean } | null> {
  try {
    const supabase = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient

    /* Resolve preset id from slug when the caller didn't supply it
       (the unified /api/preset/download path works off a static registry
       and may not carry the DB id). */
    let presetId = input.presetId ?? null
    if (!presetId && input.presetSlug) {
      const { data } = await supabase
        .from("presets").select("id").eq("slug", input.presetSlug).maybeSingle()
      presetId = (data?.id as string | undefined) ?? null
    }

    const actor    = input.uid ? "user" : "anonymous"
    const ipHash   = hashIp(clientIp(input.request))
    /* Dedup identity: a signed-in user is tracked by uid, an anonymous
       visitor by hashed IP — so the same person re-clicking download in
       the same session is suppressed regardless of login state. */
    const identity = input.uid ? `u:${input.uid}` : `a:${ipHash}`
    const dedupKey = `${identity}:${input.presetSlug}`

    const { data, error } = await supabase.rpc("record_preset_download", {
      p_preset_id:        presetId,
      p_preset_slug:      input.presetSlug,
      p_type:             input.type,
      p_actor:            actor,
      p_uid:              input.uid ?? null,
      p_ip_hash:          ipHash,
      p_dedup_key:        dedupKey,
      p_cooldown_seconds: COOLDOWN_SECONDS,
      p_country:          input.request.headers.get("x-vercel-ip-country") ?? null,
      p_version:          APP_VERSION,
      p_device:           deviceClass(input.request.headers.get("user-agent") ?? ""),
      p_referrer:         sanitizeReferrer(input.request.headers.get("referer")),
      p_order_reference:  input.orderReference ?? null,
    })

    if (error) {
      console.error(`[downloads] record_preset_download failed:`, error.message)
      return null
    }
    const row = Array.isArray(data) ? data[0] : data
    const counted = Boolean(row?.counted)
    console.log(`[downloads] ${JSON.stringify({ event: "download_recorded", presetSlug: input.presetSlug, type: input.type, actor, counted })}`)
    return { counted }
  } catch (err) {
    console.error(`[downloads] recordDownload threw:`, err instanceof Error ? err.message : err)
    return null
  }
}

/* ─────────────────────────────────────────────────────────────
   Request context helpers
───────────────────────────────────────────────────────────── */

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  return req.headers.get("x-real-ip") ?? "0.0.0.0"
}

function hashIp(ip: string): string {
  const salt = process.env.ADMIN_SECRET_KEY ?? "pxl-download-salt"
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24)
}

function deviceClass(ua: string): string {
  const s = ua.toLowerCase()
  if (/ipad|tablet|playbook|silk/.test(s)) return "tablet"
  if (/mobi|iphone|android.*mobile|phone/.test(s)) return "mobile"
  return "desktop"
}

/** Keep only the referrer origin+path, drop query/fragment (no PII leakage). */
function sanitizeReferrer(ref: string | null): string | null {
  if (!ref) return null
  try {
    const u = new URL(ref)
    return `${u.origin}${u.pathname}`.slice(0, 200)
  } catch {
    return null
  }
}
