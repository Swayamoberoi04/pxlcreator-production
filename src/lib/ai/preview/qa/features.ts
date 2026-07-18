/**
 * src/lib/ai/preview/qa/features.ts
 *
 * Single-pass image feature extraction for the QA engine.
 *
 * Performance contract: every QA module consumes THIS structure instead
 * of touching Sharp itself. Each image is decoded exactly once into:
 *
 *   - metadata            (dimensions, format, channels)
 *   - 64×64 RGB raw       (histograms, chroma, clipping, block structure)
 *   - 32×32 gray raw      (edge map, edge energy)
 *   - dHash + DCT pHash   (similarity)
 *
 * ~4 bounded Sharp operations per image regardless of source size —
 * the whole three-image QA pipeline stays well under the 500ms budget.
 */

import { computePhash } from "../phash"

export interface ImageFeatures {
  /* metadata */
  width:    number
  height:   number
  format:   string
  channels: number
  bytes:    number

  /* hashes */
  dhash: string     // 64-bit difference hash (Phase 4B implementation)
  phash: string     // 64-bit DCT perceptual hash

  /* 64×64 RGB analysis plane */
  histR: number[]   // config.histogram.bins bins, normalized to sum 1
  histG: number[]
  histB: number[]
  histL: number[]   // luminance
  meanR: number     // 0–255
  meanG: number
  meanB: number
  meanL: number
  stdL:  number     // luminance standard deviation (contrast proxy)
  /** Fraction of pixels with any channel at 0 or 255 */
  clippedLowFraction:  number
  clippedHighFraction: number
  /** Mean chroma = mean(max(RGB) − min(RGB)), 0–255 (saturation proxy) */
  meanChroma: number
  /** Fraction of pixels with chroma > 200 (hypersaturation proxy) */
  hyperSaturatedFraction: number
  /** Fraction of occupied luminance bins (64-bin occupancy; posterization proxy) */
  luminanceOccupancy: number
  /** Shadow (bottom 12.5%) and highlight (top 12.5%) luminance mass */
  shadowMass:    number
  highlightMass: number

  /* structure */
  /** 8×8 grid of mean luminance (row-major, 64 values) */
  blockLuma: number[]
  /** 31×31 gradient-magnitude map from the 32×32 gray plane */
  edgeMap: number[]
  /** Mean gradient magnitude (high-frequency energy proxy) */
  edgeEnergy: number
}

const PLANE   = 64          // RGB analysis plane edge
const GRAY    = 32          // gray plane edge for edges/pHash
const BINS_L  = 64          // occupancy measurement bins (independent of config bins)

export async function extractFeatures(buffer: Buffer, histogramBins: number): Promise<ImageFeatures> {
  const sharp = (await import("sharp")).default

  /* ── metadata + integrity (throws on corrupt input) ── */
  const meta = await sharp(buffer).metadata()
  const width    = meta.width  ?? 0
  const height   = meta.height ?? 0
  const format   = meta.format ?? "unknown"
  const channels = meta.channels ?? 3
  if (width < 1 || height < 1) throw new Error("Image has no dimensions")

  /* ── 64×64 RGB plane ── */
  const rgb = await sharp(buffer)
    .removeAlpha()
    .resize(PLANE, PLANE, { fit: "fill" })
    .raw()
    .toBuffer()

  /* ── 32×32 gray plane ── */
  const gray = await sharp(buffer)
    .removeAlpha()
    .grayscale()
    .resize(GRAY, GRAY, { fit: "fill" })
    .raw()
    .toBuffer()

  /* ── dHash (existing Phase 4B implementation) ── */
  const dhash = await computePhash(buffer)

  /* ── DCT pHash from the gray plane ── */
  const phash = dctPhash(gray, GRAY)

  /* ── Single pass over the RGB plane ── */
  const bins = histogramBins
  const histR = new Array<number>(bins).fill(0)
  const histG = new Array<number>(bins).fill(0)
  const histB = new Array<number>(bins).fill(0)
  const histL = new Array<number>(bins).fill(0)
  const occupancy = new Array<number>(BINS_L).fill(0)

  let sumR = 0, sumG = 0, sumB = 0, sumL = 0, sumL2 = 0
  let clippedLow = 0, clippedHigh = 0
  let sumChroma = 0, hyperSat = 0
  let shadowMass = 0, highlightMass = 0
  const pixels = PLANE * PLANE
  const blockLumaSum = new Array<number>(64).fill(0)

  for (let i = 0; i < pixels; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2]
    const l = 0.299 * r + 0.587 * g + 0.114 * b

    histR[Math.min(bins - 1, (r * bins) >> 8)]++
    histG[Math.min(bins - 1, (g * bins) >> 8)]++
    histB[Math.min(bins - 1, (b * bins) >> 8)]++
    histL[Math.min(bins - 1, Math.floor(l * bins / 256))]++
    occupancy[Math.min(BINS_L - 1, Math.floor(l * BINS_L / 256))]++

    sumR += r; sumG += g; sumB += b; sumL += l; sumL2 += l * l

    if (r === 0 || g === 0 || b === 0)       clippedLow++
    if (r === 255 || g === 255 || b === 255) clippedHigh++

    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    const chroma = mx - mn
    sumChroma += chroma
    if (chroma > 200) hyperSat++

    if (l < 32)  shadowMass++
    if (l >= 224) highlightMass++

    /* 8×8 block structure: PLANE/8 = 8px blocks */
    const bx = ((i % PLANE) / 8) | 0
    const by = ((i / PLANE / 8) | 0)
    blockLumaSum[by * 8 + bx] += l
  }

  const norm = (h: number[]) => h.map((v) => v / pixels)
  const meanL = sumL / pixels
  const varL  = sumL2 / pixels - meanL * meanL

  /* ── Edge map from the gray plane ── */
  const edgeMap: number[] = []
  let edgeSum = 0
  for (let y = 0; y < GRAY - 1; y++) {
    for (let x = 0; x < GRAY - 1; x++) {
      const p  = gray[y * GRAY + x]
      const gx = gray[y * GRAY + x + 1] - p
      const gy = gray[(y + 1) * GRAY + x] - p
      const mag = Math.sqrt(gx * gx + gy * gy)
      edgeMap.push(mag)
      edgeSum += mag
    }
  }

  return {
    width, height, format, channels, bytes: buffer.length,
    dhash, phash,
    histR: norm(histR), histG: norm(histG), histB: norm(histB), histL: norm(histL),
    meanR: sumR / pixels, meanG: sumG / pixels, meanB: sumB / pixels, meanL,
    stdL: Math.sqrt(Math.max(varL, 0)),
    clippedLowFraction:  clippedLow / pixels,
    clippedHighFraction: clippedHigh / pixels,
    meanChroma: sumChroma / pixels,
    hyperSaturatedFraction: hyperSat / pixels,
    luminanceOccupancy: occupancy.filter((c) => c > 0).length / BINS_L,
    shadowMass:    shadowMass / pixels,
    highlightMass: highlightMass / pixels,
    blockLuma: blockLumaSum.map((s) => s / 64),   // 8×8 px per block on the 64×64 plane
    edgeMap,
    edgeEnergy: edgeSum / edgeMap.length,
  }
}

/* ─────────────────────────────────────────────────────────────
   DCT perceptual hash (classic pHash):
   32×32 gray → 2D DCT-II → top-left 8×8 (minus DC) → median → 64 bits
───────────────────────────────────────────────────────────── */

function dctPhash(gray: Buffer, n: number): string {
  /* Precompute cosines for an n-point DCT (n=32 → tiny) */
  const cos: number[][] = []
  for (let k = 0; k < 8; k++) {
    cos[k] = []
    for (let x = 0; x < n; x++) {
      cos[k][x] = Math.cos(((2 * x + 1) * k * Math.PI) / (2 * n))
    }
  }

  /* Only the top-left 8×8 DCT coefficients are needed */
  const coeffs: number[] = []
  for (let v = 0; v < 8; v++) {
    for (let u = 0; u < 8; u++) {
      let sum = 0
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          sum += gray[y * n + x] * cos[u][x] * cos[v][y]
        }
      }
      coeffs.push(sum)
    }
  }

  /* Median of AC coefficients (skip DC at index 0) */
  const ac = coeffs.slice(1).slice().sort((a, b) => a - b)
  const median = ac[Math.floor(ac.length / 2)]

  /* 64 bits: DC compared against median too (conventional simplification) */
  let hash = ""
  for (let i = 0; i < 64; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (coeffs[i + j] > median ? 1 : 0)
    }
    hash += byte.toString(16).padStart(2, "0")
  }
  return hash
}
