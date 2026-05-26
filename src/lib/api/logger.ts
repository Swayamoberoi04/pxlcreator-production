/**
 * src/lib/api/logger.ts
 *
 * Lightweight structured server-side logger for API routes.
 *
 * Outputs JSON lines to stdout/stderr so they can be ingested by
 * Vercel Logs, Datadog, Logtail, or any structured log aggregator.
 *
 * Usage:
 *   import { log } from "@/lib/api/logger"
 *
 *   log.info("checkout", "order created", { order_id, email })
 *   log.warn("auth",     "invalid token", { ip })
 *   log.error("payment", "signature failed", { razorpay_order_id })
 *   log.security("admin", "unauthorised access attempt", { ip, path })
 */

type LogLevel = "info" | "warn" | "error" | "security"

interface LogEntry {
  ts:      string      // ISO timestamp
  level:   LogLevel
  domain:  string      // e.g. "checkout", "auth", "download"
  message: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any   // arbitrary structured fields
}

function write(level: LogLevel, domain: string, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    ts:      new Date().toISOString(),
    level,
    domain,
    message,
    ...meta,
  }
  const line = JSON.stringify(entry)

  if (level === "error" || level === "security") {
    console.error(line)
  } else {
    console.log(line)
  }
}

export const log = {
  info(domain: string, message: string, meta?: Record<string, unknown>) {
    write("info", domain, message, meta)
  },
  warn(domain: string, message: string, meta?: Record<string, unknown>) {
    write("warn", domain, message, meta)
  },
  error(domain: string, message: string, meta?: Record<string, unknown>) {
    write("error", domain, message, meta)
  },
  /** Use for auth failures, unauthorised access, signature mismatches. */
  security(domain: string, message: string, meta?: Record<string, unknown>) {
    write("security", domain, message, meta)
  },
}
