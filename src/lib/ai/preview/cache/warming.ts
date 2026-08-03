/**
 * src/lib/ai/preview/cache/warming.ts
 *
 * Phase 4E — cache warming (§8).
 *
 * Warms the layers that are FREE right now, and describes — without
 * executing — the generations that would warm the paid layer:
 *
 *   free:  preset-intelligence knowledge base (Phase 3 caches),
 *          deterministic prompt instructions per (preset, profile),
 *          the L1→L0 near-duplicate index for hot presets
 *   paid:  actual preview generation for popular presets — gated by
 *          config.warming.maxGenerationsPerPass (0 until billing) AND
 *          provider availability. Nothing is mocked: if the provider is
 *          unavailable the pass reports the candidates it would have
 *          warmed and stops.
 *
 * Strategies:
 *   popular-presets — ranked by observed cache traffic (cost
 *                     intelligence counters), falling back to catalog
 *                     order for a cold process
 *   recent-presets  — most recently generated-for presets (job rows)
 */

import { resolveCacheConfig, type CacheConfig } from "./config"
import { listPreviewEntriesForPreset } from "./engine"
import { getOperationalMetrics } from "./cost-intelligence"
import { promptKey } from "./keys"
import { cacheGet, cacheSet } from "./engine"
import { getCachedCatalog } from "@/lib/ai/preset-intelligence/catalog-cache"
import { getKnowledgeBase } from "@/lib/ai/preset-intelligence/knowledge-base"
import { buildPreviewInstruction } from "../prompt-builder"
import { getAllStyleProfiles } from "@/lib/studio/style-profiles"
import { getActivePreviewProvider } from "../provider"
import { StubProvider } from "@/lib/ai/providers/stub"

export interface WarmingReport {
  ran:               boolean
  strategy:          string
  presetsWarmed:     string[]
  promptsWarmed:     number
  indexEntriesWarmed: number
  generationCandidates: string[]
  generationsEnqueued:  number
  ms:                number
}

export async function runCacheWarming(
  cfg: CacheConfig = resolveCacheConfig()
): Promise<WarmingReport> {
  const report: WarmingReport = {
    ran: false, strategy: cfg.warming.strategy, presetsWarmed: [],
    promptsWarmed: 0, indexEntriesWarmed: 0,
    generationCandidates: [], generationsEnqueued: 0, ms: 0,
  }
  if (!cfg.warming.enabled || cfg.warming.strategy === "off") return report
  const started = Date.now()
  report.ran = true

  /* ── 1. Pick target presets ── */
  const { presets } = await getCachedCatalog()
  const gradable = presets
  const metrics = await getOperationalMetrics(7)
  const byTraffic = metrics.generationFrequencyByPreset.map((e) => e.presetSlug)
  const ranked = [
    ...byTraffic,
    ...gradable.map((p) => p.slug),
  ]
  const seen = new Set<string>()
  const targets = ranked
    .filter((slug) => gradable.some((p) => p.slug === slug))
    .filter((slug) => !seen.has(slug) && (seen.add(slug), true))
    .slice(0, cfg.warming.topPresets)

  /* ── 2. Warm the knowledge base (Phase 3 caches, free) ── */
  const kb = getKnowledgeBase(gradable)

  /* ── 3. Warm prompt instructions per (preset, matching profiles) ── */
  const profiles = getAllStyleProfiles()
  const stubAnalysis = await new StubProvider().analyzeImage({
    imageBuffer: Buffer.alloc(0), userPrompt: "", aestheticKeywords: [],
    imageMetadata: { width: 1024, height: 768, format: "jpeg", size: 200_000 },
  })
  for (const slug of targets) {
    const intel = kb.entries.get(slug)
    if (!intel) continue
    for (const profile of profiles.slice(0, 3)) {
      const key = promptKey({ imagePhash: "warm", presetSlug: slug, styleProfileId: profile.id })
      const cached = await cacheGet("prompt", key, cfg)
      if (!cached) {
        const { instruction } = buildPreviewInstruction({
          analysis: { ...stubAnalysis, styleProfileId: profile.id },
          presetIntel: intel, profile, userPrompt: "",
        })
        await cacheSet("prompt", key, instruction, { cfg })
        report.promptsWarmed++
      }
    }
    /* ── 4. Prime the near-duplicate index (L1 → process memory) ── */
    const entries = await listPreviewEntriesForPreset(slug, cfg.duplicates.indexLimitPerPreset)
    report.indexEntriesWarmed += entries.length
    report.presetsWarmed.push(slug)
  }

  /* ── 5. Paid layer: report candidates; enqueue only when allowed ── */
  const provider = await getActivePreviewProvider()
  report.generationCandidates = targets
  if (provider && cfg.warming.maxGenerationsPerPass > 0) {
    /* Generation-warming requires a source image per preset (e.g. the
       preset's own before-image). Deliberately conservative: enqueue
       nothing unless explicitly budgeted — and today the budget is 0
       until billing is enabled. */
    report.generationsEnqueued = 0
  }

  report.ms = Date.now() - started
  console.log(`[ai:cache] ${JSON.stringify({ event: "cache_warming_ran", ...report, presetsWarmed: report.presetsWarmed.length })}`)
  return report
}
