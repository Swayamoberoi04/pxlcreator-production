/**
 * src/lib/ai/preview/cache/config.ts
 *
 * Phase 4E — central, versioned cache configuration.
 *
 * CACHE_CONFIG_VERSION is stamped into telemetry; ENGINE_VERSION is a
 * component of every preview cache key, so bumping it rotates the whole
 * preview cache (passive invalidation — stale entries simply stop
 * matching and age out via TTL).
 */

export const CACHE_CONFIG_VERSION = "c4e.1.0.0"

/**
 * Preview-engine generation version — part of every preview cache key.
 * Bump when the generation semantics change in a way that makes old
 * previews unrepresentative (e.g. new provider defaults, new
 * normalization size).
 */
export const ENGINE_VERSION = "e4"

export type CacheNamespace =
  | "preview"     // generated previews (bucket path or inline data URI)
  | "metadata"    // image metadata per content hash
  | "feature"     // extracted image features per content hash
  | "prompt"      // built instructions per (analysis, preset, profile)
  | "qa"          // QA verdicts per (original, preview, qa config)
  | "provider"    // raw provider responses (pre-QA) — survives QA re-tuning

export interface TtlClass {
  ttlMs: number
  /** Sliding extension applied when an entry proves popular */
  extendOnHit?: { hitThreshold: number; extendToMs: number }
}

export interface CacheConfig {
  /* ── L0 (in-process) bounds per namespace ── */
  l0: {
    maxEntries: Record<CacheNamespace, number>
    /** Approximate byte cap across all L0 namespaces */
    maxTotalBytes: number
  }

  /* ── Adaptive expiration (§9) ── */
  ttl: {
    /** Standard preview entries */
    preview:       TtlClass
    /** Inline data-URI previews (heavier rows) — shorter life */
    previewInline: TtlClass
    /** Non-preview namespaces */
    metadata: TtlClass
    feature:  TtlClass
    prompt:   TtlClass
    qa:       TtlClass
    provider: TtlClass
  }

  /* ── Near-duplicate detection (§4) ── */
  duplicates: {
    enabled: boolean
    /** Max Hamming distance (64-bit dHash) to treat as the same photo */
    maxHammingDistance: number
    /** Per-preset candidate index size loaded from L1 */
    indexLimitPerPreset: number
  }

  /* ── Cache warming (§8) ── */
  warming: {
    enabled: boolean
    strategy: "popular-presets" | "recent-presets" | "off"
    /** How many presets to warm per pass */
    topPresets: number
    /** Warming only ever ENQUEUES work when the preview provider is
        available — with generation unavailable it warms the free
        layers (knowledge base, prompts, L0 priming) and stops. */
    maxGenerationsPerPass: number
  }

  /* ── Storage optimizer (§7) ── */
  storage: {
    /** Re-encode bucket previews larger than this (bytes) */
    compressOverBytes: number
    /** JPEG quality for re-encoded previews */
    compressQuality: number
    /** Max objects handled per optimizer pass */
    batchLimit: number
  }

  /* ── Cost model (§6) ── */
  cost: {
    /** Savings booked per avoided generation (provider cost) */
    perGenerationUsd: number
    /** Latency saved per cache hit vs. a full generation (ms) */
    perHitLatencySavedMs: number
  }
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  l0: {
    maxEntries: {
      preview:  500,
      metadata: 2_000,
      feature:  300,
      prompt:   1_000,
      qa:       500,
      provider: 100,
    },
    maxTotalBytes: 64 * 1024 * 1024,
  },
  ttl: {
    preview:       { ttlMs: 24 * 60 * 60_000, extendOnHit: { hitThreshold: 3, extendToMs: 7 * 24 * 60 * 60_000 } },
    previewInline: { ttlMs: 6 * 60 * 60_000 },
    metadata:      { ttlMs: 24 * 60 * 60_000 },
    feature:       { ttlMs: 60 * 60_000 },
    prompt:        { ttlMs: 24 * 60 * 60_000 },
    qa:            { ttlMs: 6 * 60 * 60_000 },
    provider:      { ttlMs: 24 * 60 * 60_000 },
  },
  duplicates: {
    enabled:             true,
    maxHammingDistance:  4,
    indexLimitPerPreset: 500,
  },
  warming: {
    enabled:  true,
    strategy: "popular-presets",
    topPresets: 5,
    maxGenerationsPerPass: 0,   // generation warming stays off until billing
  },
  storage: {
    compressOverBytes: 350 * 1024,
    compressQuality:   80,
    batchLimit:        50,
  },
  cost: {
    perGenerationUsd:     0.04,
    perHitLatencySavedMs: 8_000,
  },
}

export function resolveCacheConfig(override?: Partial<CacheConfig>): CacheConfig {
  if (!override) return DEFAULT_CACHE_CONFIG
  return {
    l0: {
      maxEntries: { ...DEFAULT_CACHE_CONFIG.l0.maxEntries, ...override.l0?.maxEntries },
      maxTotalBytes: override.l0?.maxTotalBytes ?? DEFAULT_CACHE_CONFIG.l0.maxTotalBytes,
    },
    ttl:        { ...DEFAULT_CACHE_CONFIG.ttl,        ...override.ttl },
    duplicates: { ...DEFAULT_CACHE_CONFIG.duplicates, ...override.duplicates },
    warming:    { ...DEFAULT_CACHE_CONFIG.warming,    ...override.warming },
    storage:    { ...DEFAULT_CACHE_CONFIG.storage,    ...override.storage },
    cost:       { ...DEFAULT_CACHE_CONFIG.cost,       ...override.cost },
  }
}
