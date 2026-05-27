/**
 * src/lib/studio/process.ts
 *
 * Applies the AI-generated color adjustments to a raw image buffer
 * using Sharp (libvips). Returns a processed JPEG buffer.
 *
 * Pipeline order matters — each step builds on the last:
 *   rotate → modulate → gamma → linear (contrast) → recomb (tint) → jpeg
 *
 * Server-only. Never imported by client components.
 */

import sharp from "sharp"
import type { ImageAdjustments } from "@/types/studio"

/**
 * Processes an image buffer with cinematic color grading adjustments.
 *
 * @param buffer      - Raw input image buffer (jpeg / png / webp)
 * @param adjustments - Validated ImageAdjustments from analyzeImage()
 * @returns           - Processed JPEG buffer ready for base64 encoding
 */
export async function processImage(
  buffer: Buffer,
  adjustments: ImageAdjustments
): Promise<Buffer> {
  const {
    brightness,
    contrast,
    saturation,
    hue,
    gamma,
    tintR,
    tintG,
    tintB,
  } = adjustments

  /*
   * Contrast formula — centres adjustment on middle grey (128):
   *   output = input * contrast + 128 * (1 - contrast)
   *
   * Sharp's .linear(multiplier, offset) applies:
   *   output = input * multiplier + offset
   *
   * So: multiplier = contrast, offset = 128 * (1 - contrast)
   *
   * Examples:
   *   contrast 1.2 → mid-grey pixel (128) → 128*1.2 + 128*(1-1.2) = 153.6 - 25.6 = 128 ✓
   *   contrast 1.2 → bright pixel  (200) → 200*1.2 + (-25.6) = 240 - 25.6 = 214.4 (brighter) ✓
   *   contrast 1.2 → dark pixel     (50) → 50*1.2  + (-25.6) = 60  - 25.6 = 34.4  (darker)  ✓
   */
  const contrastOffset = 128 * (1 - contrast)

  /*
   * Per-channel colour tint via a diagonal recombination matrix.
   *
   * .recomb(matrix) multiplies each pixel's [R, G, B] vector by the matrix.
   * A diagonal matrix with per-channel scales applies independent channel gain:
   *
   *   [rScale   0       0    ]   [R]   [R * rScale]
   *   [0        gScale  0    ] × [G] = [G * gScale]
   *   [0        0       bScale]  [B]   [B * bScale]
   *
   * tintR/G/B range: -20 to 20
   * Divisor 100 → scale range: 0.80 to 1.20
   * (±20% per channel — enough for colour temperature shifts, not destructive)
   */
  const rScale = 1 + tintR / 100
  const gScale = 1 + tintG / 100
  const bScale = 1 + tintB / 100

  return sharp(buffer)
    /*
     * Step 1 — auto-rotate from EXIF orientation data.
     * Must come first so subsequent operations work on the correct geometry.
     */
    .rotate()

    /*
     * Step 1b — flatten alpha channel to a black background and remove it.
     * Sharp's .recomb() matrix is 3×3 (RGB only). If the input is RGBA (e.g.
     * a PNG with transparency), recomb throws an error because the channel count
     * doesn't match. .flatten() composites transparency onto black and converts
     * to RGB, making the pipeline safe for any input format.
     */
    .flatten({ background: { r: 0, g: 0, b: 0 } })

    /*
     * Step 2 — brightness, saturation, hue via HSL modulation.
     * Sharp's .modulate() works in HSL colour space:
     *   brightness: luminance multiplier (1.0 = no change)
     *   saturation: chroma multiplier    (1.0 = no change)
     *   hue:        hue rotation degrees (0 = no change)
     */
    .modulate({ brightness, saturation, hue })

    /*
     * Step 3 — gamma correction.
     * gamma < 1.0 → brightens mid-tones (lift shadows)
     * gamma > 1.0 → darkens mid-tones  (crush shadows)
     * Sharp clips to [0, 255] automatically.
     */
    .gamma(gamma)

    /*
     * Step 4 — contrast centred on middle grey.
     * Applied after gamma so the gamma curve isn't affected by the contrast shift.
     */
    .linear(contrast, contrastOffset)

    /*
     * Step 5 — per-channel colour tint (cinematic colour cast).
     * Applied last so it doesn't interact with the gamma/contrast pipeline.
     * Warm look: tintR > 0, tintB < 0
     * Cool look: tintR < 0, tintB > 0
     */
    .recomb([
      [rScale, 0,      0     ],
      [0,      gScale, 0     ],
      [0,      0,      bScale],
    ])

    /*
     * Step 6 — encode as JPEG.
     * quality 88 = visually lossless at a good file size balance.
     * (mozjpeg encoder omitted — requires separate native binary not always available.)
     */
    .jpeg({ quality: 88 })

    .toBuffer()
}
