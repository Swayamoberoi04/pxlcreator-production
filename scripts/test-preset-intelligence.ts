/**
 * scripts/test-preset-intelligence.ts
 *
 * Test suite for the Phase 3 Preset Intelligence Engine.
 *
 *   npx tsx scripts/test-preset-intelligence.ts
 *
 * Covers:
 *   1. Metadata generation — every catalogue preset produces a complete,
 *      well-formed PresetIntelligence entry (no hardcoding, all derived)
 *   2. Knowledge-base caching — second build is a cache hit
 *   3. Scoring — top-5 shape, confidence ordering, reasons present,
 *      scenario sanity (golden-hour image → warm preset on top, etc.)
 *   4. Relationships — similar/complementary computed, never self
 *   5. Determinism — identical input → identical output
 *   6. Latency — <150ms at catalogue scale AND at 5,000 synthetic presets
 */

import { ALL_PRESETS } from "../src/data/presets"
import { generatePresetIntelligence } from "../src/lib/ai/preset-intelligence/metadata-generator"
import { getKnowledgeBase, getRelationships, resetKnowledgeBase } from "../src/lib/ai/preset-intelligence/knowledge-base"
import { rankPresets } from "../src/lib/ai/preset-intelligence/scoring"
import { StubProvider } from "../src/lib/ai/providers/stub"
import type { Preset } from "../src/types/product"
import type { ImageAnalysisResult } from "../src/types/ai"

let passed = 0
let failed = 0

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) { passed++; console.log(`  ✓ ${name}`) }
  else           { failed++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`) }
}

/** Build a real ImageAnalysisResult via the stub provider (no API key needed). */
async function makeAnalysis(prompt: string, aesthetics: string[]): Promise<ImageAnalysisResult> {
  const stub = new StubProvider()
  return stub.analyzeImage({
    imageBuffer:       Buffer.alloc(0),
    userPrompt:        prompt,
    aestheticKeywords: aesthetics,
    imageMetadata:     { width: 3000, height: 2000, format: "jpeg", size: 2_400_000 },
  })
}

async function run(): Promise<void> {
  const catalogue = ALL_PRESETS.filter((p) => p.category !== "Bundle")

  /* ═══ 1. Metadata generation ═══ */
  console.log("\n━━━ 1. Metadata generation ━━━")
  let allComplete = true
  const issues: string[] = []
  for (const preset of catalogue) {
    const intel = generatePresetIntelligence(preset)
    const problems: string[] = []
    if (intel.presetId !== preset.id)             problems.push("id mismatch")
    if (intel.mood.length === 0)                  problems.push("no mood")
    if (intel.dominantColors.length === 0)        problems.push("no colors")
    if (intel.colorPalette.some((h) => !/^#[0-9A-Fa-f]{6}$/.test(h))) problems.push("bad hex")
    if (intel.seoTags.length === 0)               problems.push("no seo tags")
    if (intel.embeddingText.length < 80)          problems.push("embedding text too short")
    const genreSum = Object.values(intel.sceneScores).reduce((s, v) => s + v, 0)
    if (genreSum <= 0)                            problems.push("no scene affinity")
    if (Object.values(intel.sceneScores).some((v) => v < 0 || v > 1)) problems.push("scene score out of range")
    if (problems.length > 0) { allComplete = false; issues.push(`${preset.slug}: ${problems.join(", ")}`) }
  }
  check(`all ${catalogue.length} presets generate complete metadata`, allComplete, issues.join(" | "))

  const sample = generatePresetIntelligence(catalogue[0])
  console.log(`  sample (${sample.slug}): mood=[${sample.mood}] wb=${sample.whiteBalance} colors=[${sample.dominantColors.slice(0, 4)}] cinematic=${sample.sceneScores.cinematic} portrait=${sample.sceneScores.portrait}`)

  /* ═══ 2. Knowledge-base caching ═══ */
  console.log("\n━━━ 2. Knowledge base caching ━━━")
  resetKnowledgeBase()
  const kb1 = getKnowledgeBase(catalogue)
  const kb2 = getKnowledgeBase(catalogue)
  check("first build is not from cache", !kb1.fromCache)
  check("second build is a cache hit", kb2.fromCache)
  check("entry count matches catalogue", kb1.entries.size === catalogue.length)

  /* ═══ 3. Scoring scenarios ═══ */
  console.log("\n━━━ 3. Scoring scenarios ━━━")
  const scenarios: Array<{ name: string; prompt: string; aesthetics: string[]; expectTags: string[] }> = [
    { name: "golden hour travel",  prompt: "warm golden hour sunset travel", aesthetics: ["warm", "golden"], expectTags: ["warm", "golden", "sunset"] },
    { name: "dark moody street",   prompt: "dark moody noir city street",    aesthetics: ["moody", "dark"],  expectTags: ["dark", "moody", "noir", "street", "urban"] },
    { name: "soft portrait",       prompt: "soft flattering portrait skin",  aesthetics: ["portrait"],       expectTags: ["portrait", "skin", "soft"] },
    { name: "vintage film",        prompt: "vintage film grain retro",       aesthetics: ["film"],           expectTags: ["film", "vintage", "retro", "grain"] },
  ]

  for (const scenario of scenarios) {
    const analysis = await makeAnalysis(scenario.prompt, scenario.aesthetics)
    const ranked = rankPresets(analysis, kb1, { limit: 5 })

    const top = ranked[0]
    const topIntel = kb1.entries.get(top.slug)
    const topVocab = [...(topIntel?.aestheticTags ?? []), ...(topIntel?.seoTags ?? [])]
    const relevant = scenario.expectTags.some((t) => topVocab.includes(t))

    check(`${scenario.name}: returns 5 ranked results`, ranked.length === 5)
    check(`${scenario.name}: descending confidence`, ranked.every((r, i) => i === 0 || r.confidence <= ranked[i - 1].confidence))
    check(`${scenario.name}: top match is relevant`, relevant, `top=${top.slug} conf=${top.confidence}`)
    check(`${scenario.name}: top match has reasons`, top.reasons.length > 0)
    check(`${scenario.name}: confidences in [0,1]`, ranked.every((r) => r.confidence >= 0 && r.confidence <= 1))
    console.log(`    → ${ranked.map((r) => `${Math.round(r.confidence * 100)}% ${r.slug}`).join("  |  ")}`)
    console.log(`    → reasons: ${top.reasons.join(" · ")}`)
  }

  /* ═══ 4. Relationships ═══ */
  console.log("\n━━━ 4. Relationships ━━━")
  const relSlug = catalogue[0].slug
  const rels = getRelationships(kb1, relSlug, 3)
  check("similar presets computed", rels.similar.length > 0)
  check("complementary presets computed", rels.complementary.length > 0)
  check("never recommends itself", ![...rels.similar, ...rels.complementary].includes(relSlug))
  check("similar/complementary do not overlap", rels.similar.every((s) => !rels.complementary.includes(s)))
  console.log(`  ${relSlug} → similar=[${rels.similar}] complementary=[${rels.complementary}]`)

  /* ═══ 5. Determinism ═══ */
  console.log("\n━━━ 5. Determinism ━━━")
  const detAnalysis = await makeAnalysis("warm cinematic sunset", ["warm"])
  const runA = rankPresets(detAnalysis, kb1, { limit: 5 })
  const runB = rankPresets(detAnalysis, kb1, { limit: 5 })
  check("identical input produces identical ranking",
    JSON.stringify(runA.map((r) => [r.slug, r.confidence])) === JSON.stringify(runB.map((r) => [r.slug, r.confidence])))

  /* ═══ 6. Latency — current catalogue and 5,000-preset scale ═══ */
  console.log("\n━━━ 6. Latency ━━━")
  const latAnalysis = await makeAnalysis("warm golden travel", ["warm"])

  const t0 = performance.now()
  for (let i = 0; i < 20; i++) rankPresets(latAnalysis, kb1, { limit: 5 })
  const perCallSmall = (performance.now() - t0) / 20
  check(`ranking ${catalogue.length} presets < 150ms`, perCallSmall < 150, `${perCallSmall.toFixed(2)}ms`)
  console.log(`  ${catalogue.length} presets: ${perCallSmall.toFixed(2)}ms per ranking`)

  /* Synthetic 5,000-preset catalogue (cloned with unique ids/slugs) */
  const big: Preset[] = []
  for (let i = 0; i < 5000; i++) {
    const src = catalogue[i % catalogue.length]
    big.push({ ...src, id: `syn-${i}`, slug: `${src.slug}-syn-${i}` })
  }
  const tBuild = performance.now()
  resetKnowledgeBase()
  const bigKb = getKnowledgeBase(big)
  const buildMs = performance.now() - tBuild

  const t1 = performance.now()
  for (let i = 0; i < 5; i++) rankPresets(latAnalysis, bigKb, { limit: 5 })
  const perCallBig = (performance.now() - t1) / 5
  check("knowledge base builds 5,000 presets < 5s (one-time)", buildMs < 5000, `${buildMs.toFixed(0)}ms`)
  check("ranking 5,000 presets < 150ms", perCallBig < 150, `${perCallBig.toFixed(2)}ms`)
  console.log(`  5,000 presets: KB build ${buildMs.toFixed(0)}ms (once per deploy), ranking ${perCallBig.toFixed(2)}ms per call`)

  /* Restore clean cache for anything after us */
  resetKnowledgeBase()

  /* ═══ Summary ═══ */
  console.log(`\n${"═".repeat(50)}`)
  console.log(failed === 0 ? `✓ ALL ${passed} CHECKS PASSED` : `✗ ${failed} FAILED, ${passed} passed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err) => { console.error("Test run crashed:", err); process.exit(1) })
