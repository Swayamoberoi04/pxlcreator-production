/**
 * src/lib/ai/preview/job-service.ts
 *
 * Preview job store + generation orchestration (blueprint §2, §9, §11).
 *
 * Storage backend follows the house repository pattern: Supabase
 * (service-role client, tables from migration 020) when configured,
 * transparent in-memory fallback otherwise — local dev works with zero
 * setup, production polling works across serverless instances.
 *
 * Generation pipeline per job:
 *   generating → provider (retry/timeout inside) → qa (4C extension
 *   point, pending in 4B) → store (private bucket + signed URL, inline
 *   data-URI fallback) → cache write → ready
 *   any failure → degraded (client keeps the Sharp preview — the
 *   engine can never make the studio worse)
 *
 * Telemetry: single-line [ai:preview] JSON logs + provider_logs ledger.
 */

import { randomUUID, createHash } from "node:crypto"
import type {
  PreviewJob,
  PreviewJobStatus,
  PreviewProviderId,
  PreviewQAResult,
} from "@/types/preview"
import type { ImageAnalysisResult } from "@/types/ai"
import { getActivePreviewProvider } from "./provider"
import { getActiveQAGate } from "./qa"
import { buildCorrectiveInstruction } from "./qa/refinement"
import { buildPreviewInstruction, PROMPT_VERSION } from "./prompt-builder"
import { getStyleProfile, matchStyleProfile } from "@/lib/studio/style-profiles"
import { getCachedCatalog } from "@/lib/ai/preset-intelligence/catalog-cache"
import { getKnowledgeBase } from "@/lib/ai/preset-intelligence/knowledge-base"
import { previewKey } from "./cache/keys"
import { cacheGet, cacheSet } from "./cache/engine"

const BUCKET          = "ai-previews"
const PREVIEW_TTL_MS  = 24 * 60 * 60 * 1000          // blueprint §10: 24h retention
const SIGNED_URL_SECS = 60 * 60                       // 1h signed URLs

/* ─────────────────────────────────────────────────────────────
   Backend selection
───────────────────────────────────────────────────────────── */

export function supabaseConfigured(): boolean {
  /* PREVIEW_STORE=memory forces the in-memory backend — used by the
     deterministic Phase 4D test suite; never set in production. */
  if (process.env.PREVIEW_STORE?.trim().toLowerCase() === "memory") return false
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co"
  )
}

async function adminClient(): Promise<import("@supabase/supabase-js").SupabaseClient> {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  /* The generated Database type predates migration 020's tables; this
     module does its own row mapping (toRow/fromRow), so an untyped
     client is the accurate contract here. */
  return createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient
}

/* In-memory fallback stores (single-process dev).
   Bounded (Phase 4D §11): terminal jobs are evicted first once the cap
   is reached; Map iteration order = insertion order = oldest first. */
const memJobs  = new Map<string, PreviewJob>()
const memCache = new Map<string, { previewDataUri: string; expiresAt: number }>()

const MAX_MEM_JOBS = Number(process.env.PREVIEW_MEM_JOB_CAP) || 12_000

function memJobsSet(job: PreviewJob): void {
  if (!memJobs.has(job.id) && memJobs.size >= MAX_MEM_JOBS) {
    let evicted = 0
    for (const [id, j] of memJobs) {
      if (!["queued", "generating", "qa"].includes(j.status)) {
        memJobs.delete(id)
        if (++evicted >= 100) break
      }
    }
    /* All-active overflow: evict oldest regardless (log — this means
       the cap is undersized for the workload) */
    if (memJobs.size >= MAX_MEM_JOBS) {
      const oldest = memJobs.keys().next().value
      if (oldest) {
        memJobs.delete(oldest)
        log("mem_store_evicted_active", { evictedJobId: oldest, cap: MAX_MEM_JOBS })
      }
    }
  }
  memJobs.set(job.id, job)
}

/** Test/ops hook — wipe the in-memory stores. */
export function resetMemoryStores(): void {
  memJobs.clear()
  memCache.clear()
}

/* ─────────────────────────────────────────────────────────────
   IP hashing — never store raw IPs (blueprint §11)
───────────────────────────────────────────────────────────── */

export function hashClientIp(ip: string): string {
  const salt = process.env.ADMIN_SECRET_KEY ?? "pxl-preview-salt"
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24)
}

/* ─────────────────────────────────────────────────────────────
   Job CRUD
───────────────────────────────────────────────────────────── */

export async function createJob(fields: {
  clientIpHash:   string
  imagePhash:     string
  imageMeta:      PreviewJob["imageMeta"]
  presetSlug:     string
  styleProfileId: string
}): Promise<PreviewJob> {
  const now = new Date().toISOString()
  const job: PreviewJob = {
    id:             randomUUID(),
    createdAt:      now,
    updatedAt:      now,
    status:         "queued",
    clientIpHash:   fields.clientIpHash,
    imagePhash:     fields.imagePhash,
    imageMeta:      fields.imageMeta,
    presetSlug:     fields.presetSlug,
    styleProfileId: fields.styleProfileId,
    promptVersion:  PROMPT_VERSION,
    provider:       null,
    providerMs:     null,
    qa:             null,
    qaRetries:      0,
    previewPath:    null,
    previewDataUri: null,
    expiresAt:      null,
    errorCode:      null,
    totalMs:        null,
    costUsd:        null,
  }

  if (supabaseConfigured()) {
    try {
      const supabase = await adminClient()
      const { error } = await supabase.from("preview_jobs").insert(toRow(job))
      if (error) throw error
      return job
    } catch (err) {
      log("job_store_insert_failed_using_memory", { jobId: job.id, error: errMessage(err) })
    }
  }
  memJobsSet(job)
  return job
}

/**
 * In-flight dedup: an active job for the same photo + preset + prompt
 * version means a duplicate POST (dev double-mount, double-click,
 * multi-tab) should attach to the existing job instead of paying for a
 * second generation.
 */
export async function findActiveJob(
  imagePhash: string,
  presetSlug: string
): Promise<PreviewJob | null> {
  const ACTIVE: PreviewJobStatus[] = ["queued", "generating", "qa"]
  const freshMs = 90_000

  if (supabaseConfigured()) {
    try {
      const supabase = await adminClient()
      const { data, error } = await supabase
        .from("preview_jobs").select("*")
        .eq("image_phash", imagePhash)
        .eq("preset_slug", presetSlug)
        .eq("prompt_version", PROMPT_VERSION)
        .in("status", ACTIVE)
        .gte("created_at", new Date(Date.now() - freshMs).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (data) return fromRow(data as Record<string, unknown>)
    } catch (err) {
      log("job_store_dedup_read_failed", { error: errMessage(err) })
    }
  }
  for (const job of memJobs.values()) {
    if (
      job.imagePhash === imagePhash &&
      job.presetSlug === presetSlug &&
      job.promptVersion === PROMPT_VERSION &&
      ACTIVE.includes(job.status) &&
      Date.now() - new Date(job.createdAt).getTime() < freshMs
    ) return job
  }
  return null
}

export async function getJob(jobId: string): Promise<PreviewJob | null> {
  if (supabaseConfigured()) {
    try {
      const supabase = await adminClient()
      const { data, error } = await supabase
        .from("preview_jobs").select("*").eq("id", jobId).maybeSingle()
      if (error) throw error
      if (data) return fromRow(data as Record<string, unknown>)
    } catch (err) {
      log("job_store_read_failed", { jobId, error: errMessage(err) })
    }
  }
  return memJobs.get(jobId) ?? null
}

/**
 * Phase 4D §8 — atomic state transition (job locking).
 *
 * Conditional UPDATE: the row moves only if its CURRENT status is one
 * of `fromStatuses`. Two workers racing for the same job get exactly
 * one winner — the loser's update matches zero rows and returns false.
 * The in-memory backend applies the same check synchronously (a single
 * JS thread makes check-then-set atomic per process).
 *
 * The requested transition must be legal per the lifecycle table.
 */
export async function transitionJob(
  jobId:        string,
  fromStatuses: PreviewJobStatus[],
  patch:        Partial<PreviewJob> & { status: PreviewJobStatus }
): Promise<boolean> {
  const { assertTransition } = await import("./lifecycle")
  for (const from of fromStatuses) assertTransition(from, patch.status)

  const updated = { ...patch, updatedAt: new Date().toISOString() }

  if (supabaseConfigured()) {
    try {
      const supabase = await adminClient()
      const { data, error } = await supabase
        .from("preview_jobs")
        .update(toRow(updated as PreviewJob, true))
        .eq("id", jobId)
        .in("status", fromStatuses)
        .select("id")
      if (error) throw error
      return (data?.length ?? 0) > 0
    } catch (err) {
      log("job_store_transition_failed", { jobId, to: patch.status, error: errMessage(err) })
      /* fall through to memory so dev keeps working */
    }
  }

  const mem = memJobs.get(jobId)
  if (!mem || !fromStatuses.includes(mem.status)) return false
  memJobs.set(jobId, { ...mem, ...updated })
  return true
}

/**
 * Bounded job listing for the worker claim loop, recovery sweep, and
 * cleanup service. Uses the (status, updated_at) index from migration
 * 020 — one indexed query per tick, no per-job reads (§11).
 */
export async function listJobs(filter: {
  statuses:       PreviewJobStatus[]
  updatedBefore?: string
  expiresBefore?: string
  limit:          number
}): Promise<PreviewJob[]> {
  if (supabaseConfigured()) {
    try {
      const supabase = await adminClient()
      let query = supabase
        .from("preview_jobs").select("*")
        .in("status", filter.statuses)
        .order("updated_at", { ascending: true })
        .limit(filter.limit)
      if (filter.updatedBefore) query = query.lt("updated_at", filter.updatedBefore)
      if (filter.expiresBefore) query = query.lt("expires_at", filter.expiresBefore)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map((r) => fromRow(r as Record<string, unknown>))
    } catch (err) {
      log("job_store_list_failed", { error: errMessage(err) })
    }
  }

  const out: PreviewJob[] = []
  for (const job of memJobs.values()) {
    if (!filter.statuses.includes(job.status)) continue
    if (filter.updatedBefore && job.updatedAt >= filter.updatedBefore) continue
    if (filter.expiresBefore && (!job.expiresAt || job.expiresAt >= filter.expiresBefore)) continue
    out.push(job)
  }
  out.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
  return out.slice(0, filter.limit)
}

/** Hard-delete job rows (cleanup §7). Returns count removed. */
export async function purgeJobs(jobIds: string[]): Promise<number> {
  if (jobIds.length === 0) return 0
  let removed = 0
  if (supabaseConfigured()) {
    try {
      const supabase = await adminClient()
      const { data, error } = await supabase
        .from("preview_jobs").delete().in("id", jobIds).select("id")
      if (error) throw error
      removed = data?.length ?? 0
    } catch (err) {
      log("job_store_purge_failed", { error: errMessage(err) })
    }
  }
  for (const id of jobIds) { if (memJobs.delete(id)) removed++ }
  return removed
}

/** Delete expired preview_cache rows (cleanup §7). */
export async function purgeExpiredCache(before: string, limit: number): Promise<number> {
  let removed = 0
  if (supabaseConfigured()) {
    try {
      const supabase = await adminClient()
      const { data, error } = await supabase
        .from("preview_cache").delete().lt("expires_at", before)
        .select("cache_key").limit(limit)
      if (error) throw error
      removed = data?.length ?? 0
    } catch (err) {
      log("cache_purge_failed", { error: errMessage(err) })
    }
  }
  const cutoff = new Date(before).getTime()
  for (const [key, entry] of memCache) {
    if (entry.expiresAt < cutoff) { memCache.delete(key); removed++ }
  }
  return removed
}

/** Delete a stored preview asset from the bucket (cleanup §7). */
export async function deletePreviewAsset(previewPath: string): Promise<void> {
  if (!supabaseConfigured()) return
  try {
    const supabase = await adminClient()
    await supabase.storage.from(BUCKET).remove([previewPath])
  } catch (err) {
    log("asset_delete_failed", { previewPath, error: errMessage(err) })
  }
}

async function updateJob(jobId: string, patch: Partial<PreviewJob>): Promise<void> {
  const updated = { ...patch, updatedAt: new Date().toISOString() }

  if (supabaseConfigured()) {
    try {
      const supabase = await adminClient()
      const { error } = await supabase
        .from("preview_jobs").update(toRow(updated as PreviewJob, true)).eq("id", jobId)
      if (error) throw error
    } catch (err) {
      log("job_store_update_failed", { jobId, error: errMessage(err) })
    }
  }
  const mem = memJobs.get(jobId)
  if (mem) memJobs.set(jobId, { ...mem, ...updated })
}

/* ─────────────────────────────────────────────────────────────
   Exact-result cache — Phase 4E: delegates to the multi-level
   cache engine (src/lib/ai/preview/cache/). Signatures preserved,
   so the worker pipeline and routes are untouched by the swap.
───────────────────────────────────────────────────────────── */

/**
 * Deterministic preview cache key. Phase 4E composition includes the
 * style profile plus the prompt/QA/engine versions (see cache/keys.ts)
 * — any version change rotates the key, so stale previews can never be
 * served. styleProfileId defaults keep older call sites compiling.
 */
export function buildCacheKey(
  phash: string,
  presetSlug: string,
  providerId: string,
  styleProfileId = "any"
): string {
  return previewKey({ imagePhash: phash, presetSlug, styleProfileId, providerId })
}

export async function cacheLookup(cacheKey: string): Promise<string | null> {
  const entry = await cacheGet("preview", cacheKey)
  if (!entry) return null
  if (entry.kind === "path") {
    const url = await signPreviewUrl(entry.value)
    return url   // unsignable path = miss (asset likely swept)
  }
  return entry.value
}

async function cacheStore(
  cacheKey: string,
  jobId: string,
  previewPath: string | null,
  previewDataUri: string | null
): Promise<void> {
  if (previewPath) {
    await cacheSet("preview", cacheKey, previewPath, { kind: "path", sourceJobId: jobId })
  } else if (previewDataUri) {
    await cacheSet("preview", cacheKey, previewDataUri, { kind: "inline", sourceJobId: jobId })
  }
}

/* ─────────────────────────────────────────────────────────────
   Preview storage — private bucket + signed URL, inline fallback
───────────────────────────────────────────────────────────── */

async function storePreview(
  jobId: string,
  imageBase64: string,
  mimeType: string
): Promise<{ previewPath: string | null; previewDataUri: string | null }> {
  const dataUri = `data:${mimeType};base64,${imageBase64}`

  if (supabaseConfigured()) {
    try {
      const supabase = await adminClient()
      const ext  = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg"
      const path = `${jobId}.${ext}`
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, Buffer.from(imageBase64, "base64"), { contentType: mimeType, upsert: true })
      if (error) throw error
      return { previewPath: path, previewDataUri: null }
    } catch (err) {
      log("storage_upload_failed_using_inline", { jobId, error: errMessage(err) })
    }
  }
  return { previewPath: null, previewDataUri: dataUri }
}

export async function signPreviewUrl(previewPath: string): Promise<string | null> {
  if (!supabaseConfigured()) return null
  try {
    const supabase = await adminClient()
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(previewPath, SIGNED_URL_SECS)
    if (error) throw error
    return data?.signedUrl ?? null
  } catch (err) {
    log("signed_url_failed", { previewPath, error: errMessage(err) })
    return null
  }
}

/** Public URL resolution for the status endpoint. */
export async function resolvePreviewUrl(job: PreviewJob): Promise<string | null> {
  if (job.previewPath) {
    const url = await signPreviewUrl(job.previewPath)
    if (url) return url
  }
  return job.previewDataUri
}

/* ─────────────────────────────────────────────────────────────
   Daily spend guard (blueprint §7 kill-switch)
   Per-process counter — sufficient at current scale; move to a
   provider_logs SUM query when running multi-instance at volume.
───────────────────────────────────────────────────────────── */

let _spendDay  = ""
let _spentUsd  = 0

export function checkAndReserveSpend(costUsd: number): boolean {
  const ceiling = Number(process.env.PREVIEW_DAILY_COST_CEILING) || 50
  const today   = new Date().toISOString().slice(0, 10)
  if (_spendDay !== today) { _spendDay = today; _spentUsd = 0 }
  if (_spentUsd + costUsd > ceiling) return false
  _spentUsd += costUsd
  return true
}

/* ─────────────────────────────────────────────────────────────
   Provider call ledger (best-effort)
───────────────────────────────────────────────────────────── */

export async function logProviderCall(entry: {
  /** null = event not tied to a job (e.g. cache hits) — column is nullable */
  jobId: string | null; provider: string; operation: string
  latencyMs: number; tokensOrUnits: Record<string, unknown> | null
  costUsd: number | null; error: string | null
}): Promise<void> {
  if (!supabaseConfigured()) return
  try {
    const supabase = await adminClient()
    await supabase.from("provider_logs").insert({
      job_id:          entry.jobId,
      provider:        entry.provider,
      operation:       entry.operation,
      latency_ms:      entry.latencyMs,
      tokens_or_units: entry.tokensOrUnits,
      cost_usd:        entry.costUsd,
      error:           entry.error,
    })
  } catch { /* ledger is best-effort — never fail the job over it */ }
}

/**
 * QA telemetry ledger entry (Phase 4C §9) — one provider_logs row per
 * gate evaluation, operation "qa". Best-effort like logProviderCall.
 */
async function logQaCall(jobId: string, gateId: string, qa: PreviewQAResult): Promise<void> {
  await logProviderCall({
    jobId,
    provider:  gateId,
    operation: "qa",
    latencyMs: qa.evaluationMs ?? 0,
    tokensOrUnits: {
      verdict:         qa.verdict,
      overallScore:    qa.overallScore ?? null,
      similarityScore: qa.similarityScore ?? null,
      identityScore:   qa.identityScore ?? null,
      fidelityScore:   qa.fidelityScore,
      realismScore:    qa.realismScore,
      metadataScore:   qa.metadataScore ?? null,
      histogramScore:  qa.histogramScore ?? null,
      configVersion:   qa.configVersion ?? null,
    },
    costUsd: null,
    error:   qa.verdict === "pass" || qa.verdict === "pending"
      ? null
      : (qa.failureReasons ?? []).join(",") || qa.verdict,
  })
}

/* ─────────────────────────────────────────────────────────────
   GENERATION ORCHESTRATION
───────────────────────────────────────────────────────────── */

/** Phase 4D — classified pipeline result consumed by the worker. */
export interface GenerationOutcome {
  outcome:   "ready" | "degraded"
  errorCode: string | null
  category:  import("./worker-config").FailureCategory | null
  retryable: boolean
  /** true = this run already wrote the terminal job state */
  finalized: boolean
}

/**
 * Failure taxonomy (Phase 4D §3) — maps an error to the retry-policy
 * category. Deterministic and directly testable.
 */
export function classifyFailure(
  code: string,
  message: string
): { category: import("./worker-config").FailureCategory; retryable: boolean } {
  if (code === "QA_REJECTED") return { category: "qa", retryable: false }
  if (code === "ENGINE_DISABLED" || code === "PRESET_NOT_FOUND" || code === "PAYLOAD_LOST") {
    return { category: "permanent", retryable: false }
  }
  const msg = message.toLowerCase()
  if (/timed out|timeout/.test(msg))                                      return { category: "timeout", retryable: true }
  if (/fetch failed|network|econnreset|econnrefused|etimedout|socket|aborted/.test(msg)) {
    return { category: "network", retryable: true }
  }
  if (code === "PROVIDER_FAILED") return { category: "provider", retryable: true }
  return { category: "permanent", retryable: false }
}

export async function runGenerationJob(
  args: {
    jobId:       string
    imageBuffer: Buffer
    imagePhash:  string
    analysis:    ImageAnalysisResult
    presetSlug:  string
    userPrompt:  string
  },
  opts?: {
    /** false = a RETRYABLE failure is NOT written as terminal — the
        caller (worker) owns the retry decision. Default true preserves
        the Phase 4B/4C behaviour for any direct caller. */
    finalizeFailures?: boolean
  }
): Promise<GenerationOutcome> {
  const { jobId, imageBuffer, imagePhash, analysis, presetSlug, userPrompt } = args
  const finalizeFailures = opts?.finalizeFailures ?? true
  const startMs = Date.now()

  try {
    const provider = await getActivePreviewProvider()
    if (!provider) throw new JobError("ENGINE_DISABLED", "No preview provider available")

    await updateJob(jobId, { status: "generating", provider: provider.providerId })

    /* ── Resolve grade evidence: preset intelligence + style profile ── */
    const { presets } = await getCachedCatalog()
    const kb    = getKnowledgeBase(presets)
    const intel = kb.entries.get(presetSlug)
    if (!intel) throw new JobError("PRESET_NOT_FOUND", `No knowledge-base entry for ${presetSlug}`)

    const profile =
      getStyleProfile(analysis.styleProfileId) ?? matchStyleProfile(userPrompt, [])

    /* ── Build the versioned, deterministic instruction ── */
    const { instruction } = buildPreviewInstruction({
      analysis, presetIntel: intel, profile, userPrompt,
    })

    /* ── Generate ── */
    const imageBase64 = imageBuffer.toString("base64")
    let generation
    try {
      generation = await provider.generatePreview({
        imageBase64,
        mimeType: "image/jpeg",
        instruction,
      })
    } catch (err) {
      await logProviderCall({
        jobId, provider: provider.providerId, operation: "edit",
        latencyMs: Date.now() - startMs, tokensOrUnits: null, costUsd: null,
        error: errMessage(err),
      })
      throw new JobError("PROVIDER_FAILED", errMessage(err))
    }

    await logProviderCall({
      jobId, provider: provider.providerId, operation: "edit",
      latencyMs: generation.providerLatencyMs,
      tokensOrUnits: generation.usage,
      costUsd: provider.costPerPreviewUsd,
      error: null,
    })

    /* ── QA — Phase 4C composite gate + retry decision engine ──
       PASS  → publish
       RETRY → one corrective regeneration (refined prompt) → QA again;
               anything short of PASS on the second look → Sharp fallback
       FAIL  → Sharp fallback immediately                              */
    await updateJob(jobId, { status: "qa", providerMs: generation.providerLatencyMs })

    const gate = await getActiveQAGate()
    /* Reference adjustments: prefer the analysis' merged grade (present
       when the client forwarded the full ImageAnalysisResult), fall back
       to the style profile's own defaults. */
    const referenceAdjustments =
      typeof analysis.adjustments?.brightness === "number"
        ? analysis.adjustments
        : profile.defaultAdjustments
    const qaInput = (previewB64: string, mime: string, instr: string) => ({
      originalBase64: imageBase64,
      previewBase64:  previewB64,
      mimeType:       mime,
      instruction:    instr,
      presetIntel:    intel,
      referenceAdjustments,
    })

    let activeGeneration = generation
    let qa: PreviewQAResult = await gate.evaluate(
      qaInput(generation.imageBase64, generation.mimeType, instruction)
    )
    let qaRetries = 0
    await logQaCall(jobId, gate.gateId, qa)

    if (qa.verdict === "retry") {
      const refined = buildCorrectiveInstruction(instruction, qa.failureReasons ?? [])
      qaRetries = 1
      await updateJob(jobId, { status: "generating", qaRetries })
      log("qa_retry", {
        jobId,
        overallScore:      qa.overallScore,
        failureReasons:    qa.failureReasons,
        corrections:       refined.correctionsApplied,
        refinementVersion: refined.refinementVersion,
      })

      let regen
      try {
        regen = await provider.generatePreview({
          imageBase64, mimeType: "image/jpeg", instruction: refined.instruction,
        })
      } catch (err) {
        await logProviderCall({
          jobId, provider: provider.providerId, operation: "edit",
          latencyMs: Date.now() - startMs, tokensOrUnits: null, costUsd: null,
          error: errMessage(err),
        })
        /* Regeneration failed — the first attempt was only RETRY-grade,
           so publish nothing. The worker may re-run the whole pipeline
           if the provider error is transient. */
        const cls = classifyFailure("PROVIDER_FAILED", errMessage(err))
        const finalize = finalizeFailures || !cls.retryable
        if (finalize) {
          await updateJob(jobId, { status: "degraded", qa, qaRetries, errorCode: "PROVIDER_FAILED", totalMs: Date.now() - startMs })
        }
        logError("generation_degraded", { jobId, reason: "RETRY_PROVIDER_FAILED", error: errMessage(err), finalized: finalize })
        return { outcome: "degraded", errorCode: "PROVIDER_FAILED", category: cls.category, retryable: cls.retryable, finalized: finalize }
      }
      await logProviderCall({
        jobId, provider: provider.providerId, operation: "edit",
        latencyMs: regen.providerLatencyMs, tokensOrUnits: regen.usage,
        costUsd: provider.costPerPreviewUsd, error: null,
      })

      await updateJob(jobId, { status: "qa" })
      const qa2: PreviewQAResult = await gate.evaluate(
        qaInput(regen.imageBase64, regen.mimeType, refined.instruction)
      )
      await logQaCall(jobId, gate.gateId, qa2)

      if (qa2.verdict === "pass" || qa2.verdict === "pending") {
        activeGeneration = regen
        qa = qa2
      } else {
        /* Max ONE QA retry (4C config) — the worker never re-runs
           QA-rejected jobs, so this is always final. */
        await updateJob(jobId, { status: "degraded", qa: qa2, qaRetries, errorCode: "QA_REJECTED", totalMs: Date.now() - startMs })
        log("generation_degraded", {
          jobId, reason: "QA_REJECTED_AFTER_RETRY",
          verdict: qa2.verdict, overallScore: qa2.overallScore, failureReasons: qa2.failureReasons,
        })
        return { outcome: "degraded", errorCode: "QA_REJECTED", category: "qa", retryable: false, finalized: true }
      }
    } else if (qa.verdict === "fail") {
      await updateJob(jobId, { status: "degraded", qa, errorCode: "QA_REJECTED", totalMs: Date.now() - startMs })
      log("generation_degraded", {
        jobId, reason: "QA_REJECTED",
        overallScore: qa.overallScore, failureReasons: qa.failureReasons,
      })
      return { outcome: "degraded", errorCode: "QA_REJECTED", category: "qa", retryable: false, finalized: true }
    }

    /* ── Store + cache (PASS or pending only) ── */
    const stored = await storePreview(jobId, activeGeneration.imageBase64, activeGeneration.mimeType)
    await cacheStore(
      buildCacheKey(imagePhash, presetSlug, provider.providerId, analysis.styleProfileId),
      jobId, stored.previewPath, stored.previewDataUri
    )

    const totalMs = Date.now() - startMs
    const generationsPaid = 1 + qaRetries
    await updateJob(jobId, {
      status:         "ready",
      qa,
      qaRetries,
      previewPath:    stored.previewPath,
      previewDataUri: stored.previewDataUri,
      expiresAt:      new Date(Date.now() + PREVIEW_TTL_MS).toISOString(),
      totalMs,
      costUsd:        provider.costPerPreviewUsd * generationsPaid,
    })

    log("generation_ok", {
      jobId,
      provider:     provider.providerId,
      presetSlug,
      promptVersion: PROMPT_VERSION,
      providerMs:   activeGeneration.providerLatencyMs,
      totalMs,
      attempts:     activeGeneration.attempts,
      retries:      activeGeneration.attempts - 1,
      qaRetries,
      costUsd:      provider.costPerPreviewUsd * generationsPaid,
      cacheHit:     false,
      qaVerdict:    qa.verdict,
      qaOverall:    qa.overallScore,
      qaMs:         qa.evaluationMs,
      inputTokens:  activeGeneration.usage.inputTokens,
      outputTokens: activeGeneration.usage.outputTokens,
      storage:      stored.previewPath ? "bucket" : "inline",
    })
    return { outcome: "ready", errorCode: null, category: null, retryable: false, finalized: true }
  } catch (err) {
    const code = err instanceof JobError ? err.code : "INTERNAL"
    const cls  = classifyFailure(code, errMessage(err))
    const finalize = finalizeFailures || !cls.retryable
    if (finalize) {
      await updateJob(jobId, {
        status:    "degraded",
        errorCode: code,
        totalMs:   Date.now() - startMs,
      })
    }
    logError("generation_failed", {
      jobId, code, category: cls.category, retryable: cls.retryable,
      finalized: finalize, error: errMessage(err), totalMs: Date.now() - startMs,
    })
    return { outcome: "degraded", errorCode: code, category: cls.category, retryable: cls.retryable, finalized: finalize }
  }
}

/* ─────────────────────────────────────────────────────────────
   Row mapping (snake_case ↔ camelCase)
───────────────────────────────────────────────────────────── */

function toRow(job: Partial<PreviewJob>, isPatch = false): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (!isPatch) {
    row.id         = job.id
    row.created_at = job.createdAt
  }
  if (job.updatedAt      !== undefined) row.updated_at       = job.updatedAt
  if (job.status         !== undefined) row.status           = job.status
  if (job.clientIpHash   !== undefined) row.client_ip_hash   = job.clientIpHash
  if (job.imagePhash     !== undefined) row.image_phash      = job.imagePhash
  if (job.imageMeta      !== undefined) row.image_meta       = job.imageMeta
  if (job.presetSlug     !== undefined) row.preset_slug      = job.presetSlug
  if (job.styleProfileId !== undefined) row.style_profile    = job.styleProfileId
  if (job.promptVersion  !== undefined) row.prompt_version   = job.promptVersion
  if (job.provider       !== undefined) row.provider         = job.provider
  if (job.providerMs     !== undefined) row.provider_ms      = job.providerMs
  if (job.qa             !== undefined) row.qa_verdict       = job.qa
  if (job.qaRetries      !== undefined) row.qa_retries       = job.qaRetries
  if (job.previewPath    !== undefined) row.preview_path     = job.previewPath
  if (job.previewDataUri !== undefined) row.preview_data_uri = job.previewDataUri
  if (job.expiresAt      !== undefined) row.expires_at       = job.expiresAt
  if (job.errorCode      !== undefined) row.error_code       = job.errorCode
  if (job.totalMs        !== undefined) row.total_ms         = job.totalMs
  if (job.costUsd        !== undefined) row.cost_usd         = job.costUsd
  return row
}

function fromRow(row: Record<string, unknown>): PreviewJob {
  return {
    id:             row.id as string,
    createdAt:      row.created_at as string,
    updatedAt:      row.updated_at as string,
    status:         row.status as PreviewJobStatus,
    clientIpHash:   row.client_ip_hash as string,
    imagePhash:     row.image_phash as string,
    imageMeta:      (row.image_meta ?? {}) as PreviewJob["imageMeta"],
    presetSlug:     row.preset_slug as string,
    styleProfileId: row.style_profile as string,
    promptVersion:  row.prompt_version as string,
    provider:       (row.provider ?? null) as PreviewProviderId | null,
    providerMs:     (row.provider_ms ?? null) as number | null,
    qa:             (row.qa_verdict ?? null) as PreviewQAResult | null,
    qaRetries:      (row.qa_retries ?? 0) as number,
    previewPath:    (row.preview_path ?? null) as string | null,
    previewDataUri: (row.preview_data_uri ?? null) as string | null,
    expiresAt:      (row.expires_at ?? null) as string | null,
    errorCode:      (row.error_code ?? null) as string | null,
    totalMs:        (row.total_ms ?? null) as number | null,
    costUsd:        (row.cost_usd ?? null) as number | null,
  }
}

/* ─────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────── */

class JobError extends Error {
  constructor(readonly code: string, message: string) { super(message) }
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  /* Supabase errors are plain objects ({ message, code, … }) */
  if (typeof err === "object" && err !== null) {
    const m = (err as { message?: unknown }).message
    if (typeof m === "string") return m
    try { return JSON.stringify(err) } catch { /* fall through */ }
  }
  return String(err)
}

function log(event: string, data: Record<string, unknown>): void {
  console.log(`[ai:preview] ${JSON.stringify({ event, ...data })}`)
}

function logError(event: string, data: Record<string, unknown>): void {
  console.error(`[ai:preview] ${JSON.stringify({ event, ...data })}`)
}
