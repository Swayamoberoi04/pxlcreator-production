/**
 * src/lib/observability/alerts.ts
 *
 * Phase 5 — monitoring & alerting (§3).
 *
 * Pull-based by design: rules evaluate the telemetry the platform
 * already emits (provider_logs ledger, cache stats, health probes) —
 * no existing subsystem was modified to "push" alerts. evaluateAlerts()
 * runs from the readiness endpoint (opportunistic, self-rate-limited)
 * and from any platform cron for guaranteed cadence.
 *
 * Dispatch is provider-agnostic: a generic JSON POST to
 * ALERT_WEBHOOK_URL (Slack/Discord/PagerDuty adapters are all one
 * webhook away). Without the env var, alerts land in structured logs —
 * still visible in the hosting platform's log alerting.
 *
 * Each alert key has a cooldown so a persistent condition pages once
 * per window, not once per request.
 */

import { createLogger } from "./logger"
import { getPlatformMetrics, type PlatformMetrics } from "./metrics"

const log = createLogger("alerts")

export interface Alert {
  key:      string
  severity: "warning" | "critical"
  message:  string
  value?:   number | string
}

export interface AlertRule {
  key:      string
  severity: Alert["severity"]
  /** Return a message when the condition is breached, null otherwise */
  check: (m: PlatformMetrics) => { message: string; value?: number | string } | null
}

/* ─────────────────────────────────────────────────────────────
   Default rules (§3: worker/storage/provider/db failures, latency,
   queue congestion, cache failures, degraded AI service)
───────────────────────────────────────────────────────────── */

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    key: "provider-failure-rate", severity: "critical",
    check: (m) => {
      const ai = m.ledger?.aiEdits
      if (!ai || ai.count < 3) return null
      const rate = ai.failures / ai.count
      return rate >= 0.8
        ? { message: `AI provider failing: ${ai.failures}/${ai.count} edits failed in window`, value: rate }
        : null
    },
  },
  {
    key: "worker-retry-storm", severity: "warning",
    check: (m) => {
      const w = m.ledger?.workerRuns
      if (!w || w.count < 5) return null
      const rate = w.retriesSeen / w.count
      return rate >= 0.5
        ? { message: `Worker retry storm: ${w.retriesSeen}/${w.count} runs were retries`, value: rate }
        : null
    },
  },
  {
    key: "qa-rejection-rate", severity: "warning",
    check: (m) => {
      const qa = m.ledger?.qaEvaluations
      if (!qa || qa.count < 5) return null
      const rate = qa.rejected / qa.count
      return rate >= 0.5
        ? { message: `QA rejecting heavily: ${qa.rejected}/${qa.count} evaluations`, value: rate }
        : null
    },
  },
  {
    key: "ai-latency-high", severity: "warning",
    check: (m) => {
      const avg = m.ledger?.aiEdits.avgMs
      return avg !== null && avg !== undefined && avg > 15_000
        ? { message: `AI generation latency high: avg ${avg}ms`, value: avg }
        : null
    },
  },
  {
    key: "request-latency-high", severity: "warning",
    check: (m) => {
      const h = m.latency["http.preview.post"]
      return h && h.count >= 10 && h.p95Ms > 5_000
        ? { message: `Preview POST p95 ${h.p95Ms}ms over 5s`, value: h.p95Ms }
        : null
    },
  },
  {
    key: "queue-congestion", severity: "warning",
    check: (m) => {
      const queued = m.counters["health.queuedJobs"]
      return typeof queued === "number" && queued > 100
        ? { message: `Preview queue congested: ${queued} queued jobs`, value: queued }
        : null
    },
  },
  {
    key: "db-unreachable", severity: "critical",
    check: (m) => m.counters["health.dbDown"]
      ? { message: "Database probe failing" }
      : null,
  },
  {
    key: "storage-unreachable", severity: "critical",
    check: (m) => m.counters["health.storageDown"]
      ? { message: "Storage probe failing" }
      : null,
  },
  {
    key: "heap-pressure", severity: "warning",
    check: (m) => m.memory.heapUsedMb > 900
      ? { message: `Heap ${m.memory.heapUsedMb}MB`, value: m.memory.heapUsedMb }
      : null,
  },
]

/* ─────────────────────────────────────────────────────────────
   Evaluation + dispatch
───────────────────────────────────────────────────────────── */

const COOLDOWN_MS = 15 * 60_000
const lastFired = new Map<string, number>()

let _lastEvalAt = 0
const EVAL_MIN_INTERVAL_MS = 60_000

export async function evaluateAlerts(opts?: {
  rules?: AlertRule[]
  force?: boolean
  metrics?: PlatformMetrics
}): Promise<Alert[]> {
  const now = Date.now()
  if (!opts?.force && now - _lastEvalAt < EVAL_MIN_INTERVAL_MS) return []
  _lastEvalAt = now

  const rules = opts?.rules ?? DEFAULT_ALERT_RULES
  const metrics = opts?.metrics ?? await getPlatformMetrics(1)

  const triggered: Alert[] = []
  for (const rule of rules) {
    try {
      const hit = rule.check(metrics)
      if (!hit) continue
      const alert: Alert = { key: rule.key, severity: rule.severity, ...hit }
      triggered.push(alert)

      const last = lastFired.get(rule.key) ?? 0
      if (now - last >= COOLDOWN_MS) {
        lastFired.set(rule.key, now)
        await dispatch(alert)
      }
    } catch (err) {
      log.error("alert_rule_crashed", { rule: rule.key, error: err instanceof Error ? err.message : String(err) })
    }
  }
  return triggered
}

async function dispatch(alert: Alert): Promise<void> {
  log[alert.severity === "critical" ? "error" : "warn"]("alert_triggered", { ...alert })

  const webhook = process.env.ALERT_WEBHOOK_URL?.trim()
  if (!webhook) return
  try {
    await fetch(webhook, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source:   "pxl-creator",
        severity: alert.severity,
        key:      alert.key,
        /* `text` doubles as the Slack-compatible field */
        text:     `[${alert.severity.toUpperCase()}] pxl-creator: ${alert.message}`,
        message:  alert.message,
        value:    alert.value ?? null,
        ts:       new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5_000),
    })
  } catch (err) {
    log.error("alert_webhook_failed", { key: alert.key, error: err instanceof Error ? err.message : String(err) })
  }
}

/** Test hooks. */
export function resetAlertState(): void {
  lastFired.clear()
  _lastEvalAt = 0
}
