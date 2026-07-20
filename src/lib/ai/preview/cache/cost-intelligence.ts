/**
 * src/lib/ai/preview/cache/cost-intelligence.ts
 *
 * Phase 4E — cost intelligence + operational metrics (§6, §10).
 *
 * Every avoided generation is booked twice:
 *   - a rolling in-process counter (fast reads for dashboards)
 *   - a best-effort provider_logs row (operation "cache") — the same
 *     existing ledger every other subsystem writes to, zero schema
 *     change, durable across restarts and instances.
 *
 * getOperationalMetrics() aggregates the process counters, the cache
 *  engine stats, and bounded ledger queries into one reusable report —
 * the service future dashboards consume.
 */

import { logProviderCall } from "../job-service"
import { cacheStats, l0Usage } from "./engine"
import { resolveCacheConfig, CACHE_CONFIG_VERSION, type CacheConfig } from "./config"

export type CacheHitSource = "l0" | "l1" | "near-duplicate" | "inflight-dedup"

interface Counters {
  hits:               Record<CacheHitSource, number>
  misses:             number
  duplicatesPrevented: number
  generationsAvoided: number
  savedUsd:           number
  savedLatencyMs:     number
  byPreset:           Map<string, { hits: number; misses: number }>
}

const counters: Counters = {
  hits: { l0: 0, l1: 0, "near-duplicate": 0, "inflight-dedup": 0 },
  misses: 0,
  duplicatesPrevented: 0,
  generationsAvoided: 0,
  savedUsd: 0,
  savedLatencyMs: 0,
  byPreset: new Map(),
}

/* ─────────────────────────────────────────────────────────────
   Recording
───────────────────────────────────────────────────────────── */

export async function recordCacheHit(args: {
  source:     CacheHitSource
  presetSlug: string
  jobIdLike?: string | null
  cfg?:       CacheConfig
}): Promise<void> {
  const cfg = args.cfg ?? resolveCacheConfig()
  counters.hits[args.source]++
  counters.generationsAvoided++
  counters.savedUsd += cfg.cost.perGenerationUsd
  counters.savedLatencyMs += cfg.cost.perHitLatencySavedMs
  if (args.source === "near-duplicate" || args.source === "inflight-dedup") {
    counters.duplicatesPrevented++
  }
  bump(args.presetSlug, "hits")

  /* Durable ledger row — provider_logs, operation "cache" */
  await logProviderCall({
    jobId:     args.jobIdLike ?? null,
    provider:  "cache-engine",
    operation: "cache",
    latencyMs: 0,
    tokensOrUnits: {
      event:        "hit",
      source:       args.source,
      presetSlug:   args.presetSlug,
      savedUsd:     cfg.cost.perGenerationUsd,
      configVersion: CACHE_CONFIG_VERSION,
    },
    costUsd: -cfg.cost.perGenerationUsd,   // negative = savings, sums cleanly
    error:   null,
  })
}

export function recordCacheMiss(presetSlug: string): void {
  counters.misses++
  bump(presetSlug, "misses")
}

function bump(preset: string, field: "hits" | "misses"): void {
  const entry = counters.byPreset.get(preset) ?? { hits: 0, misses: 0 }
  entry[field]++
  counters.byPreset.set(preset, entry)
  /* bounded memory: keep the 200 hottest presets */
  if (counters.byPreset.size > 200) {
    const coldest = [...counters.byPreset.entries()]
      .sort((a, b) => (a[1].hits + a[1].misses) - (b[1].hits + b[1].misses))[0]
    if (coldest) counters.byPreset.delete(coldest[0])
  }
}

/* ─────────────────────────────────────────────────────────────
   Reporting (§10) — the reusable dashboard service
───────────────────────────────────────────────────────────── */

export interface OperationalMetrics {
  configVersion: string
  cache: ReturnType<typeof cacheStats>
  l0:    { bytes: number; entries: number }
  counters: {
    hits: Record<CacheHitSource, number>
    misses: number
    hitRatio: number
    duplicatesPrevented: number
    generationsAvoided: number
    estimatedSavedUsd: number
    estimatedSavedLatencyMs: number
  }
  generationFrequencyByPreset: Array<{ presetSlug: string; hits: number; misses: number }>
  ledger: {
    /** From provider_logs (bounded window): real spend vs. booked savings */
    windowDays:        number
    generationSpendUsd: number
    cacheSavedUsd:      number
    avgGenerationMs:    number | null
    avgWorkerMs:        number | null
    workerJobs:         number
  } | null
}

export async function getOperationalMetrics(windowDays = 7): Promise<OperationalMetrics> {
  const totalHits = Object.values(counters.hits).reduce((a, b) => a + b, 0)

  const metrics: OperationalMetrics = {
    configVersion: CACHE_CONFIG_VERSION,
    cache: cacheStats(),
    l0:    l0Usage(),
    counters: {
      hits: { ...counters.hits },
      misses: counters.misses,
      hitRatio: totalHits + counters.misses > 0
        ? Math.round((totalHits / (totalHits + counters.misses)) * 1000) / 1000
        : 0,
      duplicatesPrevented: counters.duplicatesPrevented,
      generationsAvoided:  counters.generationsAvoided,
      estimatedSavedUsd:      Math.round(counters.savedUsd * 100) / 100,
      estimatedSavedLatencyMs: counters.savedLatencyMs,
    },
    generationFrequencyByPreset: [...counters.byPreset.entries()]
      .map(([presetSlug, v]) => ({ presetSlug, ...v }))
      .sort((a, b) => (b.hits + b.misses) - (a.hits + a.misses))
      .slice(0, 20),
    ledger: null,
  }

  /* Durable ledger aggregation (bounded, best-effort) */
  if (process.env.PREVIEW_STORE?.trim().toLowerCase() !== "memory" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin")
      const supabase = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient
      const since = new Date(Date.now() - windowDays * 24 * 60 * 60_000).toISOString()
      const { data, error } = await supabase
        .from("provider_logs")
        .select("operation,latency_ms,cost_usd")
        .gte("created_at", since)
        .limit(5_000)
      if (error) throw error

      let spend = 0, saved = 0, genMs = 0, genN = 0, workMs = 0, workN = 0
      for (const row of data ?? []) {
        const cost = (row.cost_usd as number | null) ?? 0
        if (row.operation === "edit")   { spend += Math.max(cost, 0); genMs += (row.latency_ms as number) ?? 0; genN++ }
        if (row.operation === "cache")  { saved += Math.abs(Math.min(cost, 0)) }
        if (row.operation === "worker") { workMs += (row.latency_ms as number) ?? 0; workN++ }
      }
      metrics.ledger = {
        windowDays,
        generationSpendUsd: Math.round(spend * 100) / 100,
        cacheSavedUsd:      Math.round(saved * 100) / 100,
        avgGenerationMs:    genN > 0 ? Math.round(genMs / genN) : null,
        avgWorkerMs:        workN > 0 ? Math.round(workMs / workN) : null,
        workerJobs:         workN,
      }
    } catch { /* metrics stay process-local */ }
  }

  return metrics
}

/** Test hook. */
export function resetCostCounters(): void {
  counters.hits = { l0: 0, l1: 0, "near-duplicate": 0, "inflight-dedup": 0 }
  counters.misses = 0
  counters.duplicatesPrevented = 0
  counters.generationsAvoided = 0
  counters.savedUsd = 0
  counters.savedLatencyMs = 0
  counters.byPreset.clear()
}
