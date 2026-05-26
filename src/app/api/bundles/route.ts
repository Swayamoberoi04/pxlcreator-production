/**
 * src/app/api/bundles/route.ts
 *
 * GET /api/bundles
 *
 * Returns all published bundles (or just featured ones via ?featured=true).
 * Used by client components that need bundles at runtime (e.g. lazy-loaded
 * sections). Most pages fetch server-side via the repository directly.
 *
 * Query params:
 *   featured=true   — return only featured bundles
 *   limit=N         — cap the response count
 */

import { NextResponse }  from "next/server"
import { getBundles }    from "@/lib/bundles/repository"

export const dynamic   = "force-dynamic"
export const revalidate = 60   // 1 minute cache

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const featured = searchParams.get("featured") === "true"
  const limitRaw = searchParams.get("limit")
  const limit    = limitRaw ? parseInt(limitRaw, 10) : undefined

  try {
    const bundles = await getBundles({
      featured: featured || undefined,
      limit,
    })
    return NextResponse.json({ bundles })
  } catch (err) {
    console.error("[GET /api/bundles]", err)
    return NextResponse.json({ error: "Failed to fetch bundles" }, { status: 500 })
  }
}
