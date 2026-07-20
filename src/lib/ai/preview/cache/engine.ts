/**
 * src/lib/ai/preview/cache/engine.ts
 *
 * Phase 4E — the multi-level cache engine.
 *
 *   L0  in-process LRU per namespace (microsecond hits, bounded
 *       entries + total bytes — §11 memory discipline)
 *   L1  the migration-020 preview_cache table (durable, cross-instance).
 *       Non-preview namespaces store JSON payloads in the existing
 *       preview_data_uri text column under namespaced keys — one table,
 *       six namespaces, ZERO schema change.
 *
 * Reads: L0 → L1 (L1 hits re-warm L0). Writes: both levels.
 * Every lookup is timed; per-namespace hit/miss/latency stats feed the
 * cost-intelligence service. Adaptive expiration (§9): popular preview
 * entries get their TTL extended on hit per config.ttl.*.extendOnHit.
 */

import type { CacheNamespace, CacheConfig, TtlClass } from "./config"
import { resolveCacheConfig } from "./config"
import { namespacePrefix } from "./keys"

/* ─────────────────────────────────────────────────────────────
   Entry shapes
───────────────────────────────────────────────────────────── */

export interface CacheEntry {
  /** For "preview": a bucket path OR inline data URI. For other
      namespaces: a JSON-serialized payload. */
  value:       string
  /** "path" = value is a bucket object path needing signed-URL
      resolution by the caller; "inline" = value is directly usable */
  kind:        "path" | "inline"
  expiresAt:   number
  hitCount:    number
  sourceJobId: string | null
  /** Which level served this read (set on cacheGet returns) */
  level?:      "l0" | "l1"
}

interface L0Slot { entry: CacheEntry; bytes: number }

/* ─────────────────────────────────────────────────────────────
   L0 stores (module-level, per process)
───────────────────────────────────────────────────────────── */

const l0: Map<CacheNamespace, Map<string, L0Slot>> = new Map()
let l0Bytes = 0

function l0Map(ns: CacheNamespace): Map<string, L0Slot> {
  let m = l0.get(ns)
  if (!m) { m = new Map(); l0.set(ns, m) }
  return m
}

/* ─────────────────────────────────────────────────────────────
   Stats (per namespace, per process)
───────────────────────────────────────────────────────────── */

export interface NamespaceStats {
  hits: number; misses: number
  l0Hits: number; l1Hits: number
  totalLookupMs: number; lookups: number
  writes: number
}

const stats = new Map<CacheNamespace, NamespaceStats>()

function nsStats(ns: CacheNamespace): NamespaceStats {
  let s = stats.get(ns)
  if (!s) {
    s = { hits: 0, misses: 0, l0Hits: 0, l1Hits: 0, totalLookupMs: 0, lookups: 0, writes: 0 }
    stats.set(ns, s)
  }
  return s
}

/* ─────────────────────────────────────────────────────────────
   L1 access (preview_cache table — untouched schema)
───────────────────────────────────────────────────────────── */

function supabaseAvailable(): boolean {
  if (process.env.PREVIEW_STORE?.trim().toLowerCase() === "memory") return false
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function adminClient() {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  return createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient
}

/* ─────────────────────────────────────────────────────────────
   Public API
───────────────────────────────────────────────────────────── */

export async function cacheGet(
  ns: CacheNamespace,
  key: string,
  cfg: CacheConfig = resolveCacheConfig()
): Promise<CacheEntry | null> {
  const s = nsStats(ns)
  const started = performance.now()
  try {
    /* L0 */
    const m = l0Map(ns)
    const slot = m.get(key)
    if (slot) {
      if (slot.entry.expiresAt > Date.now()) {
        /* LRU refresh: re-insert at the tail */
        m.delete(key); m.set(key, slot)
        slot.entry.hitCount++
        s.hits++; s.l0Hits++
        return { ...slot.entry, level: "l0" }
      }
      l0Delete(ns, key)
    }

    /* L1 */
    if (supabaseAvailable()) {
      try {
        const supabase = await adminClient()
        const { data, error } = await supabase
          .from("preview_cache").select("*").eq("cache_key", key).maybeSingle()
        if (error) throw error
        if (data && new Date(data.expires_at as string).getTime() > Date.now()) {
          const entry: CacheEntry = {
            value:       (data.preview_path ?? data.preview_data_uri ?? "") as string,
            kind:        data.preview_path ? "path" : "inline",
            expiresAt:   new Date(data.expires_at as string).getTime(),
            hitCount:    ((data.hit_count as number) ?? 0) + 1,
            sourceJobId: (data.source_job_id ?? null) as string | null,
          }
          if (!entry.value) return miss(s)

          /* Adaptive expiration: popular entries live longer (§9) */
          const ttlClass = ttlClassFor(ns, entry.kind, cfg)
          let newExpiry: string | undefined
          if (ttlClass.extendOnHit && entry.hitCount >= ttlClass.extendOnHit.hitThreshold) {
            const extended = Date.now() + ttlClass.extendOnHit.extendToMs
            if (extended > entry.expiresAt) {
              entry.expiresAt = extended
              newExpiry = new Date(extended).toISOString()
            }
          }
          void supabase.from("preview_cache")
            .update({ hit_count: entry.hitCount, ...(newExpiry ? { expires_at: newExpiry } : {}) })
            .eq("cache_key", key)
            .then(() => undefined, () => undefined)

          l0Set(ns, key, entry, cfg)
          s.hits++; s.l1Hits++
          return { ...entry, level: "l1" }
        }
      } catch { /* L1 unavailable — treat as miss */ }
    }

    return miss(s)
  } finally {
    s.lookups++
    s.totalLookupMs += performance.now() - started
  }
}

export async function cacheSet(
  ns: CacheNamespace,
  key: string,
  value: string,
  opts: { kind?: "path" | "inline"; sourceJobId?: string | null; cfg?: CacheConfig } = {}
): Promise<void> {
  const cfg = opts.cfg ?? resolveCacheConfig()
  const kind = opts.kind ?? "inline"
  const ttlClass = ttlClassFor(ns, kind, cfg)
  const entry: CacheEntry = {
    value, kind,
    expiresAt:   Date.now() + ttlClass.ttlMs,
    hitCount:    0,
    sourceJobId: opts.sourceJobId ?? null,
  }
  nsStats(ns).writes++
  l0Set(ns, key, entry, cfg)

  if (!supabaseAvailable()) return
  try {
    const supabase = await adminClient()
    await supabase.from("preview_cache").upsert({
      cache_key:        key,
      preview_path:     kind === "path" ? value : null,
      preview_data_uri: kind === "inline" ? value : null,
      expires_at:       new Date(entry.expiresAt).toISOString(),
      hit_count:        0,
      source_job_id:    entry.sourceJobId,
    })
  } catch (err) {
    log("cache_l1_write_failed", { ns, error: msg(err) })
  }
}

/**
 * Manual + targeted invalidation (§5). Version changes never need this
 * (keys rotate); this handles operator intervention and preset edits.
 */
export async function cacheInvalidate(scope: {
  namespace?: CacheNamespace
  /** Only entries whose key contains this fragment (e.g. a preset slug) */
  keyContains?: string
  all?: boolean
}): Promise<{ l0Removed: number; l1Removed: number }> {
  let l0Removed = 0
  const namespaces: CacheNamespace[] = scope.namespace
    ? [scope.namespace]
    : ["preview", "metadata", "feature", "prompt", "qa", "provider"]

  for (const ns of namespaces) {
    const m = l0Map(ns)
    for (const key of [...m.keys()]) {
      if (scope.all || !scope.keyContains || key.includes(scope.keyContains)) {
        l0Delete(ns, key)
        l0Removed++
      }
    }
  }

  let l1Removed = 0
  if (supabaseAvailable()) {
    try {
      const supabase = await adminClient()
      for (const ns of namespaces) {
        let query = supabase.from("preview_cache").delete().like("cache_key", `${namespacePrefix(ns)}%`)
        if (!scope.all && scope.keyContains) {
          query = query.like("cache_key", `%${scope.keyContains}%`)
        }
        const { data, error } = await query.select("cache_key")
        if (error) throw error
        l1Removed += data?.length ?? 0
      }
    } catch (err) {
      log("cache_invalidate_l1_failed", { error: msg(err) })
    }
  }

  log("cache_invalidated", { ...scope, l0Removed, l1Removed })
  return { l0Removed, l1Removed }
}

/** Recent L1 preview entries for one preset — near-duplicate index feed. */
export async function listPreviewEntriesForPreset(
  presetSlug: string,
  limit: number
): Promise<Array<{ cacheKey: string }>> {
  if (!supabaseAvailable()) {
    return [...l0Map("preview").keys()]
      .filter((k) => k.includes(`:${presetSlug}:`))
      .slice(0, limit)
      .map((cacheKey) => ({ cacheKey }))
  }
  try {
    const supabase = await adminClient()
    const { data, error } = await supabase
      .from("preview_cache")
      .select("cache_key")
      .like("cache_key", `${namespacePrefix("preview")}%`)
      .like("cache_key", `%:${presetSlug}:%`)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []).map((r) => ({ cacheKey: r.cache_key as string }))
  } catch {
    return []
  }
}

/* ─────────────────────────────────────────────────────────────
   Stats + introspection (§10)
───────────────────────────────────────────────────────────── */

export function cacheStats(): Record<string, NamespaceStats & { avgLookupMs: number; hitRatio: number; l0Entries: number }> {
  const out: Record<string, NamespaceStats & { avgLookupMs: number; hitRatio: number; l0Entries: number }> = {}
  const namespaces: CacheNamespace[] = ["preview", "metadata", "feature", "prompt", "qa", "provider"]
  for (const ns of namespaces) {
    const s = nsStats(ns)
    out[ns] = {
      ...s,
      avgLookupMs: s.lookups > 0 ? Math.round((s.totalLookupMs / s.lookups) * 100) / 100 : 0,
      hitRatio:    s.hits + s.misses > 0 ? Math.round((s.hits / (s.hits + s.misses)) * 1000) / 1000 : 0,
      l0Entries:   l0Map(ns).size,
    }
  }
  return out
}

export function l0Usage(): { bytes: number; entries: number } {
  let entries = 0
  for (const m of l0.values()) entries += m.size
  return { bytes: l0Bytes, entries }
}

/** Test hook. */
export function resetCacheEngine(): void {
  l0.clear()
  l0Bytes = 0
  stats.clear()
}

/* ─────────────────────────────────────────────────────────────
   Internals
───────────────────────────────────────────────────────────── */

function miss(s: NamespaceStats): null {
  s.misses++
  return null
}

function ttlClassFor(ns: CacheNamespace, kind: "path" | "inline", cfg: CacheConfig): TtlClass {
  if (ns === "preview") return kind === "inline" ? cfg.ttl.previewInline : cfg.ttl.preview
  return cfg.ttl[ns]
}

function l0Set(ns: CacheNamespace, key: string, entry: CacheEntry, cfg: CacheConfig): void {
  const m = l0Map(ns)
  const bytes = entry.value.length + key.length + 128
  const prev = m.get(key)
  if (prev) l0Bytes -= prev.bytes
  m.set(key, { entry, bytes })
  l0Bytes += bytes

  /* Per-namespace entry cap */
  const cap = cfg.l0.maxEntries[ns]
  while (m.size > cap) {
    const oldest = m.keys().next().value
    if (!oldest) break
    l0Delete(ns, oldest)
  }
  /* Global byte cap — evict from the heaviest namespaces first (preview/provider) */
  const order: CacheNamespace[] = ["provider", "preview", "feature", "qa", "prompt", "metadata"]
  let guard = 10_000
  while (l0Bytes > cfg.l0.maxTotalBytes && guard-- > 0) {
    let evicted = false
    for (const heavyNs of order) {
      const hm = l0Map(heavyNs)
      const oldest = hm.keys().next().value
      if (oldest) { l0Delete(heavyNs, oldest); evicted = true; break }
    }
    if (!evicted) break
  }
}

function l0Delete(ns: CacheNamespace, key: string): void {
  const m = l0Map(ns)
  const slot = m.get(key)
  if (slot) {
    m.delete(key)
    l0Bytes -= slot.bytes
  }
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function log(event: string, data: Record<string, unknown>): void {
  console.log(`[ai:cache] ${JSON.stringify({ event, ...data })}`)
}
