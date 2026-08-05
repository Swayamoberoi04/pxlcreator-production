/**
 * Deterministic demo-image picker for the Before/After slider.
 *
 * During the build-out phase, presets don't have real before_url / after_url.
 * This module maps any stable seed string (preset slug) to two distinct demo
 * images from /public/demo-slider/ so every preset page shows a working slider.
 *
 * To replace with real images later:
 *   - Set before_url / after_url on the preset in the database.
 *   - The store page checks those fields first; this function is never called.
 *   - No changes needed to the slider component or this file.
 */

const TOTAL = 20

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function pad(n: number): string {
  return n.toString().padStart(2, "0")
}

export function getDemoImages(seed: string): { before: string; after: string } {
  const h          = hashString(seed)
  const beforeIdx  = (h % TOTAL) + 1
  // Offset by half the pool so before and after are always different images
  const afterIdx   = ((h + Math.floor(TOTAL / 2)) % TOTAL) + 1
  return {
    before: `/demo-slider/${pad(beforeIdx)}.webp`,
    after:  `/demo-slider/${pad(afterIdx)}.webp`,
  }
}
