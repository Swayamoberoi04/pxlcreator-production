/**
 * src/lib/version.ts
 *
 * Single source of truth for the deployed build identity, surfaced by
 * health/readiness endpoints and structured logs. Resolves from the
 * platform's commit SHA env var when present (Vercel/most CI set one),
 * else falls back to the package version.
 */

export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  "0.1.0"

export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || "dev"
