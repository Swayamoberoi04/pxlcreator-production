/**
 * /api/admin/ai-cache — Phase 4E cache operations (admin-guarded).
 *
 * GET  → operational metrics (§10): hit ratios, lookup latency,
 *        savings, storage, worker utilization
 * POST → { action: "invalidate", namespace?, keyContains?, all? }
 *        { action: "optimize-storage" }
 *        { action: "warm" }
 *
 * Protected twice: the proxy matcher on /api/admin/* plus requireAdmin
 * here (defence-in-depth, same as every admin route).
 */

import type { NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin/guard"
import { getOperationalMetrics } from "@/lib/ai/preview/cache/cost-intelligence"
import { cacheInvalidate } from "@/lib/ai/preview/cache/engine"
import { runStorageOptimizer } from "@/lib/ai/preview/cache/storage-optimizer"
import { runCacheWarming } from "@/lib/ai/preview/cache/warming"
import type { CacheNamespace } from "@/lib/ai/preview/cache/config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const NAMESPACES: CacheNamespace[] = ["preview", "metadata", "feature", "prompt", "qa", "provider"]

export async function GET(): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  const metrics = await getOperationalMetrics(7)
  return Response.json({ success: true, metrics }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest): Promise<Response> {
  const deny = await requireAdmin()
  if (deny) return deny

  let body: { action?: unknown; namespace?: unknown; keyContains?: unknown; all?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body." }, { status: 400 })
  }

  switch (body.action) {
    case "invalidate": {
      const namespace = NAMESPACES.includes(body.namespace as CacheNamespace)
        ? (body.namespace as CacheNamespace)
        : undefined
      const keyContains = typeof body.keyContains === "string" && body.keyContains.length > 0
        ? body.keyContains.slice(0, 120)
        : undefined
      const all = body.all === true
      if (!all && !namespace && !keyContains) {
        return Response.json(
          { success: false, error: "Provide namespace, keyContains, or all:true." },
          { status: 400 }
        )
      }
      const result = await cacheInvalidate({ namespace, keyContains, all })
      return Response.json({ success: true, action: "invalidate", ...result })
    }

    case "optimize-storage": {
      const report = await runStorageOptimizer()
      return Response.json({ success: true, action: "optimize-storage", report })
    }

    case "warm": {
      const report = await runCacheWarming()
      return Response.json({ success: true, action: "warm", report })
    }

    default:
      return Response.json(
        { success: false, error: "Unknown action. Use invalidate | optimize-storage | warm." },
        { status: 400 }
      )
  }
}
