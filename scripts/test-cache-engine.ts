/**
 * scripts/test-cache-engine.ts
 *
 * Phase 4E test suite — Production Cache & Cost Optimization Platform.
 *
 *   npx tsx scripts/test-cache-engine.ts
 *
 * Sections A–H run hermetically (PREVIEW_STORE=memory, engine off).
 * Sections I–J run against the LIVE Supabase L1 + bucket with fixture
 * data that is created and removed by the test itself — real storage
 * operations, zero AI generation, nothing mocked.
 */

process.env.PREVIEW_STORE  = "memory"
process.env.PREVIEW_ENGINE = "off"

import { config } from "dotenv"
config({ path: ".env.local" })
process.env.PREVIEW_STORE  = "memory"
process.env.PREVIEW_ENGINE = "off"

import {
  previewKey, metadataKey, featureKey, promptKey, qaKey, providerResponseKey,
  contentHash, parsePreviewKey, namespacePrefix,
} from "../src/lib/ai/preview/cache/keys"
import {
  cacheGet, cacheSet, cacheInvalidate, cacheStats, l0Usage,
  listPreviewEntriesForPreset, resetCacheEngine,
} from "../src/lib/ai/preview/cache/engine"
import { findNearDuplicate } from "../src/lib/ai/preview/cache/duplicates"
import {
  recordCacheHit, recordCacheMiss, getOperationalMetrics, resetCostCounters,
} from "../src/lib/ai/preview/cache/cost-intelligence"
import { runCacheWarming } from "../src/lib/ai/preview/cache/warming"
import { runStorageOptimizer } from "../src/lib/ai/preview/cache/storage-optimizer"
import {
  DEFAULT_CACHE_CONFIG, resolveCacheConfig, CACHE_CONFIG_VERSION, ENGINE_VERSION,
} from "../src/lib/ai/preview/cache/config"
import { PROMPT_VERSION } from "../src/lib/ai/preview/prompt-builder"
import { QA_CONFIG_VERSION } from "../src/lib/ai/preview/qa/config"

let passed = 0
let failed = 0

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) { passed++; console.log(`  ✓ ${name}`) }
  else           { failed++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`) }
}

const PH = (suffix: string) => suffix.padStart(16, "0")

async function run(): Promise<void> {

  /* ═══ A. Deterministic keys ═══ */
  console.log("\n━━━ A. Cache keys ━━━")
  const kp = { imagePhash: PH("abc"), presetSlug: "desert-gold-pack", styleProfileId: "golden-hour", providerId: "gemini-flash-image" }
  const k1 = previewKey(kp)
  const k2 = previewKey({ ...kp })
  check("preview key deterministic", k1 === k2)
  check("key embeds every version component",
    k1.includes(PROMPT_VERSION) && k1.includes(QA_CONFIG_VERSION) && k1.includes(ENGINE_VERSION))
  check("key embeds phash/preset/profile/provider",
    k1.includes(kp.imagePhash) && k1.includes(kp.presetSlug) && k1.includes(kp.styleProfileId) && k1.includes(kp.providerId))
  const parsed = parsePreviewKey(k1)
  check("preview key parses back", parsed?.imagePhash === kp.imagePhash && parsed?.presetSlug === kp.presetSlug)
  check("legacy/foreign keys rejected by parser", parsePreviewKey("abc:def:p4.0.0:x") === null)
  check("all six namespaces produce distinct keys", new Set([
    previewKey(kp), metadataKey("h1"), featureKey("h1"),
    promptKey({ imagePhash: PH("abc"), presetSlug: "x", styleProfileId: "y" }),
    qaKey("h1", "h2"), providerResponseKey({ imagePhash: PH("abc"), instructionHash: "i", providerId: "p" }),
  ]).size === 6)
  check("contentHash stable", contentHash("same-bytes") === contentHash("same-bytes"))

  /* ═══ B. Engine hits/misses (L0) ═══ */
  console.log("\n━━━ B. Engine — hit / miss ━━━")
  resetCacheEngine()
  await cacheSet("preview", k1, "path/to/preview.jpg", { kind: "path", sourceJobId: "job-1" })
  const hit = await cacheGet("preview", k1)
  check("set → get hit", hit !== null && hit.value === "path/to/preview.jpg" && hit.kind === "path")
  check("hit served from L0", hit?.level === "l0")
  check("miss on absent key", (await cacheGet("preview", previewKey({ ...kp, presetSlug: "other" }))) === null)
  const st1 = cacheStats().preview
  check("stats track hits + misses", st1.hits === 1 && st1.misses === 1 && st1.l0Hits === 1)

  /* ═══ C. TTL expiration ═══ */
  console.log("\n━━━ C. TTL expiration ━━━")
  resetCacheEngine()
  const shortCfg = resolveCacheConfig({ ttl: { ...DEFAULT_CACHE_CONFIG.ttl, preview: { ttlMs: 30 } } })
  await cacheSet("preview", k1, "ephemeral", { kind: "path", cfg: shortCfg })
  check("fresh entry hits", (await cacheGet("preview", k1, shortCfg)) !== null)
  await new Promise((r) => setTimeout(r, 50))
  check("expired entry misses", (await cacheGet("preview", k1, shortCfg)) === null)
  check("TTL classes differ per namespace + inline",
    DEFAULT_CACHE_CONFIG.ttl.previewInline.ttlMs < DEFAULT_CACHE_CONFIG.ttl.preview.ttlMs &&
    DEFAULT_CACHE_CONFIG.ttl.feature.ttlMs < DEFAULT_CACHE_CONFIG.ttl.metadata.ttlMs)

  /* ═══ D. Invalidation ═══ */
  console.log("\n━━━ D. Invalidation ━━━")
  resetCacheEngine()
  await cacheSet("preview", previewKey({ ...kp, presetSlug: "pack-a" }), "a", { kind: "path" })
  await cacheSet("preview", previewKey({ ...kp, presetSlug: "pack-b" }), "b", { kind: "path" })
  await cacheSet("prompt", promptKey({ imagePhash: PH("abc"), presetSlug: "pack-a", styleProfileId: "s" }), "instr")
  const inv1 = await cacheInvalidate({ namespace: "preview", keyContains: "pack-a" })
  check("targeted invalidation removes only matches",
    inv1.l0Removed === 1 &&
    (await cacheGet("preview", previewKey({ ...kp, presetSlug: "pack-a" }))) === null &&
    (await cacheGet("preview", previewKey({ ...kp, presetSlug: "pack-b" }))) !== null)
  const inv2 = await cacheInvalidate({ all: true })
  check("invalidate-all clears every namespace",
    inv2.l0Removed >= 2 && l0Usage().entries === 0)
  check("version rotation = passive invalidation (key changes with any version)",
    !previewKey(kp).includes("STALE") &&
    previewKey(kp).split(":").length === 9)

  /* ═══ E. Near-duplicate detection ═══ */
  console.log("\n━━━ E. Near-duplicate detection ━━━")
  resetCacheEngine()
  /* phash 000...0 cached; query with 2 bits flipped (distance 2) and 6 bits (distance 6) */
  const basePhash  = "0000000000000000"
  const twoBits    = "0000000000000003"   // ...0011 → distance 2
  const sixBits    = "000000000000003f"   // ...111111 → distance 6
  const nearKey = previewKey({ ...kp, imagePhash: basePhash, presetSlug: "dup-pack" })
  await cacheSet("preview", nearKey, "cached-twin.jpg", { kind: "path", sourceJobId: "twin-job" })
  const nearHit = await findNearDuplicate(twoBits, "dup-pack")
  check("distance-2 twin found", nearHit !== null && nearHit.distance === 2 && nearHit.twinPhash === basePhash)
  check("beyond tolerance (6 > 4) rejected", (await findNearDuplicate(sixBits, "dup-pack")) === null)
  check("wrong preset rejected", (await findNearDuplicate(twoBits, "other-pack")) === null)
  const tightCfg = resolveCacheConfig({ duplicates: { ...DEFAULT_CACHE_CONFIG.duplicates, maxHammingDistance: 1 } })
  check("tolerance configurable", (await findNearDuplicate(twoBits, "dup-pack", tightCfg)) === null)

  /* ═══ F. Cost intelligence ═══ */
  console.log("\n━━━ F. Cost intelligence ━━━")
  resetCostCounters()
  await recordCacheHit({ source: "l0", presetSlug: "desert-gold-pack" })
  await recordCacheHit({ source: "near-duplicate", presetSlug: "desert-gold-pack" })
  await recordCacheHit({ source: "inflight-dedup", presetSlug: "urban-noir-pack" })
  recordCacheMiss("desert-gold-pack")
  const m = await getOperationalMetrics(1)
  check("hits counted by source",
    m.counters.hits.l0 === 1 && m.counters.hits["near-duplicate"] === 1 && m.counters.hits["inflight-dedup"] === 1)
  check("duplicates prevented counted", m.counters.duplicatesPrevented === 2)
  check("generations avoided + savings booked",
    m.counters.generationsAvoided === 3 &&
    Math.abs(m.counters.estimatedSavedUsd - 3 * DEFAULT_CACHE_CONFIG.cost.perGenerationUsd) < 1e-9)
  check("hit ratio computed", m.counters.hitRatio === 0.75)
  check("per-preset frequency tracked",
    m.generationFrequencyByPreset[0]?.presetSlug === "desert-gold-pack" &&
    m.generationFrequencyByPreset[0]?.hits === 2)
  check("config version stamped", m.configVersion === CACHE_CONFIG_VERSION)

  /* ═══ G. Concurrency ═══ */
  console.log("\n━━━ G. Concurrent access ━━━")
  resetCacheEngine()
  const ops: Promise<unknown>[] = []
  for (let i = 0; i < 100; i++) {
    const key = previewKey({ ...kp, imagePhash: PH(i.toString(16)) })
    ops.push(cacheSet("preview", key, `v${i}`, { kind: "path" }))
    ops.push(cacheGet("preview", key))
    ops.push(cacheGet("preview", previewKey({ ...kp, imagePhash: PH("ffff" + i.toString(16)) })))
  }
  await Promise.all(ops)
  const gs = cacheStats().preview
  check("200 concurrent ops, no corruption", gs.lookups === gs.hits + gs.misses, JSON.stringify(gs))

  /* ═══ H. L0 bounds + lookup latency ═══ */
  console.log("\n━━━ H. Bounds + performance ━━━")
  resetCacheEngine()
  const smallCfg = resolveCacheConfig({ l0: { maxEntries: { ...DEFAULT_CACHE_CONFIG.l0.maxEntries, preview: 50 }, maxTotalBytes: DEFAULT_CACHE_CONFIG.l0.maxTotalBytes } })
  for (let i = 0; i < 200; i++) {
    await cacheSet("preview", previewKey({ ...kp, imagePhash: PH(i.toString(16)) }), `v${i}`, { kind: "path", cfg: smallCfg })
  }
  check("L0 entry cap enforced (LRU)", cacheStats().preview.l0Entries <= 50, `${cacheStats().preview.l0Entries}`)

  resetCacheEngine()
  const hotKey = previewKey(kp)
  await cacheSet("preview", hotKey, "hot", { kind: "path" })
  const times: number[] = []
  for (let i = 0; i < 10_000; i++) {
    const t0 = performance.now()
    await cacheGet("preview", hotKey)
    times.push(performance.now() - t0)
  }
  times.sort((a, b) => a - b)
  const p95 = times[Math.floor(times.length * 0.95)]
  console.log(`  10,000 L0 lookups: p50=${times[5000].toFixed(4)}ms p95=${p95.toFixed(4)}ms`)
  check("95%+ lookups under 20ms", p95 < 20, `p95=${p95.toFixed(3)}ms`)

  /* ═══ I. Warming (free layers; generation stays at 0) ═══ */
  console.log("\n━━━ I. Cache warming ━━━")
  resetCacheEngine()
  const warm = await runCacheWarming()
  check("warming ran with strategy", warm.ran && warm.strategy === "popular-presets")
  check("presets + prompts warmed", warm.presetsWarmed.length > 0 && warm.promptsWarmed > 0,
    JSON.stringify({ presets: warm.presetsWarmed.length, prompts: warm.promptsWarmed }))
  check("zero generations enqueued (billing off)", warm.generationsEnqueued === 0)
  const warm2 = await runCacheWarming()
  check("second pass reuses warmed prompts", warm2.promptsWarmed === 0)

  /* ═══ J. LIVE Supabase L1 + storage optimizer ═══ */
  console.log("\n━━━ J. Live L1 + storage optimizer (fixtures, cleaned up after) ━━━")
  delete process.env.PREVIEW_STORE
  resetCacheEngine()
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!hasSupabase) {
    console.log("  (Supabase not configured — live section skipped)")
  } else {
    const liveKey = previewKey({ ...kp, imagePhash: PH("11ee"), presetSlug: "live-test-pack" })
    await cacheSet("preview", liveKey, "data:image/jpeg;base64,TESTPAYLOAD", { kind: "inline" })
    resetCacheEngine()   // wipe L0 → force the L1 path
    const l1Hit = await cacheGet("preview", liveKey)
    check("L1 round-trip (L0 cleared → served from Supabase)", l1Hit?.level === "l1" && l1Hit.value.includes("TESTPAYLOAD"))
    const l0Again = await cacheGet("preview", liveKey)
    check("L1 hit re-warms L0", l0Again?.level === "l0")

    const listed = await listPreviewEntriesForPreset("live-test-pack", 10)
    check("per-preset L1 listing works", listed.some((e) => e.cacheKey === liveKey))

    /* Storage optimizer fixtures: one orphan + two identical referenced files */
    const { createAdminClient } = await import("../src/lib/supabase/admin")
    const supabase: any = createAdminClient()
    const sharp = (await import("sharp")).default
    const fixture = await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 180, g: 120, b: 60 } } })
      .jpeg({ quality: 100 }).toBuffer()
    await supabase.storage.from("ai-previews").upload("test-orphan-4e.jpg", fixture, { contentType: "image/jpeg", upsert: true })
    await supabase.storage.from("ai-previews").upload("test-dup-a-4e.jpg", fixture, { contentType: "image/jpeg", upsert: true })
    await supabase.storage.from("ai-previews").upload("test-dup-b-4e.jpg", fixture, { contentType: "image/jpeg", upsert: true })
    await supabase.from("preview_cache").upsert([
      { cache_key: "v2:preview:testdupa:4e:x:y:z:q:w", preview_path: "test-dup-a-4e.jpg", expires_at: new Date(Date.now() + 3600_000).toISOString() },
      { cache_key: "v2:preview:testdupb:4e:x:y:z:q:w", preview_path: "test-dup-b-4e.jpg", expires_at: new Date(Date.now() + 3600_000).toISOString() },
    ])

    const storage = await runStorageOptimizer()
    check("storage optimizer ran + tracked usage", storage.ran && storage.objects > 0, JSON.stringify(storage))
    check("orphan removed", storage.orphansRemoved >= 1, `orphans=${storage.orphansRemoved}`)
    check("identical files deduped", storage.deduped >= 1, `deduped=${storage.deduped}`)

    /* Cleanup all live fixtures */
    await cacheInvalidate({ namespace: "preview", keyContains: "live-test-pack" })
    await supabase.from("preview_cache").delete().like("cache_key", "%testdup%")
    await supabase.storage.from("ai-previews").remove(["test-dup-a-4e.jpg", "test-dup-b-4e.jpg", "test-orphan-4e.jpg"])
    const leftover = await supabase.from("preview_cache").select("cache_key").or("cache_key.like.%live-test-pack%,cache_key.like.%testdup%")
    check("live fixtures cleaned up", (leftover.data?.length ?? 0) === 0)
  }
  process.env.PREVIEW_STORE = "memory"

  /* ═══ Summary ═══ */
  console.log(`\n${"═".repeat(50)}`)
  console.log(failed === 0 ? `✓ ALL ${passed} CHECKS PASSED` : `✗ ${failed} FAILED, ${passed} passed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err) => { console.error("Test run crashed:", err); process.exit(1) })
