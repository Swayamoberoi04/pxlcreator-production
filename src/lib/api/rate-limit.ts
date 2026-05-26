/**
 * src/lib/api/rate-limit.ts
 *
 * Lightweight in-process rate limiter used across API routes.
 *
 * Storage: module-level Map — persists for the lifetime of the
 * Node.js process, resets on server restart. Acceptable for MVP;
 * replace the underlying store with Upstash Redis when moving to
 * a distributed / serverless deployment.
 *
 * Usage:
 *   import { makeRateLimiter, getClientIp } from "@/lib/api/rate-limit"
 *
 *   const limiter = makeRateLimiter({ max: 10, windowMs: 60_000 })
 *
 *   export async function POST(req: NextRequest) {
 *     const ip = getClientIp(req)
 *     const limited = limiter.check(ip)
 *     if (limited) return NextResponse.json({ error: "Too many requests" }, { status: 429 })
 *     // ...
 *   }
 */

import type { NextRequest } from "next/server"

interface Entry {
  count:   number
  resetAt: number  // epoch ms
}

interface RateLimiterOptions {
  /** Maximum number of requests allowed per window per key */
  max: number
  /** Rolling window size in milliseconds */
  windowMs: number
}

interface RateLimiter {
  /**
   * Check whether the given key has exceeded the limit.
   * Side-effect: increments the counter for this key.
   * @returns true  → request should be rejected (429)
   * @returns false → request is within limits
   */
  check(key: string): boolean

  /** Remaining requests for this key in the current window. */
  remaining(key: string): number
}

/**
 * Create a new rate limiter instance.
 * Each call returns an independent limiter with its own store.
 */
export function makeRateLimiter({ max, windowMs }: RateLimiterOptions): RateLimiter {
  const store = new Map<string, Entry>()

  function getEntry(key: string): Entry {
    const now   = Date.now()
    const entry = store.get(key)

    if (!entry || now > entry.resetAt) {
      const fresh: Entry = { count: 0, resetAt: now + windowMs }
      store.set(key, fresh)
      return fresh
    }
    return entry
  }

  return {
    check(key: string): boolean {
      const entry = getEntry(key)
      if (entry.count >= max) return true
      entry.count++
      return false
    },

    remaining(key: string): number {
      const entry = store.get(key)
      if (!entry || Date.now() > entry.resetAt) return max
      return Math.max(0, max - entry.count)
    },
  }
}

/**
 * Extract the real client IP from request headers.
 * Reads x-forwarded-for (set by CDN/reverse proxy) then x-real-ip,
 * falling back to "unknown" so rate limiting still applies.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  )
}
