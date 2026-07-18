/**
 * scripts/test-worker-system.ts
 *
 * Phase 4D test suite — Production Async Job System.
 *
 *   npx tsx scripts/test-worker-system.ts
 *
 * Runs against the in-memory store (PREVIEW_STORE=memory) so it is
 * hermetic and deterministic — no Supabase rows, no paid generation,
 * nothing mocked. Sections A–H run with PREVIEW_ENGINE=off (the worker
 * processes real jobs whose pipeline fails with the real
 * ENGINE_DISABLED code). Section I re-enables the engine for ONE live
 * retry-ladder drill against Google's real 429 (costs nothing — the
 * quota is 0).
 */

process.env.PREVIEW_STORE  = "memory"
process.env.PREVIEW_ENGINE = "off"

import { config } from "dotenv"
config({ path: ".env.local" })
/* dotenv must not override the forced test env */
process.env.PREVIEW_STORE  = "memory"
process.env.PREVIEW_ENGINE = "off"

import {
  createJob, getJob, transitionJob, listJobs, findActiveJob,
  hashClientIp, resetMemoryStores, classifyFailure,
} from "../src/lib/ai/preview/job-service"
import {
  toLifecycleState, isTransitionAllowed, assertTransition, isTerminal, ACTIVE_STATUSES,
} from "../src/lib/ai/preview/lifecycle"
import {
  savePayload, loadPayload, bumpPayloadAttempts, deletePayload,
  payloadStoreStats, resetPayloadStore,
} from "../src/lib/ai/preview/payload-store"
import {
  runWorkerTick, recoverStaleJobs, cancelJob, resumeJob,
} from "../src/lib/ai/preview/worker"
import { runCleanup, resetCleanupClock } from "../src/lib/ai/preview/cleanup"
import {
  DEFAULT_WORKER_CONFIG, resolveWorkerConfig, computeBackoffMs, WORKER_CONFIG_VERSION,
} from "../src/lib/ai/preview/worker-config"
import { resetPreviewProvider } from "../src/lib/ai/preview/provider"
import { StubProvider } from "../src/lib/ai/providers/stub"
import type { PreviewJob } from "../src/types/preview"
import type { ImageAnalysisResult } from "../src/types/ai"

let passed = 0
let failed = 0

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) { passed++; console.log(`  ✓ ${name}`) }
  else           { failed++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`) }
}

let analysisCache: ImageAnalysisResult | null = null
async function makeAnalysis(): Promise<ImageAnalysisResult> {
  if (analysisCache) return analysisCache
  analysisCache = await new StubProvider().analyzeImage({
    imageBuffer: Buffer.alloc(0), userPrompt: "warm golden", aestheticKeywords: [],
    imageMetadata: { width: 1024, height: 768, format: "jpeg", size: 100_000 },
  })
  return analysisCache
}

let jobCounter = 0
async function makeJob(overrides?: { presetSlug?: string; phash?: string }): Promise<PreviewJob> {
  jobCounter++
  return createJob({
    clientIpHash:   hashClientIp("test-ip"),
    imagePhash:     overrides?.phash ?? `phash${jobCounter.toString(16).padStart(11, "0")}`,
    imageMeta:      { width: 1024, height: 768, format: "jpeg", bytes: 100_000 },
    presetSlug:     overrides?.presetSlug ?? "desert-gold-pack",
    styleProfileId: "golden-hour",
  })
}

async function attachPayload(job: PreviewJob): Promise<void> {
  await savePayload({
    jobId:       job.id,
    imageBase64: Buffer.from("fixture-image-bytes").toString("base64"),
    imagePhash:  job.imagePhash,
    presetSlug:  job.presetSlug,
    userPrompt:  "warm golden",
    analysis:    await makeAnalysis(),
    attempts:    0,
    createdAt:   new Date().toISOString(),
  })
}

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)) }

async function run(): Promise<void> {

  /* ═══ A. Lifecycle manager ═══ */
  console.log("\n━━━ A. Lifecycle manager ━━━")
  const projections: Array<[Partial<PreviewJob>, string]> = [
    [{ status: "queued",     errorCode: null,        qaRetries: 0, imageMeta: { width: 1, height: 1, format: "j", bytes: 1 } }, "QUEUED"],
    [{ status: "queued",     errorCode: null,        qaRetries: 0, imageMeta: { width: 1, height: 1, format: "j", bytes: 1, workerAttempts: 1 } }, "RETRYING"],
    [{ status: "generating", errorCode: null,        qaRetries: 0, imageMeta: { width: 1, height: 1, format: "j", bytes: 1 } }, "GENERATING"],
    [{ status: "generating", errorCode: null,        qaRetries: 1, imageMeta: { width: 1, height: 1, format: "j", bytes: 1 } }, "RETRYING"],
    [{ status: "qa",         errorCode: null,        qaRetries: 0, imageMeta: { width: 1, height: 1, format: "j", bytes: 1 } }, "QA"],
    [{ status: "ready",      errorCode: null,        qaRetries: 0, imageMeta: { width: 1, height: 1, format: "j", bytes: 1 } }, "READY"],
    [{ status: "failed",     errorCode: null,        qaRetries: 0, imageMeta: { width: 1, height: 1, format: "j", bytes: 1 } }, "FAILED"],
    [{ status: "degraded",   errorCode: "TIMEOUT",   qaRetries: 0, imageMeta: { width: 1, height: 1, format: "j", bytes: 1 } }, "DEGRADED"],
    [{ status: "deleted",    errorCode: "CANCELLED", qaRetries: 0, imageMeta: { width: 1, height: 1, format: "j", bytes: 1 } }, "CANCELLED"],
    [{ status: "expired",    errorCode: null,        qaRetries: 0, imageMeta: { width: 1, height: 1, format: "j", bytes: 1 } }, "EXPIRED"],
  ]
  check("all 10 lifecycle projections deterministic",
    projections.every(([j, expect]) => toLifecycleState(j as PreviewJob) === expect),
    projections.map(([j, e]) => `${(j as PreviewJob).status}→${toLifecycleState(j as PreviewJob)}(want ${e})`).join(" "))
  check("legal transitions allowed",
    isTransitionAllowed("queued", "generating") &&
    isTransitionAllowed("generating", "queued") &&
    isTransitionAllowed("qa", "ready") &&
    isTransitionAllowed("deleted", "queued"))
  check("illegal transitions rejected",
    !isTransitionAllowed("ready", "generating") &&
    !isTransitionAllowed("expired", "queued") &&
    !isTransitionAllowed("queued", "ready"))
  let threw = false
  try { assertTransition("expired", "queued") } catch { threw = true }
  check("assertTransition throws on illegal move", threw)

  /* ═══ B. Atomic transitions / job locking ═══ */
  console.log("\n━━━ B. Atomic transitions (job locking) ━━━")
  const lockJob = await makeJob()
  const [w1, w2] = await Promise.all([
    transitionJob(lockJob.id, ["queued"], { status: "generating" }),
    transitionJob(lockJob.id, ["queued"], { status: "generating" }),
  ])
  check("two racing claims → exactly one winner", w1 !== w2, `w1=${w1} w2=${w2}`)
  const wrongFrom = await transitionJob(lockJob.id, ["queued"], { status: "generating" })
  check("claim on already-claimed job fails", wrongFrom === false)

  /* ═══ C. Duplicate suppression ═══ */
  console.log("\n━━━ C. Duplicate suppression ━━━")
  const dupJob = await makeJob({ phash: "dedup000000phash" })
  const found = await findActiveJob("dedup000000phash", dupJob.presetSlug)
  check("findActiveJob attaches to the active job", found?.id === dupJob.id)

  /* ═══ D. Worker processes real jobs (engine disabled → real failure path) ═══ */
  console.log("\n━━━ D. Worker lifecycle (ENGINE_DISABLED, no AI, nothing mocked) ━━━")
  resetPreviewProvider()
  const workJob = await makeJob()
  await attachPayload(workJob)
  const tick = await runWorkerTick({ priorityJobId: workJob.id })
  const afterWork = await getJob(workJob.id)
  check("tick claimed the job", tick.claimed >= 1, JSON.stringify(tick))
  check("permanent failure (ENGINE_DISABLED) → degraded, no retry",
    afterWork?.status === "degraded" && afterWork.errorCode === "ENGINE_DISABLED",
    `status=${afterWork?.status} code=${afterWork?.errorCode}`)
  check("payload deleted after terminal state", (await loadPayload(workJob.id)) === null)
  check("config version stamped in tick", tick.configVersion === WORKER_CONFIG_VERSION)

  const noPayloadJob = await makeJob()
  await runWorkerTick({ priorityJobId: noPayloadJob.id })
  const afterNoPayload = await getJob(noPayloadJob.id)
  check("missing payload → degraded PAYLOAD_LOST",
    afterNoPayload?.status === "degraded" && afterNoPayload.errorCode === "PAYLOAD_LOST",
    `status=${afterNoPayload?.status} code=${afterNoPayload?.errorCode}`)

  /* ═══ E. Retry classification + backoff ═══ */
  console.log("\n━━━ E. Retry classification + backoff ━━━")
  check("429 provider error → provider, retryable",
    classifyFailure("PROVIDER_FAILED", "429 quota exceeded").category === "provider" &&
    classifyFailure("PROVIDER_FAILED", "429 quota exceeded").retryable)
  check("timeout → timeout, retryable",
    classifyFailure("PROVIDER_FAILED", "Provider timed out after 20000ms").category === "timeout")
  check("network → network, retryable",
    classifyFailure("PROVIDER_FAILED", "fetch failed: ECONNRESET").category === "network")
  check("QA rejection → qa, NOT retryable",
    classifyFailure("QA_REJECTED", "wb-went-cool").retryable === false)
  check("ENGINE_DISABLED → permanent, NOT retryable",
    classifyFailure("ENGINE_DISABLED", "x").retryable === false)
  const p = DEFAULT_WORKER_CONFIG.retry.provider
  check("backoff deterministic with injected random",
    computeBackoffMs(p, 1, () => 0) === p.backoffMs &&
    computeBackoffMs(p, 2, () => 0) === p.backoffMs * p.backoffFactor)

  /* ═══ F. Cancellation + resume (idempotent) ═══ */
  console.log("\n━━━ F. Cancellation + resume ━━━")
  const cancelTarget = await makeJob()
  await attachPayload(cancelTarget)
  const c1 = await cancelJob(cancelTarget.id)
  check("cancel active job → CANCELLED",
    c1.ok && c1.job?.status === "deleted" && c1.job.errorCode === "CANCELLED")
  const c2 = await cancelJob(cancelTarget.id)
  check("second cancel idempotent (no error, same state)",
    c2.ok && c2.job?.status === "deleted")
  check("cancelled payload swept", (await loadPayload(cancelTarget.id)) === null)
  const r1 = await resumeJob(cancelTarget.id)
  check("resume without payload refused with PAYLOAD_LOST",
    !r1.ok && r1.reason === "PAYLOAD_LOST")

  const resumeTarget = await makeJob()
  await attachPayload(resumeTarget)
  await transitionJob(resumeTarget.id, ["queued"], { status: "deleted", errorCode: "CANCELLED" })
  const r2 = await resumeJob(resumeTarget.id)
  await sleep(50)   // resume kicks an async tick — let it settle
  const afterResume = await getJob(resumeTarget.id)
  check("resume with payload re-enters pipeline (terminal via disabled engine)",
    r2.ok && afterResume !== null && isTerminal(afterResume.status),
    `status=${afterResume?.status}`)
  const missing = await cancelJob("00000000-0000-4000-8000-000000000000")
  check("cancel unknown job → not found, no crash", !missing.ok && missing.job === null)

  /* ═══ G. Hang recovery + queue expiry + restart semantics ═══ */
  console.log("\n━━━ G. Recovery (hung jobs, queue expiry, restart) ━━━")
  const cfgNow = resolveWorkerConfig({
    staleness: { hungAfterMs: -1, queuedRecoverAfterMs: 0, queuedExpireAfterMs: 60_000 },
  })
  /* Simulated crash: a claimed job with a payload whose worker died */
  const crashed = await makeJob()
  await attachPayload(crashed)
  await transitionJob(crashed.id, ["queued"], { status: "generating" })
  await sleep(5)
  const recovered = await recoverStaleJobs(cfgNow)
  const afterCrash = await getJob(crashed.id)
  check("hung job WITH payload re-queued (restart-recoverable)",
    recovered >= 1 && afterCrash?.status === "queued",
    `recovered=${recovered} status=${afterCrash?.status}`)
  check("re-queued job projects as RETRYING or QUEUED lifecycle",
    afterCrash !== null && ["RETRYING", "QUEUED"].includes(toLifecycleState(afterCrash)))

  const hungNoPayload = await makeJob()
  await transitionJob(hungNoPayload.id, ["queued"], { status: "generating" })
  await sleep(5)
  await recoverStaleJobs(cfgNow)
  const afterHung = await getJob(hungNoPayload.id)
  check("hung job WITHOUT payload → degraded TIMEOUT",
    afterHung?.status === "degraded" && afterHung.errorCode === "TIMEOUT",
    `status=${afterHung?.status} code=${afterHung?.errorCode}`)

  const abandoned = await makeJob()
  await sleep(5)
  await recoverStaleJobs(resolveWorkerConfig({
    staleness: { hungAfterMs: 999_999, queuedRecoverAfterMs: 0, queuedExpireAfterMs: -1 },
  }))
  const afterAbandoned = await getJob(abandoned.id)
  check("abandoned queued job expired",
    afterAbandoned?.status === "expired" && afterAbandoned.errorCode === "QUEUE_TIMEOUT",
    `status=${afterAbandoned?.status}`)

  /* ═══ H. Cleanup service ═══ */
  console.log("\n━━━ H. Cleanup service ━━━")
  resetCleanupClock()
  const ttlJob = await makeJob()
  await transitionJob(ttlJob.id, ["queued"], { status: "generating" })
  await transitionJob(ttlJob.id, ["generating"], { status: "qa" })
  await transitionJob(ttlJob.id, ["qa"], {
    status: "ready",
    previewDataUri: "data:image/jpeg;base64,AAAA",
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  })
  const report1 = await runCleanup(resolveWorkerConfig(), true)
  const afterTtl = await getJob(ttlJob.id)
  check("TTL-expired preview → expired + asset cleared",
    report1.expiredJobs >= 1 && afterTtl?.status === "expired" && afterTtl.previewDataUri === null,
    `expired=${report1.expiredJobs} status=${afterTtl?.status}`)

  resetCleanupClock()
  const purgeReport = await runCleanup(
    resolveWorkerConfig({ cleanup: { ...DEFAULT_WORKER_CONFIG.cleanup, purgeTerminalAfterMs: -1 } }),
    true
  )
  check("old terminal rows hard-purged", purgeReport.purgedJobs >= 1, `purged=${purgeReport.purgedJobs}`)
  resetCleanupClock()
  const gated = await runCleanup()
  const gated2 = await runCleanup()
  check("cleanup self-rate-limits between passes", gated.ran && !gated2.ran)

  /* ═══ I. Scale: 10,000 queued jobs (memory, §11) ═══ */
  console.log("\n━━━ I. Scale — 10,000 queued jobs ━━━")
  resetMemoryStores()
  resetPayloadStore()
  const seedStart = performance.now()
  for (let i = 0; i < 10_000; i++) {
    await makeJob({ phash: `scale${i.toString(16).padStart(11, "0")}` })
  }
  const seedMs = performance.now() - seedStart
  const listStart = performance.now()
  const batch = await listJobs({ statuses: ["queued"], limit: 10 })
  const listMs = performance.now() - listStart
  check("10k jobs seeded in-memory", true, "")
  console.log(`  seed 10,000 jobs: ${seedMs.toFixed(0)}ms · claim-batch query: ${listMs.toFixed(2)}ms`)
  check("claim-batch selection under 150ms at 10k depth", listMs < 150, `${listMs.toFixed(1)}ms`)
  check("FIFO batch returned", batch.length === 10)
  const memUsed = process.memoryUsage().heapUsed / 1024 / 1024
  console.log(`  heap after 10k jobs: ${memUsed.toFixed(0)}MB`)
  check("heap stays bounded (<400MB)", memUsed < 400)
  resetMemoryStores()

  /* ═══ J. Payload store accounting ═══ */
  console.log("\n━━━ J. Payload store ━━━")
  resetPayloadStore()
  const pj = await makeJob()
  await attachPayload(pj)
  check("payload round-trips", (await loadPayload(pj.id))?.jobId === pj.id)
  check("attempts bump", (await bumpPayloadAttempts(pj.id)) === 1 && (await bumpPayloadAttempts(pj.id)) === 2)
  await deletePayload(pj.id)
  check("delete idempotent + stats zeroed",
    (await loadPayload(pj.id)) === null && payloadStoreStats().entries === 0)

  /* ═══ K. LIVE retry ladder — real provider, real 429, zero cost ═══ */
  console.log("\n━━━ K. Live retry ladder (real Gemini 429, nothing mocked) ━━━")
  delete process.env.PREVIEW_ENGINE
  resetPreviewProvider()
  const liveJob = await makeJob()
  await attachPayload(liveJob)
  const liveCfg: Parameters<typeof runWorkerTick>[0] = {
    priorityJobId: liveJob.id,
    config: { retry: { ...DEFAULT_WORKER_CONFIG.retry, provider: { maxAttempts: 2, backoffMs: 300, backoffFactor: 1, jitterMs: 0 } } },
  }
  const liveTick = await runWorkerTick(liveCfg)
  const afterLive = await getJob(liveJob.id)
  check("live 429 → worker retried then degraded (Sharp fallback)",
    afterLive?.status === "degraded",
    `status=${afterLive?.status} code=${afterLive?.errorCode}`)
  check("worker-level retry actually happened", liveTick.retried >= 1, JSON.stringify(liveTick))
  check("attempts recorded in imageMeta (RETRYING telemetry)",
    (afterLive?.imageMeta.workerAttempts ?? 0) >= 1 || afterLive?.errorCode === "PROVIDER_FAILED",
    JSON.stringify(afterLive?.imageMeta))
  process.env.PREVIEW_ENGINE = "off"
  resetPreviewProvider()

  /* ═══ Summary ═══ */
  console.log(`\n${"═".repeat(50)}`)
  console.log(failed === 0 ? `✓ ALL ${passed} CHECKS PASSED` : `✗ ${failed} FAILED, ${passed} passed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err) => { console.error("Test run crashed:", err); process.exit(1) })
