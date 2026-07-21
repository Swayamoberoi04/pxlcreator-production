/**
 * src/lib/analytics/index.ts
 *
 * Phase 5 — provider-agnostic analytics abstraction (§9).
 *
 * A typed event taxonomy over a pluggable sink interface. Product code
 * calls track(...) with a well-known event name; the actual destination
 * (GA4, Plausible, PostHog, Segment, a custom collector) is a sink
 * registered at startup — swapping vendors touches ONE file, never the
 * call sites.
 *
 * Defaults are safe: no sink registered ⇒ events are dropped (with a
 * dev-only console sink available). No PII is accepted by the type
 * system — event props are a bounded, primitive-only record.
 *
 * Client-safe (no server-only imports); the same track() works in React
 * components and route handlers.
 */

export type AnalyticsEvent =
  /* Studio / AI */
  | "studio_image_uploaded"
  | "studio_analysis_completed"
  | "studio_preview_requested"
  | "studio_preview_ready"
  | "studio_preview_degraded"
  | "recommendation_shown"
  | "recommendation_clicked"
  /* Commerce */
  | "preset_viewed"
  | "preset_download_started"
  | "preset_download_completed"
  | "add_to_cart"
  | "checkout_started"
  | "checkout_completed"
  | "checkout_failed"
  /* Engagement */
  | "signup_started"
  | "signup_completed"
  | "feature_used"

export type AnalyticsProps = Record<string, string | number | boolean | null>

export interface AnalyticsSink {
  readonly id: string
  track(event: AnalyticsEvent, props: AnalyticsProps): void
  identify?(anonymousId: string, traits?: AnalyticsProps): void
}

/* ─────────────────────────────────────────────────────────────
   Registry
───────────────────────────────────────────────────────────── */

const sinks: AnalyticsSink[] = []

export function registerSink(sink: AnalyticsSink): void {
  if (!sinks.some((s) => s.id === sink.id)) sinks.push(sink)
}

export function clearSinks(): void {
  sinks.length = 0
}

/* ─────────────────────────────────────────────────────────────
   Public API
───────────────────────────────────────────────────────────── */

export function track(event: AnalyticsEvent, props: AnalyticsProps = {}): void {
  const enriched: AnalyticsProps = { ...sanitize(props), ts: Date.now() }
  for (const sink of sinks) {
    try {
      sink.track(event, enriched)
    } catch {
      /* a broken sink must never break the product path */
    }
  }
}

export function identify(anonymousId: string, traits: AnalyticsProps = {}): void {
  for (const sink of sinks) {
    try {
      sink.identify?.(anonymousId, sanitize(traits))
    } catch { /* ignore */ }
  }
}

/**
 * Strip anything non-primitive and cap string length — the sink
 * contract guarantees no nested objects / no oversized values reach a
 * vendor, and the type already forbids obvious PII shapes.
 */
function sanitize(props: AnalyticsProps): AnalyticsProps {
  const out: AnalyticsProps = {}
  for (const [k, v] of Object.entries(props)) {
    if (v === null || typeof v === "number" || typeof v === "boolean") out[k] = v
    else if (typeof v === "string") out[k] = v.slice(0, 200)
  }
  return out
}

/* ─────────────────────────────────────────────────────────────
   Built-in sinks
───────────────────────────────────────────────────────────── */

/** Dev/debug sink — structured console line, mirrors the log convention. */
export const consoleSink: AnalyticsSink = {
  id: "console",
  track(event, props) {
    console.log(`[analytics] ${JSON.stringify({ event, ...props })}`)
  },
}

/**
 * Auto-register the console sink in development so events are visible
 * during local work; production registers a real sink at startup
 * (e.g. in a client provider) and this stays quiet.
 */
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  registerSink(consoleSink)
}
