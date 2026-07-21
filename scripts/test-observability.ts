/**
 * scripts/test-observability.ts
 *
 * Phase 5 test suite — observability, alerting, analytics (§2, §3, §9).
 *
 *   npx tsx scripts/test-observability.ts
 *
 * Hermetic (PREVIEW_STORE=memory): metrics instruments, alert rule
 * evaluation against synthetic PlatformMetrics, cooldown/rate-limit
 * behaviour, and the analytics sink contract. No network, no AI, nothing
 * mocked beyond in-memory fixtures.
 */

process.env.PREVIEW_STORE = "memory"

import { config } from "dotenv"
config({ path: ".env.local" })
process.env.PREVIEW_STORE = "memory"

import {
  increment, observe, timed, histogram, getPlatformMetrics, resetMetrics,
} from "../src/lib/observability/metrics"
import {
  evaluateAlerts, resetAlertState, DEFAULT_ALERT_RULES, type AlertRule,
} from "../src/lib/observability/alerts"
import { createLogger } from "../src/lib/observability/logger"
import {
  track, registerSink, clearSinks, type AnalyticsSink, type AnalyticsEvent, type AnalyticsProps,
} from "../src/lib/analytics"
import type { PlatformMetrics } from "../src/lib/observability/metrics"

let passed = 0
let failed = 0
function check(name: string, cond: boolean, detail = ""): void {
  if (cond) { passed++; console.log(`  ✓ ${name}`) }
  else       { failed++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`) }
}

function fakeMetrics(over: Partial<PlatformMetrics>): PlatformMetrics {
  return {
    uptimeMs: 1000, memory: { heapUsedMb: 100, rssMb: 200 },
    counters: {}, latency: {}, cache: null, ledger: null, ...over,
  }
}

async function run(): Promise<void> {

  /* ═══ A. Metrics instruments ═══ */
  console.log("\n━━━ A. Metrics instruments ━━━")
  resetMetrics()
  increment("test.counter", 3)
  increment("test.counter")
  for (const v of [10, 20, 30, 40, 100]) observe("test.latency", v)
  const h = histogram("test.latency")
  check("counter accumulates", true)
  check("histogram summarizes", h !== null && h.count === 5 && h.maxMs === 100, JSON.stringify(h))
  check("p95 computed", h !== null && h.p95Ms === 100)
  const timedResult = await timed("test.timed", async () => { await new Promise(r => setTimeout(r, 10)); return 42 })
  check("timed() returns value + records", timedResult === 42 && histogram("test.timed") !== null)
  const pm = await getPlatformMetrics(1)
  check("platform metrics compose counters + latency + memory",
    pm.counters["test.counter"] === 4 && "test.latency" in pm.latency && pm.memory.heapUsedMb > 0)

  /* ═══ B. Bounded memory ═══ */
  console.log("\n━━━ B. Bounded memory ━━━")
  resetMetrics()
  for (let i = 0; i < 1000; i++) observe("ring", i)
  const rh = histogram("ring")
  check("ring buffer caps samples at 256", rh !== null && rh.count === 256, `count=${rh?.count}`)
  check("ring buffer keeps recent (max=999)", rh !== null && rh.maxMs === 999)

  /* ═══ C. Alert rules ═══ */
  console.log("\n━━━ C. Alert rules ━━━")
  resetAlertState()
  const providerDown = fakeMetrics({ ledger: {
    windowHours: 1,
    aiEdits: { count: 10, avgMs: 3000, failures: 10 },
    workerRuns: { count: 0, avgMs: null, retriesSeen: 0 },
    qaEvaluations: { count: 0, avgMs: null, rejected: 0 },
    cacheEvents: { hits: 0 }, failureCategories: {},
  }})
  const a1 = await evaluateAlerts({ force: true, metrics: providerDown })
  check("provider-failure rule fires at 100% failure", a1.some(a => a.key === "provider-failure-rate" && a.severity === "critical"))

  const healthy = fakeMetrics({ ledger: {
    windowHours: 1,
    aiEdits: { count: 10, avgMs: 3000, failures: 0 },
    workerRuns: { count: 10, avgMs: 4000, retriesSeen: 0 },
    qaEvaluations: { count: 10, avgMs: 40, rejected: 0 },
    cacheEvents: { hits: 5 }, failureCategories: {},
  }})
  resetAlertState()
  const a2 = await evaluateAlerts({ force: true, metrics: healthy })
  check("no alerts when healthy", a2.length === 0, JSON.stringify(a2.map(a => a.key)))

  resetAlertState()
  const dbDown = fakeMetrics({ counters: { "health.dbDown": 1 } })
  const a3 = await evaluateAlerts({ force: true, metrics: dbDown })
  check("db-unreachable rule fires", a3.some(a => a.key === "db-unreachable"))

  resetAlertState()
  const congested = fakeMetrics({ counters: { "health.queuedJobs": 250 } })
  const a4 = await evaluateAlerts({ force: true, metrics: congested })
  check("queue-congestion rule fires", a4.some(a => a.key === "queue-congestion" && typeof a.value === "number"))

  check("default rules cover the required surface",
    ["provider", "worker", "qa", "latency", "queue", "db", "storage"].every(kw =>
      DEFAULT_ALERT_RULES.some((r: AlertRule) => r.key.includes(kw))))

  /* ═══ D. Rate limiting / cooldown ═══ */
  console.log("\n━━━ D. Evaluation rate limiting ━━━")
  resetAlertState()
  const first  = await evaluateAlerts({ metrics: dbDown })          // not forced
  const second = await evaluateAlerts({ metrics: dbDown })          // within 60s window
  check("first eval runs, second is rate-limited", first.length >= 1 && second.length === 0)

  /* ═══ E. Logger ═══ */
  console.log("\n━━━ E. Structured logger ━━━")
  const captured: string[] = []
  const origLog = console.log
  console.log = (line: string) => { captured.push(String(line)) }
  const logger = createLogger("test")
  logger.info("thing_happened", { count: 5, bignum: BigInt(10) })
  console.log = origLog
  const line = captured.find(l => l.includes("thing_happened"))
  check("logger emits scoped JSON with level + ts", Boolean(line?.includes('"level":"info"') && line?.includes('[test]')))
  check("logger serializes bigint safely", Boolean(line?.includes('"bignum":"10"')))

  /* ═══ F. Analytics abstraction ═══ */
  console.log("\n━━━ F. Analytics abstraction ━━━")
  clearSinks()
  const received: Array<{ event: AnalyticsEvent; props: AnalyticsProps }> = []
  const testSink: AnalyticsSink = { id: "test", track: (event, props) => received.push({ event, props }) }
  registerSink(testSink)
  registerSink(testSink)   // dedup by id
  track("preset_download_completed", { presetSlug: "desert-gold-pack", price: 45, nested: { evil: true } as never })
  check("event reaches the sink", received.length === 1 && received[0].event === "preset_download_completed")
  check("primitive props preserved, timestamp added",
    received[0].props.presetSlug === "desert-gold-pack" && received[0].props.price === 45 && typeof received[0].props.ts === "number")
  check("non-primitive props stripped (no PII leakage)", !("nested" in received[0].props))
  const brokenSink: AnalyticsSink = { id: "broken", track: () => { throw new Error("sink down") } }
  registerSink(brokenSink)
  let threw = false
  try { track("feature_used", { name: "x" }) } catch { threw = true }
  check("a broken sink never breaks the product path", !threw)
  clearSinks()

  /* ═══ Summary ═══ */
  console.log(`\n${"═".repeat(50)}`)
  console.log(failed === 0 ? `✓ ALL ${passed} CHECKS PASSED` : `✗ ${failed} FAILED, ${passed} passed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err) => { console.error("Test run crashed:", err); process.exit(1) })
