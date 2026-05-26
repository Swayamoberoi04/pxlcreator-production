/**
 * src/instrumentation.ts
 *
 * Next.js server lifecycle hook — runs once at startup before
 * any request is served. Used here to validate required env vars
 * so misconfigurations are caught at deploy time, not mid-request.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateServerEnv } = await import("@/lib/env")
    validateServerEnv()
  }
}
