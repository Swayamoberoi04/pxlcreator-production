/**
 * scripts/test-gemini-provider.ts
 *
 * Production test harness for the Gemini Vision provider.
 * Runs OUTSIDE Next.js against the same code the API routes use.
 *
 * Usage:
 *   # Real photo + prompt (the meaningful test):
 *   npx tsx scripts/test-gemini-provider.ts path/to/photo.jpg "warm cinematic golden hour"
 *
 *   # Synthetic smoke test across scene categories (no photos needed):
 *   npx tsx scripts/test-gemini-provider.ts --synthetic
 *
 * Requires GEMINI_API_KEY in .env.local (otherwise the run exercises the
 * stub-fallback path, which is also worth verifying).
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { readFileSync } from "node:fs"
import sharp from "sharp"
import { analyzeImage } from "../src/lib/ai/analyze"
import type { ImageAnalysisResult } from "../src/types/ai"

/* ── Synthetic scenes: gradient compositions that loosely evoke each category ── */
const SYNTHETIC_SCENES: Array<{ name: string; prompt: string; svg: string }> = [
  {
    name: "golden-hour landscape",
    prompt: "warm golden hour glow over hills",
    svg: gradient(1600, 1067, ["#f7b733", "#fc4a1a", "#4a2c12"]),
  },
  {
    name: "night city",
    prompt: "dark moody night city lights",
    svg: gradient(1600, 1067, ["#0b0d21", "#1a1f4d", "#e94584"]),
  },
  {
    name: "overcast portrait backdrop",
    prompt: "soft natural portrait light",
    svg: gradient(1067, 1600, ["#d7d7d7", "#a8b2bd", "#6b7683"]),
  },
  {
    name: "forest nature",
    prompt: "misty green forest morning",
    svg: gradient(1600, 1067, ["#0f2417", "#2d5a3d", "#87a96b"]),
  },
]

function gradient(w: number, h: number, stops: string[]): string {
  const stopEls = stops
    .map((c, i) => `<stop offset="${Math.round((i / (stops.length - 1)) * 100)}%" stop-color="${c}"/>`)
    .join("")
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${stopEls}</linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w * 0.7}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.12}" fill="${stops[0]}" opacity="0.9"/></svg>`
}

function printResult(label: string, r: ImageAnalysisResult, wallMs: number): void {
  console.log(`\n━━━ ${label} ━━━`)
  console.log(`  provider     : ${r.providerId}`)
  console.log(`  profile      : ${r.styleProfileId}`)
  console.log(`  scene        : ${r.scene.type} / ${r.scene.timeOfDay} / ${r.scene.setting} / ${r.scene.weather}`)
  console.log(`  lighting     : ${r.lighting.quality}, ${r.lighting.kelvin}K, ${r.lighting.colorTemperature}, dir=${r.lighting.direction}`)
  console.log(`  colors       : [${r.colors.dominant.join(", ")}] sat=${r.colors.saturationLevel} contrast=${r.colors.contrastLevel}`)
  console.log(`  subject      : present=${r.subject.present} type=${r.subject.type} skin=${r.subject.hasSkinTones}`)
  console.log(`  mood         : ${r.mood.primary}${r.mood.secondary ? "/" + r.mood.secondary : ""} energy=${r.mood.energy} [${r.mood.adjectives.join(", ")}]`)
  console.log(`  composition  : ${r.composition.orientation} ${r.composition.aspectRatio} depth=${r.composition.depth}`)
  console.log(`  quality      : overall=${r.quality.overall} exposure=${r.quality.exposure} sharp=${r.quality.sharpness} noise=${r.quality.noise}`)
  console.log(`  adjustments  : b=${r.adjustments.brightness.toFixed(2)} c=${r.adjustments.contrast.toFixed(2)} s=${r.adjustments.saturation.toFixed(2)} hue=${r.adjustments.hue} tintR=${r.adjustments.tintR} tintB=${r.adjustments.tintB}`)
  console.log(`  keywords     : ${r.presetKeywords.join(", ")}`)
  console.log(`  confidence   : ${r.confidence}`)
  console.log(`  description  : ${r.description}`)
  console.log(`  provider ms  : ${r.processingMs}  (wall: ${wallMs}ms)`)
}

/* ── Adjustment sanity assertions (rails from gemini-schema.ts) ── */
function assertSane(r: ImageAnalysisResult): string[] {
  const problems: string[] = []
  const a = r.adjustments
  if (a.brightness < 0.7 || a.brightness > 1.4) problems.push(`brightness ${a.brightness} outside rails`)
  if (a.contrast   < 0.7 || a.contrast   > 1.55) problems.push(`contrast ${a.contrast} outside rails`)
  if (a.saturation < 0.3 || a.saturation > 1.7) problems.push(`saturation ${a.saturation} outside rails`)
  if (Math.abs(a.hue) > 30)   problems.push(`hue ${a.hue} outside rails`)
  if (Math.abs(a.tintR) > 30 || Math.abs(a.tintB) > 30) problems.push(`tint outside rails`)
  if (r.confidence < 0 || r.confidence > 1) problems.push(`confidence ${r.confidence} out of range`)
  if (r.lighting.kelvin < 2000 || r.lighting.kelvin > 12000) problems.push(`kelvin ${r.lighting.kelvin} out of range`)
  if (!r.description) problems.push("empty description")
  if (r.presetKeywords.length === 0) problems.push("no preset keywords")
  return problems
}

async function run(): Promise<void> {
  const args = process.argv.slice(2)
  const hasKey = Boolean(process.env.GEMINI_API_KEY?.trim())
  console.log(`GEMINI_API_KEY: ${hasKey ? "present" : "MISSING — this run exercises the stub-fallback path"}`)
  console.log(`Model: ${process.env.GEMINI_MODEL || "gemini-3.5-flash (default)"}`)

  let failures = 0

  if (args[0] === "--synthetic") {
    for (const scene of SYNTHETIC_SCENES) {
      const buffer = await sharp(Buffer.from(scene.svg)).jpeg({ quality: 90 }).toBuffer()
      const meta   = await sharp(buffer).metadata()
      const t0     = Date.now()
      const { imageAnalysis } = await analyzeImage(buffer, scene.prompt, [], {
        width: meta.width, height: meta.height, format: meta.format, size: buffer.length,
      })
      printResult(scene.name, imageAnalysis, Date.now() - t0)
      const problems = assertSane(imageAnalysis)
      if (problems.length > 0) { failures++; console.log(`  ⚠ SANITY: ${problems.join("; ")}`) }
      else console.log(`  ✓ sanity checks passed`)
    }
  } else {
    const [path, prompt = "cinematic warm grade"] = args
    if (!path) {
      console.error("Usage: npx tsx scripts/test-gemini-provider.ts <image-path> [prompt]  |  --synthetic")
      process.exit(1)
    }
    const buffer = readFileSync(path)
    const meta   = await sharp(buffer).metadata()
    const t0     = Date.now()
    const { imageAnalysis } = await analyzeImage(buffer, prompt, [], {
      width: meta.width, height: meta.height, format: meta.format, size: buffer.length,
    })
    printResult(path, imageAnalysis, Date.now() - t0)
    const problems = assertSane(imageAnalysis)
    if (problems.length > 0) { failures++; console.log(`  ⚠ SANITY: ${problems.join("; ")}`) }
    else console.log(`  ✓ sanity checks passed`)
  }

  console.log(`\n${failures === 0 ? "✓ ALL PASSED" : `✗ ${failures} case(s) failed sanity checks`}`)
  process.exit(failures === 0 ? 0 : 1)
}

run().catch((err) => {
  console.error("Test run crashed:", err)
  process.exit(1)
})
