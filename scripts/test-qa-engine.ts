/**
 * scripts/test-qa-engine.ts
 *
 * Phase 4C test suite — QA & Fidelity Engine.
 *
 *   npx tsx scripts/test-qa-engine.ts
 *
 * No AI generation is used or mocked. Every fixture is a deterministic
 * Sharp transformation of a real photograph, chosen to hit a specific
 * verdict path:
 *
 *   PASS   — the style profile's own grade applied via processImage
 *            (a grade-only change matching the preset's promises)
 *   RETRY  — an unchanged re-encode (provider no-op / edit-invisible)
 *   RETRY  — a wrong-direction grade (cool+desaturated vs a warm preset)
 *   FAIL   — a crop (aspect/geometry violated)
 *   FAIL   — a 90° rotation (orientation violated)
 *   FAIL   — a different photograph (composition replaced)
 *   FAIL   — corrupt bytes (file integrity)
 *
 * Plus: refinement determinism, config override merging, report
 * determinism, and the <500ms latency budget.
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { readFileSync } from "node:fs"
import sharp from "sharp"
import { FidelityQAGate } from "../src/lib/ai/preview/qa/gate"
import { DEFAULT_QA_CONFIG, resolveQAConfig, QA_CONFIG_VERSION } from "../src/lib/ai/preview/qa/config"
import { buildCorrectiveInstruction, REFINEMENT_VERSION } from "../src/lib/ai/preview/qa/refinement"
import { IDENTITY_LOCK } from "../src/lib/ai/preview/prompt-builder"
import { processImage } from "../src/lib/studio/process"
import { getStyleProfile } from "../src/lib/studio/style-profiles"
import { generatePresetIntelligence } from "../src/lib/ai/preset-intelligence/metadata-generator"
import { ALL_PRESETS } from "../src/data/presets"
import type { PreviewQAInput, PreviewQAResult } from "../src/types/preview"

let passed = 0
let failed = 0

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) { passed++; console.log(`  ✓ ${name}`) }
  else           { failed++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`) }
}

function report(label: string, qa: PreviewQAResult): void {
  console.log(`    → ${label}: verdict=${qa.verdict} overall=${qa.overallScore} ` +
    `sim=${qa.similarityScore} id=${qa.identityScore} fid=${qa.fidelityScore} ` +
    `real=${qa.realismScore} meta=${qa.metadataScore} hist=${qa.histogramScore} ` +
    `reasons=[${(qa.failureReasons ?? []).join(",")}] ${qa.evaluationMs}ms`)
}

async function run(): Promise<void> {
  /* ── Fixture setup: one real photo, normalized like the engine does ── */
  const source = readFileSync("public/assets/magical_sunset.webp")
  const original = await sharp(source)
    .rotate().resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 }).toBuffer()

  const profile = getStyleProfile("golden-hour")!
  const preset  = ALL_PRESETS.find((p) => p.slug === "desert-gold-pack")!
  const intel   = generatePresetIntelligence(preset)

  const gate = new FidelityQAGate()
  const input = (previewBuffer: Buffer): PreviewQAInput => ({
    originalBase64: original.toString("base64"),
    previewBase64:  previewBuffer.toString("base64"),
    mimeType:       "image/jpeg",
    instruction:    "test instruction",
    presetIntel:    intel,
    referenceAdjustments: profile.defaultAdjustments,
  })

  /* ═══ 1. PASS — the target grade itself ═══ */
  console.log("\n━━━ 1. PASS fixture: Sharp render of the target grade ━━━")
  const gradedFixture = await processImage(original, profile.defaultAdjustments)
  const qaPass = await gate.evaluate(input(gradedFixture))
  report("target-grade", qaPass)
  check("target grade PASSes", qaPass.verdict === "pass", `got ${qaPass.verdict}`)
  check("composite ≥ pass threshold", (qaPass.overallScore ?? 0) >= DEFAULT_QA_CONFIG.thresholds.pass)
  check("config version stamped", qaPass.configVersion === QA_CONFIG_VERSION)

  /* ═══ 2. RETRY — provider no-op ═══ */
  console.log("\n━━━ 2. RETRY fixture: unchanged re-encode (edit invisible) ━━━")
  const noopFixture = await sharp(original).jpeg({ quality: 92 }).toBuffer()
  const qaNoop = await gate.evaluate(input(noopFixture))
  report("no-op", qaNoop)
  check("no-op edit → RETRY", qaNoop.verdict === "retry", `got ${qaNoop.verdict}`)
  check("reason includes edit-invisible", (qaNoop.failureReasons ?? []).includes("edit-invisible"))

  /* ═══ 3. RETRY — wrong-direction grade ═══ */
  console.log("\n━━━ 3. RETRY fixture: cool desaturated grade vs warm preset ━━━")
  const wrongFixture = await processImage(original, {
    brightness: 0.95, contrast: 1.0, saturation: 0.45, hue: -14,
    gamma: 1.0, tintR: -14, tintG: 0, tintB: 14,
  })
  const qaWrong = await gate.evaluate(input(wrongFixture))
  report("wrong-direction", qaWrong)
  check("wrong direction → not PASS", qaWrong.verdict !== "pass", `got ${qaWrong.verdict}`)
  check("fidelity flags a wrong/weak direction", (qaWrong.failureReasons ?? []).some((r) =>
    r.startsWith("wb-") || r.startsWith("saturation") || r.startsWith("palette")))

  /* ═══ 4. FAIL — cropped ═══ */
  console.log("\n━━━ 4. FAIL fixture: center crop (geometry violated) ━━━")
  const meta = await sharp(original).metadata()
  const cropFixture = await sharp(original)
    .extract({
      left: Math.floor((meta.width ?? 100) * 0.2), top: 0,
      width: Math.floor((meta.width ?? 100) * 0.5), height: meta.height ?? 100,
    })
    .jpeg({ quality: 85 }).toBuffer()
  const qaCrop = await gate.evaluate(input(cropFixture))
  report("cropped", qaCrop)
  check("crop → FAIL", qaCrop.verdict === "fail", `got ${qaCrop.verdict}`)
  check("aspect-changed reason recorded", (qaCrop.failureReasons ?? []).includes("aspect-changed"))

  /* ═══ 5. FAIL — rotated ═══ */
  console.log("\n━━━ 5. FAIL fixture: 90° rotation (orientation violated) ━━━")
  const rotFixture = await sharp(original).rotate(90).jpeg({ quality: 85 }).toBuffer()
  const qaRot = await gate.evaluate(input(rotFixture))
  report("rotated", qaRot)
  check("rotation → FAIL", qaRot.verdict === "fail", `got ${qaRot.verdict}`)

  /* ═══ 6. FAIL — different photograph ═══ */
  console.log("\n━━━ 6. FAIL fixture: different photograph (composition replaced) ━━━")
  const other = await sharp(readFileSync("public/assets/moody_city.webp"))
    .rotate().resize(meta.width ?? 1024, meta.height ?? 576, { fit: "fill" })
    .jpeg({ quality: 85 }).toBuffer()
  const qaOther = await gate.evaluate(input(other))
  report("different-photo", qaOther)
  check("different photo → FAIL", qaOther.verdict === "fail", `got ${qaOther.verdict}`)

  /* ═══ 7. FAIL — corrupt bytes ═══ */
  console.log("\n━━━ 7. FAIL fixture: corrupt file ━━━")
  const qaCorrupt = await gate.evaluate(input(Buffer.from("not an image at all")))
  report("corrupt", qaCorrupt)
  check("corrupt file → FAIL", qaCorrupt.verdict === "fail", `got ${qaCorrupt.verdict}`)
  check("corrupt-file reason recorded", (qaCorrupt.failureReasons ?? []).includes("corrupt-file"))

  /* ═══ 8. Prompt refinement ═══ */
  console.log("\n━━━ 8. Prompt refinement ━━━")
  const base = `${IDENTITY_LOCK}\n\nGrade: warm amber.`
  const r1 = buildCorrectiveInstruction(base, ["wb-went-cool", "edit-invisible", "aspect-changed", "wb-went-cool"])
  const r2 = buildCorrectiveInstruction(base, ["edit-invisible", "aspect-changed", "wb-went-cool"])
  check("deterministic (order/duplicate independent)", r1.instruction === r2.instruction)
  check("identity lock preserved verbatim", r1.instruction.startsWith(IDENTITY_LOCK))
  check("corrective clauses appended", r1.correctionsApplied.length === 2 &&
    r1.instruction.includes("CORRECTIONS"), r1.correctionsApplied.join(","))
  check("non-correctable reasons excluded", !r1.correctionsApplied.includes("aspect-changed"))
  check("refinement versioned", r1.refinementVersion === REFINEMENT_VERSION)
  const rEmpty = buildCorrectiveInstruction(base, ["aspect-changed"])
  check("only non-correctable reasons → base instruction unchanged", rEmpty.instruction === base)

  /* ═══ 9. Configuration ═══ */
  console.log("\n━━━ 9. Configuration ━━━")
  const custom = resolveQAConfig({ thresholds: { pass: 0.9, retryFloor: 0.5 } })
  check("override merges", custom.thresholds.pass === 0.9 && custom.similarity.dhashMinDistance === DEFAULT_QA_CONFIG.similarity.dhashMinDistance)
  check("retry cap immutable at 1", custom.retry.maxRetries === 1)
  const strictGate = new FidelityQAGate({ thresholds: { pass: 0.99, retryFloor: 0.9 } })
  const qaStrict = await strictGate.evaluate(input(gradedFixture))
  check("stricter thresholds change the verdict", qaStrict.verdict !== "pass", `got ${qaStrict.verdict}`)

  /* ═══ 10. Determinism ═══ */
  console.log("\n━━━ 10. Determinism ━━━")
  const qaAgain = await gate.evaluate(input(gradedFixture))
  const strip = (q: PreviewQAResult) => JSON.stringify({ ...q, evaluationMs: 0 })
  check("identical input → identical report", strip(qaAgain) === strip(qaPass))

  /* ═══ 11. Latency (<500ms budget) ═══ */
  console.log("\n━━━ 11. Latency ━━━")
  const N = 5
  const t0 = performance.now()
  for (let i = 0; i < N; i++) await gate.evaluate(input(gradedFixture))
  const perEval = (performance.now() - t0) / N
  check("full pipeline (incl. reference render) < 500ms", perEval < 500, `${perEval.toFixed(1)}ms`)
  console.log(`  average full evaluation: ${perEval.toFixed(1)}ms over ${N} runs`)

  /* ═══ Summary ═══ */
  console.log(`\n${"═".repeat(50)}`)
  console.log(failed === 0 ? `✓ ALL ${passed} CHECKS PASSED` : `✗ ${failed} FAILED, ${passed} passed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err) => { console.error("Test run crashed:", err); process.exit(1) })
