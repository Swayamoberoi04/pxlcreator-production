/**
 * src/lib/ai/preset-intelligence/catalog-cache.ts
 *
 * TTL cache for the preset catalogue, scoped to the intelligence engine.
 *
 * Why: getPresets() is a Supabase network round trip (~1s from some
 * regions) — paying it on every recommendation request blows the <150ms
 * latency budget. Recommendations tolerate a few minutes of catalogue
 * staleness, so we cache with a 5-minute TTL and serve stale data if a
 * refresh fails (availability over freshness).
 *
 * Store pages and other consumers keep calling getPresets() directly —
 * this cache affects the recommendation engine only.
 */

import type { Preset } from "@/types/product"
import { getPresets } from "@/lib/presets/repository"

const TTL_MS = 5 * 60 * 1000

let _presets:   Preset[] | null = null
let _fetchedAt = 0
let _inflight:  Promise<Preset[]> | null = null

export async function getCachedCatalog(): Promise<{ presets: Preset[]; fromCache: boolean }> {
  const fresh = _presets !== null && Date.now() - _fetchedAt < TTL_MS
  if (fresh) return { presets: _presets as Preset[], fromCache: true }

  /* Deduplicate concurrent refreshes */
  if (!_inflight) {
    _inflight = getPresets({ orderBy: "order_index" })
      .then((presets) => {
        _presets   = presets
        _fetchedAt = Date.now()
        return presets
      })
      .finally(() => { _inflight = null })
  }

  try {
    const presets = await _inflight
    return { presets, fromCache: false }
  } catch (err) {
    /* Refresh failed — serve stale if we have anything */
    if (_presets !== null) {
      console.warn(`[ai:intelligence] ${JSON.stringify({ event: "catalog_refresh_failed_serving_stale", error: String(err) })}`)
      return { presets: _presets, fromCache: true }
    }
    throw err
  }
}

/** Test/ops hook. */
export function resetCatalogCache(): void {
  _presets = null
  _fetchedAt = 0
  _inflight = null
}
