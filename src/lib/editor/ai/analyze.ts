/**
 * src/lib/editor/ai/analyze.ts
 *
 * The AI Assistant's "eyes" — real in-browser computer-vision analysis.
 *
 * Everything here is deterministic and runs on the actual pixels of the image
 * (downsampled for speed), so the assistant's understanding is instant, free,
 * private, and fully testable — no cloud round-trip. It produces a compact
 * `ImageAnalysis` (histograms + statistics + a scene guess + warnings) that the
 * recommendation, one-click-look, prompt, and style-match engines all read.
 *
 * A cloud vision model could later enrich `scene`/`summary`; the rest is pure
 * signal processing that a model would only approximate.
 */

export type SceneType =
  | "portrait"
  | "landscape"
  | "architecture"
  | "food"
  | "nature"
  | "night"
  | "street"
  | "product"
  | "general"

export interface ImageStats {
  /** 32-bin luminance histogram, normalised so the peak is 1. */
  histLuma: number[]
  histR: number[]
  histG: number[]
  histB: number[]
  meanLuma: number // 0..1
  medianLuma: number // 0..1
  /** Fraction of pixels clipped near black / white (0..1). */
  shadowClip: number
  highlightClip: number
  /** p95 − p5 luminance spread (0..1). */
  dynamicRange: number
  /** Std-dev of luminance — a contrast proxy (0..~0.5). */
  contrast: number
  /** Mean chroma (max−min of channels), 0..1. */
  saturation: number
  /** Average channel levels 0..1 (white-balance signal). */
  avgR: number
  avgG: number
  avgB: number
  /** Warm(+)/cool(−) and magenta(+)/green(−) cast estimates, ~−1..1. */
  temperatureCast: number
  tintCast: number
  /** Noise estimate from local variance in flat regions, 0..1. */
  noise: number
  /** High-frequency energy — a sharpness proxy, 0..1. */
  sharpness: number
  /** Fraction of pixels resembling sky / skin (0..1). */
  skyRatio: number
  skinRatio: number
  /** Fraction of green-dominant (foliage) pixels. */
  foliageRatio: number
  width: number
  height: number
}

export type WarningLevel = "warn" | "info"
export interface Warning {
  id: string
  level: WarningLevel
  message: string
}

export interface ImageAnalysis {
  stats: ImageStats
  scene: SceneType
  sceneLabel: string
  sceneConfidence: number // 0..1
  warnings: Warning[]
  summary: string
}

const BINS = 32
const SAMPLE_EDGE = 240 // downsample longest edge for analysis

const luma = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

/** Downsample an image source into an ImageData for analysis. */
export function toAnalysisImageData(source: CanvasImageSource, w: number, h: number): ImageData {
  const scale = Math.min(1, SAMPLE_EDGE / Math.max(w, h))
  const sw = Math.max(1, Math.round(w * scale))
  const sh = Math.max(1, Math.round(h * scale))
  const c = document.createElement("canvas")
  c.width = sw
  c.height = sh
  const ctx = c.getContext("2d")!
  ctx.drawImage(source, 0, 0, sw, sh)
  return ctx.getImageData(0, 0, sw, sh)
}

function percentile(hist: number[], counts: number, p: number): number {
  let acc = 0
  const target = counts * p
  for (let i = 0; i < hist.length; i++) {
    acc += hist[i]
    if (acc >= target) return i / (hist.length - 1)
  }
  return 1
}

/** Compute all image statistics from downsampled pixels. */
export function computeStats(img: ImageData, fullW: number, fullH: number): ImageStats {
  const d = img.data
  const n = img.width * img.height
  const histLuma = new Array(BINS).fill(0)
  const rawL = new Array(BINS).fill(0)
  const histR = new Array(BINS).fill(0)
  const histG = new Array(BINS).fill(0)
  const histB = new Array(BINS).fill(0)

  let sumL = 0
  let sumR = 0
  let sumG = 0
  let sumB = 0
  let sumSat = 0
  let shadow = 0
  let highlight = 0
  let sky = 0
  let skin = 0
  let foliage = 0

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]
    const g = d[i + 1]
    const b = d[i + 2]
    const l = luma(r, g, b)
    const bin = Math.min(BINS - 1, Math.floor(l * BINS))
    histLuma[bin]++
    rawL[bin]++
    histR[Math.min(BINS - 1, Math.floor((r / 255) * BINS))]++
    histG[Math.min(BINS - 1, Math.floor((g / 255) * BINS))]++
    histB[Math.min(BINS - 1, Math.floor((b / 255) * BINS))]++

    sumL += l
    sumR += r
    sumG += g
    sumB += b
    const mx = Math.max(r, g, b)
    const mn = Math.min(r, g, b)
    sumSat += (mx - mn) / 255
    if (l < 0.03) shadow++
    if (l > 0.97) highlight++

    // Sky: bluish + bright.
    if (b > g && b > r && l > 0.45) sky++
    // Skin: warm mid tones, r>g>b with moderate spread.
    if (r > 95 && r > g && g > b && r - b > 15 && r - b < 130 && l > 0.25 && l < 0.9) skin++
    // Foliage: green-dominant.
    if (g > r && g > b && g > 60) foliage++
  }

  const meanLuma = sumL / n
  const avgR = sumR / n / 255
  const avgG = sumG / n / 255
  const avgB = sumB / n / 255

  // Contrast = std-dev of luminance.
  let varSum = 0
  for (let i = 0; i < d.length; i += 4) {
    const l = luma(d[i], d[i + 1], d[i + 2])
    varSum += (l - meanLuma) ** 2
  }
  const contrast = Math.sqrt(varSum / n)

  // Noise & sharpness via horizontal neighbour differences.
  let hf = 0
  let flatVar = 0
  let flatCount = 0
  const W = img.width
  for (let y = 0; y < img.height; y++) {
    for (let x = 1; x < W; x++) {
      const i = (y * W + x) * 4
      const j = (y * W + x - 1) * 4
      const dl = Math.abs(luma(d[i], d[i + 1], d[i + 2]) - luma(d[j], d[j + 1], d[j + 2]))
      hf += dl
      if (dl < 0.06) {
        flatVar += dl * dl
        flatCount++
      }
    }
  }
  const sharpness = Math.min(1, (hf / n) * 12)
  const noise = Math.min(1, flatCount > 0 ? Math.sqrt(flatVar / flatCount) * 30 : 0)

  const medianLuma = percentile(rawL, n, 0.5)
  const p5 = percentile(rawL, n, 0.05)
  const p95 = percentile(rawL, n, 0.95)

  const peak = Math.max(...histLuma) || 1
  const norm = (h: number[]) => {
    const p = Math.max(...h) || 1
    return h.map((v) => v / p)
  }

  // White-balance cast: red vs blue (temperature), green vs magenta (tint).
  const temperatureCast = (avgR - avgB) * 2
  const tintCast = (avgG - (avgR + avgB) / 2) * -2

  return {
    histLuma: histLuma.map((v) => v / peak),
    histR: norm(histR),
    histG: norm(histG),
    histB: norm(histB),
    meanLuma,
    medianLuma,
    shadowClip: shadow / n,
    highlightClip: highlight / n,
    dynamicRange: p95 - p5,
    contrast,
    saturation: sumSat / n,
    avgR,
    avgG,
    avgB,
    temperatureCast,
    tintCast,
    noise,
    sharpness,
    skyRatio: sky / n,
    skinRatio: skin / n,
    foliageRatio: foliage / n,
    width: fullW,
    height: fullH,
  }
}

const SCENE_LABELS: Record<SceneType, string> = {
  portrait: "Portrait",
  landscape: "Landscape",
  architecture: "Architecture",
  food: "Food",
  nature: "Nature",
  night: "Night",
  street: "Street",
  product: "Product",
  general: "General",
}

/** Heuristic scene classification from the statistics. */
function classifyScene(s: ImageStats): { scene: SceneType; confidence: number } {
  const scores: Record<SceneType, number> = {
    portrait: 0,
    landscape: 0,
    architecture: 0,
    food: 0,
    nature: 0,
    night: 0,
    street: 0,
    product: 0,
    general: 0.2,
  }
  scores.portrait = s.skinRatio * 4
  scores.landscape = s.skyRatio * 2.2 + s.foliageRatio * 1.5
  scores.nature = s.foliageRatio * 2.6 + s.saturation * 0.6
  scores.night = s.meanLuma < 0.22 ? (0.22 - s.meanLuma) * 6 : 0
  scores.architecture = s.sharpness * 0.9 + (s.skyRatio > 0.1 ? 0.3 : 0) - s.foliageRatio
  scores.street = s.contrast * 1.4 + (s.meanLuma < 0.45 ? 0.3 : 0)
  scores.product = s.meanLuma > 0.75 && s.saturation < 0.25 ? 1 : 0
  scores.food = s.saturation > 0.35 && s.skinRatio > 0.05 && s.foliageRatio < 0.2 ? 0.6 : 0

  let best: SceneType = "general"
  let bestScore = scores.general
  for (const k of Object.keys(scores) as SceneType[]) {
    if (scores[k] > bestScore) {
      bestScore = scores[k]
      best = k
    }
  }
  return { scene: best, confidence: Math.min(1, bestScore) }
}

function buildWarnings(s: ImageStats): Warning[] {
  const w: Warning[] = []
  if (s.highlightClip > 0.04)
    w.push({ id: "highlight-clip", level: "warn", message: `Highlights clipped in ${(s.highlightClip * 100).toFixed(0)}% of the image — detail is being lost.` })
  if (s.shadowClip > 0.06)
    w.push({ id: "shadow-clip", level: "warn", message: `Shadows crushed in ${(s.shadowClip * 100).toFixed(0)}% of the image.` })
  if (s.meanLuma > 0.72) w.push({ id: "overexposed", level: "warn", message: "Image looks overexposed overall." })
  else if (s.meanLuma < 0.2) w.push({ id: "underexposed", level: "warn", message: "Image looks underexposed / very dark." })
  if (Math.abs(s.temperatureCast) > 0.28)
    w.push({ id: "wb", level: "info", message: `White balance leans ${s.temperatureCast > 0 ? "warm" : "cool"} — a small correction may neutralise it.` })
  if (s.noise > 0.5) w.push({ id: "noise", level: "info", message: "Noticeable noise detected — try Noise Reduction." })
  if (s.dynamicRange < 0.4) w.push({ id: "flat", level: "info", message: "Low contrast / flat tonal range — adding contrast will give it punch." })
  if (Math.min(s.width, s.height) < 900)
    w.push({ id: "lowres", level: "info", message: `Low resolution (${s.width}×${s.height}) — best for web, not large prints.` })
  return w
}

function buildSummary(s: ImageStats, scene: SceneType): string {
  const bright = s.meanLuma > 0.6 ? "bright" : s.meanLuma < 0.3 ? "dark" : "balanced"
  const wb = s.temperatureCast > 0.15 ? "warm" : s.temperatureCast < -0.15 ? "cool" : "neutral"
  const con = s.dynamicRange > 0.75 ? "high-contrast" : s.dynamicRange < 0.45 ? "flat" : "moderate-contrast"
  return `A ${bright}, ${wb}, ${con} ${SCENE_LABELS[scene].toLowerCase()} image.`
}

/** Full analysis entry point. */
export function analyzeImage(source: CanvasImageSource, fullW: number, fullH: number): ImageAnalysis {
  const img = toAnalysisImageData(source, fullW, fullH)
  const stats = computeStats(img, fullW, fullH)
  const { scene, confidence } = classifyScene(stats)
  return {
    stats,
    scene,
    sceneLabel: SCENE_LABELS[scene],
    sceneConfidence: confidence,
    warnings: buildWarnings(stats),
    summary: buildSummary(stats, scene),
  }
}
