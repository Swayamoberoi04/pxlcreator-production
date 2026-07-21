/**
 * src/lib/observability/logger.ts
 *
 * Phase 5 — canonical structured logger.
 *
 * Formalizes the single-line JSON convention the AI subsystems already
 * use (`[scope] {"event":...}`) into a reusable factory, adding level,
 * timestamp, and safe serialization. Existing call sites keep their
 * hand-rolled lines (untouched, same format); new code uses this.
 */

export type LogLevel = "info" | "warn" | "error"

export interface Logger {
  info:  (event: string, data?: Record<string, unknown>) => void
  warn:  (event: string, data?: Record<string, unknown>) => void
  error: (event: string, data?: Record<string, unknown>) => void
}

function emit(scope: string, level: LogLevel, event: string, data?: Record<string, unknown>): void {
  const line = `[${scope}] ${safeJson({ event, level, ts: new Date().toISOString(), ...data })}`
  if (level === "error")      console.error(line)
  else if (level === "warn")  console.warn(line)
  else                        console.log(line)
}

export function createLogger(scope: string): Logger {
  return {
    info:  (event, data) => emit(scope, "info",  event, data),
    warn:  (event, data) => emit(scope, "warn",  event, data),
    error: (event, data) => emit(scope, "error", event, data),
  }
}

/** Serialize defensively — a logging call must never throw. */
function safeJson(obj: Record<string, unknown>): string {
  try {
    return JSON.stringify(obj, (_k, v) => {
      if (v instanceof Error) return { name: v.name, message: v.message }
      if (typeof v === "bigint") return v.toString()
      return v
    })
  } catch {
    return JSON.stringify({ event: obj.event, level: obj.level, serializationFailed: true })
  }
}
