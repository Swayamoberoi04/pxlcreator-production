/**
 * src/lib/ai/preset-intelligence/knowledge-base.ts
 *
 * The Preset Knowledge Base — cached, lazily-built intelligence for the
 * whole catalogue.
 *
 * Performance contract:
 *   - Built ONCE per catalogue version (signature = ids + count).
 *     A changed catalogue (new preset, edited preset list) triggers a
 *     transparent rebuild; an unchanged one is a Map lookup.
 *   - Generation is O(n) over presets; relationship discovery
 *     (similar / complementary) is O(n) per preset, computed lazily on
 *     first access and memoized — never O(n²) up front. This is what
 *     lets the same architecture serve 22 or 5,000 presets.
 *
 * Server-only.
 */

import type { Preset } from "@/types/product"
import type { PresetIntelligence } from "@/types/preset-intelligence"
import { generatePresetIntelligence } from "./metadata-generator"

export interface KnowledgeBase {
  /** slug → intelligence */
  entries:  Map<string, PresetIntelligence>
  /** slug → source preset (for building recommendation cards) */
  presets:  Map<string, Preset>
  builtAt:  string
  signature: string
  fromCache: boolean
}

/* ── Module-level cache (per server process) ── */
let _cache: KnowledgeBase | null = null
const _relationshipCache = new Map<string, { similar: string[]; complementary: string[] }>()

function catalogSignature(presets: Preset[]): string {
  /* Cheap, order-independent fingerprint of the catalogue */
  return `${presets.length}:${presets.map((p) => p.id).sort().join(",")}`
}

/**
 * Returns the knowledge base for the given catalogue,
 * building it only when the catalogue has changed.
 */
export function getKnowledgeBase(presets: Preset[]): KnowledgeBase {
  const signature = catalogSignature(presets)

  if (_cache && _cache.signature === signature) {
    return { ..._cache, fromCache: true }
  }

  const entries = new Map<string, PresetIntelligence>()
  const presetMap = new Map<string, Preset>()

  for (const preset of presets) {
    entries.set(preset.slug, generatePresetIntelligence(preset))
    presetMap.set(preset.slug, preset)
  }

  _relationshipCache.clear()
  _cache = {
    entries,
    presets: presetMap,
    builtAt: new Date().toISOString(),
    signature,
    fromCache: false,
  }
  return _cache
}

/** Test/ops hook — force a rebuild on next access. */
export function resetKnowledgeBase(): void {
  _cache = null
  _relationshipCache.clear()
}

/* ═══════════════════════════════════════════════════════════════
   RELATIONSHIPS — lazy, memoized, never hardcoded
═══════════════════════════════════════════════════════════════ */

/**
 * Fills similarPresets / complementaryPresets for one entry, on demand.
 *
 * similar        = closest overall look (metadata similarity)
 * complementary  = same shooting context (scene + lighting overlap)
 *                  but a different look — "also works for this shoot".
 */
export function getRelationships(
  kb:   KnowledgeBase,
  slug: string,
  limit = 4
): { similar: string[]; complementary: string[] } {
  const cacheKey = `${kb.signature}:${slug}:${limit}`
  const cached = _relationshipCache.get(cacheKey)
  if (cached) return cached

  const self = kb.entries.get(slug)
  if (!self) return { similar: [], complementary: [] }

  const scored: Array<{ slug: string; lookSim: number; contextSim: number }> = []

  for (const [otherSlug, other] of kb.entries) {
    if (otherSlug === slug) continue
    scored.push({
      slug:       otherSlug,
      lookSim:    lookSimilarity(self, other),
      contextSim: contextSimilarity(self, other),
    })
  }

  const similar = [...scored]
    .sort((a, b) => b.lookSim - a.lookSim)
    .slice(0, limit)
    .map((s) => s.slug)

  const complementary = [...scored]
    /* Same shooting context, deliberately different look */
    .sort((a, b) => (b.contextSim - b.lookSim * 0.5) - (a.contextSim - a.lookSim * 0.5))
    .filter((s) => !similar.includes(s.slug))
    .slice(0, limit)
    .map((s) => s.slug)

  const result = { similar, complementary }
  _relationshipCache.set(cacheKey, result)
  return result
}

/** How alike two presets LOOK — colour, mood, tone character. */
function lookSimilarity(a: PresetIntelligence, b: PresetIntelligence): number {
  let score = 0
  score += 0.30 * jaccard(a.dominantColors, b.dominantColors)
  score += 0.25 * jaccard(a.mood, b.mood)
  score += 0.15 * (a.whiteBalance === b.whiteBalance ? 1 : sameLean(a.whiteBalance, b.whiteBalance) ? 0.5 : 0)
  score += 0.10 * (a.contrastLevel === b.contrastLevel ? 1 : 0)
  score += 0.10 * (a.saturationLevel === b.saturationLevel ? 1 : 0)
  score += 0.10 * jaccard(a.aestheticTags, b.aestheticTags)
  return score
}

/** How alike two presets' SHOOTING CONTEXT is — scene + lighting. */
function contextSimilarity(a: PresetIntelligence, b: PresetIntelligence): number {
  let score = 0
  score += 0.45 * sceneScoreSimilarity(a, b)
  score += 0.35 * jaccard(a.lightingConditions, b.lightingConditions)
  score += 0.20 * jaccard(a.timeOfDay, b.timeOfDay)
  return score
}

function sceneScoreSimilarity(a: PresetIntelligence, b: PresetIntelligence): number {
  const genres = Object.keys(a.sceneScores) as Array<keyof PresetIntelligence["sceneScores"]>
  let dot = 0, magA = 0, magB = 0
  for (const g of genres) {
    dot  += a.sceneScores[g] * b.sceneScores[g]
    magA += a.sceneScores[g] ** 2
    magB += b.sceneScores[g] ** 2
  }
  return magA > 0 && magB > 0 ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setB = new Set(b)
  const inter = a.filter((x) => setB.has(x)).length
  return inter / (new Set([...a, ...b]).size)
}

function sameLean(a: string, b: string): boolean {
  const warm = (s: string) => s.includes("warm")
  const cool = (s: string) => s.includes("cool")
  return (warm(a) && warm(b)) || (cool(a) && cool(b))
}
