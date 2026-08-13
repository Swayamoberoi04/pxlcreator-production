/**
 * Fire-and-forget BI event tracking helpers.
 * Used from API routes — never awaited on the hot path.
 * Failures are silently logged and never bubble to the caller.
 */

import { createClient } from "@supabase/supabase-js"
import crypto           from "node:crypto"

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16)
}

export function trackSearch(opts: {
  query:        string
  resultCount:  number
  source?:      string
  ip?:          string | null
  device?:      string | null
}) {
  const { query, resultCount, source = "preset_grid", ip, device } = opts
  void adminDb()
    .from("search_events")
    .insert({
      query:        query.slice(0, 200),
      result_count: resultCount,
      source,
      ip_hash:      hashIp(ip ?? null),
      device:       device ?? null,
    })
    .then(({ error }) => {
      if (error) console.warn("[bi/track] search_events:", error.message)
    })
}

export function trackAiEvent(opts: {
  eventType:     "upload" | "analyze" | "analyze_failed" | "cancelled"
  firebaseUid?:  string | null
  processingMs?: number | null
  isError?:      boolean
  presetApplied?: string | null
  ip?:           string | null
  device?:       string | null
}) {
  const { eventType, firebaseUid, processingMs, isError = false, presetApplied, ip, device } = opts
  void adminDb()
    .from("ai_usage_events")
    .insert({
      event_type:     eventType,
      firebase_uid:   firebaseUid ?? null,
      processing_ms:  processingMs ?? null,
      is_error:       isError,
      preset_applied: presetApplied ?? null,
      ip_hash:        hashIp(ip ?? null),
      device:         device ?? null,
    })
    .then(({ error }) => {
      if (error) console.warn("[bi/track] ai_usage_events:", error.message)
    })
}

export function trackFunnelEvent(opts: {
  eventType:    string
  sessionKey?:  string | null
  firebaseUid?: string | null
  resourceId?:  string | null
  resourceType?: string | null
  orderId?:     string | null
  ip?:          string | null
  device?:      string | null
}) {
  const { eventType, sessionKey, firebaseUid, resourceId, resourceType, orderId, ip, device } = opts
  void adminDb()
    .from("bi_funnel_events")
    .insert({
      event_type:    eventType,
      session_key:   sessionKey ?? null,
      firebase_uid:  firebaseUid ?? null,
      resource_id:   resourceId ?? null,
      resource_type: resourceType ?? null,
      order_id:      orderId ?? null,
      ip_hash:       hashIp(ip ?? null),
      device:        device ?? null,
    })
    .then(({ error }) => {
      if (error) console.warn("[bi/track] bi_funnel_events:", error.message)
    })
}
