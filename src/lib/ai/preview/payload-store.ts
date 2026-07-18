/**
 * src/lib/ai/preview/payload-store.ts
 *
 * Phase 4D — durable job payloads.
 *
 * A job row (migration 020) intentionally stores no pixels. For workers
 * to process jobs independently of the request that created them — and
 * for QUEUED/GENERATING/RETRYING jobs to survive a server restart — the
 * work payload (normalized image + analysis + prompt) must outlive the
 * request closure.
 *
 * Two tiers, schema untouched:
 *   1. In-process LRU cache (hot path — the worker tick that runs right
 *      after enqueue reads from memory, zero I/O)
 *   2. Private ai-previews bucket, `pending/{jobId}.json` (durable —
 *      any instance, any restart, can reload the payload)
 *
 * Payloads are deleted when the job reaches a terminal state, and the
 * cleanup service sweeps orphans.
 */

import type { ImageAnalysisResult } from "@/types/ai"
import { DEFAULT_WORKER_CONFIG } from "./worker-config"

const BUCKET = "ai-previews"

export interface JobPayload {
  jobId:       string
  imageBase64: string
  imagePhash:  string
  presetSlug:  string
  userPrompt:  string
  analysis:    ImageAnalysisResult
  /** Worker-level pipeline attempts consumed so far */
  attempts:    number
  createdAt:   string
}

/* ── Tier 1: bounded in-process cache ─────────────────────── */

const memPayloads = new Map<string, JobPayload>()
let   memBytes    = 0

function payloadBytes(p: JobPayload): number {
  return p.imageBase64.length + 2_048
}

function memSet(p: JobPayload): void {
  const existing = memPayloads.get(p.jobId)
  if (existing) memBytes -= payloadBytes(existing)
  memPayloads.set(p.jobId, p)
  memBytes += payloadBytes(p)

  const cap = DEFAULT_WORKER_CONFIG.memory.maxPayloadBytes
  /* LRU-ish eviction: Map order = insertion order = oldest first.
     Evicted payloads remain recoverable from the bucket tier. */
  while (memBytes > cap && memPayloads.size > 1) {
    const oldestKey = memPayloads.keys().next().value
    if (!oldestKey || oldestKey === p.jobId) break
    const evicted = memPayloads.get(oldestKey)
    memPayloads.delete(oldestKey)
    if (evicted) memBytes -= payloadBytes(evicted)
  }
}

/* ── Tier 2: bucket persistence ───────────────────────────── */

function supabaseAvailable(): boolean {
  if (process.env.PREVIEW_STORE?.trim().toLowerCase() === "memory") return false
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function adminClient() {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  return createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient
}

function pendingPath(jobId: string): string {
  return `pending/${jobId}.json`
}

/* ── Public API ───────────────────────────────────────────── */

/**
 * Persist a payload. Memory write is synchronous (the fast path for the
 * in-process worker); the bucket write is awaited so that recovery is
 * guaranteed once enqueue returns.
 */
export async function savePayload(payload: JobPayload): Promise<void> {
  memSet(payload)

  if (!supabaseAvailable()) return
  try {
    const supabase = await adminClient()
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(pendingPath(payload.jobId), Buffer.from(JSON.stringify(payload), "utf8"), {
        contentType: "application/json",
        upsert:      true,
      })
    if (error) throw error
  } catch (err) {
    log("payload_persist_failed", { jobId: payload.jobId, error: msg(err) })
    /* Memory tier still holds it — recovery across restarts is lost for
       this job, but same-process execution proceeds normally. */
  }
}

/** Load a payload: memory first, bucket second. */
export async function loadPayload(jobId: string): Promise<JobPayload | null> {
  const mem = memPayloads.get(jobId)
  if (mem) return mem

  if (!supabaseAvailable()) return null
  try {
    const supabase = await adminClient()
    const { data, error } = await supabase.storage.from(BUCKET).download(pendingPath(jobId))
    if (error || !data) return null
    const parsed = JSON.parse(Buffer.from(await data.arrayBuffer()).toString("utf8")) as JobPayload
    memSet(parsed)   // re-warm the hot tier
    return parsed
  } catch (err) {
    log("payload_load_failed", { jobId, error: msg(err) })
    return null
  }
}

/** Update the attempt counter (both tiers). */
export async function bumpPayloadAttempts(jobId: string): Promise<number> {
  const payload = await loadPayload(jobId)
  if (!payload) return -1
  const bumped = { ...payload, attempts: payload.attempts + 1 }
  await savePayload(bumped)
  return bumped.attempts
}

/** Remove a payload once the job is terminal. Idempotent. */
export async function deletePayload(jobId: string): Promise<void> {
  const mem = memPayloads.get(jobId)
  if (mem) {
    memPayloads.delete(jobId)
    memBytes -= payloadBytes(mem)
  }
  if (!supabaseAvailable()) return
  try {
    const supabase = await adminClient()
    await supabase.storage.from(BUCKET).remove([pendingPath(jobId)])
  } catch { /* best-effort — the cleanup sweep catches leftovers */ }
}

/** Introspection for tests + telemetry. */
export function payloadStoreStats(): { entries: number; bytes: number } {
  return { entries: memPayloads.size, bytes: memBytes }
}

/** Test hook. */
export function resetPayloadStore(): void {
  memPayloads.clear()
  memBytes = 0
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function log(event: string, data: Record<string, unknown>): void {
  console.log(`[ai:preview] ${JSON.stringify({ event, ...data })}`)
}
