/**
 * src/lib/ai/preview/phash.ts
 *
 * 64-bit difference hash (dHash) via Sharp.
 *
 * Used by the preview engine for:
 *   - the exact-result cache key (same photo + same preset = same preview)
 *   - the Phase 4C QA perceptual-similarity band (blueprint §6.1)
 *
 * dHash: downscale to 9×8 grayscale, then compare each pixel to its
 * right neighbour — 8 bits × 8 rows = 64 bits, hex-encoded. Robust to
 * re-encoding and mild compression, sensitive to composition changes.
 */

export async function computePhash(buffer: Buffer): Promise<string> {
  const sharp = (await import("sharp")).default

  const raw = await sharp(buffer)
    .rotate()
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer()

  /* One byte per row: 8 left-vs-right comparisons → 2 hex chars.
     (Byte-wise arithmetic keeps us off BigInt — TS target is ES2017.) */
  let hash = ""
  for (let row = 0; row < 8; row++) {
    let rowByte = 0
    for (let col = 0; col < 8; col++) {
      const left  = raw[row * 9 + col]
      const right = raw[row * 9 + col + 1]
      rowByte = (rowByte << 1) | (left > right ? 1 : 0)
    }
    hash += rowByte.toString(16).padStart(2, "0")
  }
  return hash
}

/** Hamming distance between two 64-bit hex hashes (0–64). */
export function phashDistance(a: string, b: string): number {
  let distance = 0
  for (let i = 0; i < 16; i += 2) {
    let xor = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16)
    while (xor > 0) {
      distance += xor & 1
      xor >>= 1
    }
  }
  return distance
}
