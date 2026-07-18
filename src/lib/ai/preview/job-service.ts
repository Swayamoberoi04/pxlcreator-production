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

const BUCKET          = "ai-previews"
const PREVIEW_TTL_MS  = 24 * 60 * 60 * 1000          // blueprint §10: 24h retention
const SIGNED_URL_SECS = 60 * 60                       // 1h signed URLs

/* ─────────────────────────────────────────────────────────────
   Backend selection
───────────────────────────────────────────────────────────── */

function supabaseConfigured(): boolean {
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

/* In-memory fallback stores (single-process dev) */
const memJobs  = new Map<string, PreviewJob>()
const memCache = new Map<string, { previewDataUri: string; expiresAt: number }>()

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
  memJobs.set(job.id, job)
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
   Exact-result cache (blueprint §7 tier 1)
───────────────────────────────────────────────────────────── */

export function buildCacheKey(phash: string, presetSlug: string, providerId: string): string {
  return `${phash}:${presetSlug}:${PROMPT_VERSION}:${providerId}`
}

export async function cacheLookup(cacheKey: string): Promise<string | null> {
  if (supabaseConfigured()) {
    try {
      const supabase = await adminClient()
      const { data, error } = await supabase
        .from("preview_cache").select("*").eq("cache_key", cacheKey).maybeSingle()
      if (error) throw error
      if (data && new Date(data.expires_at as string).getTime() > Date.now()) {
        /* best-effort hit counter */
        void supabase.from("preview_cache")
          .update({ hit_count: ((data.hit_count as number) ?? 0) + 1 })
          .eq("cache_key", cacheKey)
          .then(() => undefined, () => undefined)

        if (data.preview_path) {
          const url = await signPreviewUrl(data.preview_path as string)
          if (url) return url
        }
        if (data.preview_data_uri) return data.preview_data_uri as string
      }
    } catch (err) {
      log("cache_read_failed", { error: errMessage(err) })
    }
  }

  const mem = memCache.get(cacheKey)
  if (mem && mem.expiresAt > Date.now()) return mem.previewDataUri
  return null
}

async function cacheStore(
  cacheKey: string,
  jobId: string,
  previewPath: string | null,
  previewDataUri: string | null
): Promise<void> {
  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS).toISOString()

  if (supabaseConfigured()) {
    try {
      const supabase = await adminClient()
      const { error } = await supabase.from("preview_cache").upsert({
        cache_key:        cacheKey,
        preview_path:     previewPath,
        preview_data_uri: previewDataUri,
        expires_at:       expiresAt,
        source_job_id:    jobId,
      })
      if (error) throw error
      return
    } catch (err) {
      log("cache_write_failed", { error: errMessage(err) })
    }
  }
  if (previewDataUri) {
    memCache.set(cacheKey, { previewDataUri, expiresAt: Date.now() + PREVIEW_TTL_MS })
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

async function logProviderCall(entry: {
  jobId: string; provider: string; operation: string
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

export async function runGenerationJob(args: {
  jobId:       string
  imageBuffer: Buffer
  imagePhash:  string
  analysis:    ImageAnalysisResult
  presetSlug:  string
  userPrompt:  string
}): Promise<void> {
  const { jobId, imageBuffer, imagePhash, analysis, presetSlug, userPrompt } = args
  const startMs = Date.now()

  try {
    const provider = await getActivePreviewProvider()
    if (!provider) throw new JobError("ENGINE_DISABLED", "No preview provider available")

    await updateJob(jobId, { status: "generating", provider: provider.providerId })

    /* ── Resolve grade evidence: preset intelligence + style profile ── */
    const { presets } = await getCachedCatalog()
    const kb    = getKnowledgeBase(presets.filter((p) => p.category !== "Bundle"))
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
           so publish nothing: Sharp fallback. */
        await updateJob(jobId, { status: "degraded", qa, qaRetries, errorCode: "PROVIDER_FAILED", totalMs: Date.now() - startMs })
        logError("generation_degraded", { jobId, reason: "RETRY_PROVIDER_FAILED", error: errMessage(err) })
        return
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
        /* Max ONE retry (config.retry.maxRetries) — still not good enough */
        await updateJob(jobId, { status: "degraded", qa: qa2, qaRetries, errorCode: "QA_REJECTED", totalMs: Date.now() - startMs })
        log("generation_degraded", {
          jobId, reason: "QA_REJECTED_AFTER_RETRY",
          verdict: qa2.verdict, overallScore: qa2.overallScore, failureReasons: qa2.failureReasons,
        })
        return
      }
    } else if (qa.verdict === "fail") {
      await updateJob(jobId, { status: "degraded", qa, errorCode: "QA_REJECTED", totalMs: Date.now() - startMs })
      log("generation_degraded", {
        jobId, reason: "QA_REJECTED",
        overallScore: qa.overallScore, failureReasons: qa.failureReasons,
      })
      return
    }

    /* ── Store + cache (PASS or pending only) ── */
    const stored = await storePreview(jobId, activeGeneration.imageBase64, activeGeneration.mimeType)
    await cacheStore(
      buildCacheKey(imagePhash, presetSlug, provider.providerId),
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
  } catch (err) {
    const code = err instanceof JobError ? err.code : "INTERNAL"
    await updateJob(jobId, {
      status:    "degraded",
      errorCode: code,
      totalMs:   Date.now() - startMs,
    })
    logError("generation_failed", { jobId, code, error: errMessage(err), totalMs: Date.now() - startMs })
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
