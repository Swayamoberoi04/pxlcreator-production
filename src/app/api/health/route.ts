/**
 * GET /api/health — liveness probe (§3).
 *
 * Cheap, dependency-free: proves the Node process is up and serving.
 * Never touches the database or storage, so a DB blip does not mark the
 * instance dead and trigger a needless restart. Load balancers and
 * uptime monitors poll this.
 */

import { APP_VERSION } from "@/lib/version"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(): Response {
  return Response.json(
    {
      status:  "ok",
      service: "pxl-creator",
      version: APP_VERSION,
      ts:      new Date().toISOString(),
      uptimeS: Math.round(process.uptime()),
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
