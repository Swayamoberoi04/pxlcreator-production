/**
 * src/lib/ai/preview/cache/duplicates.ts
 *
 * Phase 4E — near-duplicate request detection (§4).
 *
 * The exact preview key already collapses byte-identical re-uploads
 * (same dHash ⇒ same key, filename irrelevant). This module catches the
 * next ring out: the SAME photograph re-encoded, re-saved, or trivially
 * recompressed — perceptually identical but hash-perturbed by a few
 * bits. Within the configured Hamming tolerance (default ≤4 of 64 bits,
 * the same "visually identical" band the Phase 4C QA similarity module
 * uses) the cached preview for the twin is served instead of paying for
 * a fresh generation.
 *
 * Candidates come from the cache engine's per-preset key listing — the
 * phash is a parseable segment of every preview key, so the index needs
 * no extra storage. Distance is the Phase 4B phashDistance (reused
 * untouched). Deterministic: closest match wins; ties break on key
 * order.
 */

import { phashDistance } from "../phash"
import { parsePreviewKey } from "./keys"
import { listPreviewEntriesForPreset, cacheGet, type CacheEntry } from "./engine"
import type { CacheConfig } from "./config"
import { resolveCacheConfig } from "./config"

export interface NearDuplicateHit {
  entry:      CacheEntry
  cacheKey:   string
  distance:   number
  twinPhash:  string
}

export async function findNearDuplicate(
  imagePhash: string,
  presetSlug: string,
  cfg: CacheConfig = resolveCacheConfig()
): Promise<NearDuplicateHit | null> {
  if (!cfg.duplicates.enabled) return null

  const candidates = await listPreviewEntriesForPreset(presetSlug, cfg.duplicates.indexLimitPerPreset)
  if (candidates.length === 0) return null

  let best: { cacheKey: string; distance: number; twinPhash: string } | null = null
  for (const { cacheKey } of candidates) {
    const parsed = parsePreviewKey(cacheKey)
    if (!parsed || parsed.presetSlug !== presetSlug) continue
    if (!/^[0-9a-f]{16}$/.test(parsed.imagePhash)) continue

    const distance = phashDistance(imagePhash, parsed.imagePhash)
    if (distance === 0) continue   // exact key — the caller already checked it
    if (distance > cfg.duplicates.maxHammingDistance) continue
    if (
      best === null ||
      distance < best.distance ||
      (distance === best.distance && cacheKey < best.cacheKey)
    ) {
      best = { cacheKey, distance, twinPhash: parsed.imagePhash }
    }
  }
  if (!best) return null

  const entry = await cacheGet("preview", best.cacheKey, cfg)
  if (!entry) return null

  return { entry, cacheKey: best.cacheKey, distance: best.distance, twinPhash: best.twinPhash }
}
