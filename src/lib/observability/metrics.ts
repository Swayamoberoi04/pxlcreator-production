/**
 * src/lib/observability/metrics.ts
 *
 * Phase 5 — unified operational metrics facade.
 *
 * Two roles:
 *   1. A lightweight in-process instrument: counters + rolling latency
 *      histograms (bounded ring buffers) with a `timed()` wrapper any
 *      route or service can adopt without ceremony.
 *   2. A single aggregation point — getPlatformMetrics() composes the
 *      instruments here with the telemetry the platform ALREADY
 *      produces (Phase 4E cache/cost metrics, provider_logs ledger:
 *      worker/AI/QA latencies, retry + failure counts) into one
 *      dashboard-ready report. Nothing existing is modified; this
 *      layer only reads.
 *
 * Memory bounds (§11 discipline): ≤128 metrics, ≤256 samples each.
 */

const MAX_METRICS = 128
const MAX_SAMPLES = 256

interface Series {
  samples: number[]   // ring buffer
  next:    number
  count:   number
  sum:     number
}

const series   = new Map<string, Series>()
const counters = new Map<string, number>()
const startedAt = Date.now()

/* ─────────────────────────────────────────────────────────────
   Instruments
───────────────────────────────────────────────────────────── */

export function increment(metric: string, by = 1): void {
  counters.set(metric, (counters.get(metric) ?? 0) + by)
}

export function observe(metric: string, valueMs: number): void {
  let s = series.get(metric)
  if (!s) {
    if (series.size >= MAX_METRICS) return   // refuse to grow unbounded
    s = { samples: new Array(MAX_SAMPLES).fill(0), next: 0, count: 0, sum: 0 }
    series.set(metric, s)
  }
  if (s.count >= MAX_SAMPLES) s.sum -= s.samples[s.next]
  s.samples[s.next] = valueMs
  s.next = (s.next + 1) % MAX_SAMPLES
  s.count = Math.min(s.count + 1, MAX_SAMPLES)
  s.sum += valueMs
}

/** Time an async operation into a metric; rethrows unchanged. */
export async function timed<T>(metric: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now()
  try {
    return await fn()
  } finally {
    observe(metric, performance.now() - t0)
  }
}

export interface HistogramSummary {
  count: number
  avgMs: number
  p50Ms: number
  p95Ms: number
  maxMs: number
}

export function histogram(metric: string): HistogramSummary | null {
  const s = series.get(metric)
  if (!s || s.count === 0) return null
  const values = s.samples.slice(0, s.count).slice().sort((a, b) => a - b)
  return {
    count: s.count,
    avgMs: round2(s.sum / s.count),
    p50Ms: round2(values[Math.floor(values.length * 0.5)]),
    p95Ms: round2(values[Math.min(values.length - 1, Math.floor(values.length * 0.95))]),
    maxMs: round2(values[values.length - 1]),
  }
}

/* ─────────────────────────────────────────────────────────────
   Platform aggregation (§2) — the dashboard service
───────────────────────────────────────────────────────────── */

export interface PlatformMetrics {
  uptimeMs: number
  memory:   { heapUsedMb: number; rssMb: number }
  counters: Record<string, number>
  latency:  Record<string, HistogramSummary>
  /** Phase 4E cache + cost intelligence (composed, read-only) */
  cache:    unknown
  /** provider_logs aggregates over the window: AI / worker / QA
      latencies, retries, failure categories */
  ledger: {
    windowHours: number
    aiEdits:       { count: number; avgMs: number | null; failures: number }
    workerRuns:    { count: number; avgMs: number | null; retriesSeen: number }
    qaEvaluations: { count: number; avgMs: number | null; rejected: number }
    cacheEvents:   { hits: number }
    failureCategories: Record<string, number>
  } | null
}

export async function getPlatformMetrics(windowHours = 24): Promise<PlatformMetrics> {
  const mem = process.memoryUsage()
  const out: PlatformMetrics = {
    uptimeMs: Date.now() - startedAt,
    memory: {
      heapUsedMb: round2(mem.heapUsed / 1024 / 1024),
      rssMb:      round2(mem.rss / 1024 / 1024),
    },
    counters: Object.fromEntries(counters),
    latency:  {},
    cache:    null,
    ledger:   null,
  }
  for (const key of series.keys()) {
    const h = histogram(key)
    if (h) out.latency[key] = h
  }

  /* Compose Phase 4E cost intelligence (read-only) */
  try {
    const { getOperationalMetrics } = await import("@/lib/ai/preview/cache/cost-intelligence")
    out.cache = await getOperationalMetrics(Math.max(1, Math.round(windowHours / 24)) || 1)
  } catch { /* cache metrics unavailable — report what we have */ }

  /* Ledger aggregates (read-only over the existing provider_logs) */
  if (process.env.PREVIEW_STORE?.trim().toLowerCase() !== "memory" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin")
      const supabase = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient
      const since = new Date(Date.now() - windowHours * 60 * 60_000).toISOString()
      const { data, error } = await supabase
        .from("provider_logs")
        .select("operation,latency_ms,error,tokens_or_units")
        .gte("created_at", since)
        .limit(5_000)
      if (error) throw error

      const agg = {
        ai:   { count: 0, ms: 0, failures: 0 },
        work: { count: 0, ms: 0, retries: 0 },
        qa:   { count: 0, ms: 0, rejected: 0 },
        cacheHits: 0,
        categories: {} as Record<string, number>,
      }
      for (const row of data ?? []) {
        const ms = (row.latency_ms as number) ?? 0
        const units = row.tokens_or_units as Record<string, unknown> | null
        switch (row.operation) {
          case "edit":
            agg.ai.count++; agg.ai.ms += ms
            if (row.error) agg.ai.failures++
            break
          case "worker": {
            agg.work.count++; agg.work.ms += ms
            const attempt = Number(units?.attempt ?? 1)
            if (attempt > 1) agg.work.retries++
            const cat = String(units?.category ?? "")
            if (cat && cat !== "null") agg.categories[cat] = (agg.categories[cat] ?? 0) + 1
            break
          }
          case "qa":
            agg.qa.count++; agg.qa.ms += ms
            if (row.error) agg.qa.rejected++
            break
          case "cache":
            agg.cacheHits++
            break
        }
      }
      out.ledger = {
        windowHours,
        aiEdits:       { count: agg.ai.count,   avgMs: agg.ai.count ? Math.round(agg.ai.ms / agg.ai.count) : null, failures: agg.ai.failures },
        workerRuns:    { count: agg.work.count, avgMs: agg.work.count ? Math.round(agg.work.ms / agg.work.count) : null, retriesSeen: agg.work.retries },
        qaEvaluations: { count: agg.qa.count,   avgMs: agg.qa.count ? Math.round(agg.qa.ms / agg.qa.count) : null, rejected: agg.qa.rejected },
        cacheEvents:   { hits: agg.cacheHits },
        failureCategories: agg.categories,
      }
    } catch { /* ledger unavailable — process metrics still returned */ }
  }

  return out
}

/** Test hook. */
export function resetMetrics(): void {
  series.clear()
  counters.clear()
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}
