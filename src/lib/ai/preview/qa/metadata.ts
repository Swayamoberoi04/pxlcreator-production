/**
 * src/lib/ai/preview/qa/metadata.ts
 *
 * Image Metadata Validation (Phase 4C §3).
 *
 * Note on corruption/file integrity: an unreadable preview never
 * reaches this module — extractFeatures() decodes via Sharp and throws,
 * which the gate converts into a hard FAIL with reason "corrupt-file".
 * This module validates what a *decodable* preview must still satisfy:
 * resolution floor, aspect-ratio identity, orientation identity.
 */

import type { QAConfig } from "./config"
import type { ImageFeatures } from "./features"
import type { QAModuleResult } from "./types"

export function evaluateMetadata(
  original: ImageFeatures,
  preview:  ImageFeatures,
  config:   QAConfig
): QAModuleResult {
  const { aspectTolerance, minEdge } = config.metadata

  const aspectOrig    = original.width / original.height
  const aspectPrev    = preview.width / preview.height
  const aspectDelta   = Math.abs(aspectPrev - aspectOrig) / aspectOrig
  const aspectOk      = aspectDelta <= aspectTolerance

  const orientation = (w: number, h: number) =>
    Math.abs(w / h - 1) < 0.05 ? "square" : w > h ? "landscape" : "portrait"
  const orientationOk = orientation(original.width, original.height) === orientation(preview.width, preview.height)

  /* Resolution floor is relative to the source: a legitimately small
     original must not auto-fail; a downscaled PREVIEW of a large
     original must. */
  const requiredEdge = Math.min(minEdge, Math.min(original.width, original.height) * 0.9)
  const resolutionOk = Math.min(preview.width, preview.height) >= requiredEdge

  const failures = [!aspectOk, !orientationOk, !resolutionOk].filter(Boolean).length
  const score    = failures === 0 ? 1 : failures === 1 ? 0.4 : 0

  return {
    score,
    /* A changed aspect ratio or orientation means cropping/rotation —
       the identity lock was violated at the geometric level. */
    hardFail: !aspectOk || !orientationOk,
    reasons: [
      ...(!aspectOk      ? ["aspect-changed"]      : []),
      ...(!orientationOk ? ["orientation-changed"] : []),
      ...(!resolutionOk  ? ["resolution-too-low"]  : []),
    ],
    metrics: {
      aspectDelta:  Math.round(aspectDelta * 10000) / 10000,
      previewWidth: preview.width,
      previewHeight: preview.height,
    },
    checks: [
      {
        name:   "metadata-aspect-ratio",
        passed: aspectOk,
        detail: `aspect ${aspectPrev.toFixed(3)} vs ${aspectOrig.toFixed(3)} (Δ ${(aspectDelta * 100).toFixed(1)}%, tol ${aspectTolerance * 100}%)`,
      },
      {
        name:   "metadata-orientation",
        passed: orientationOk,
        detail: `${orientation(preview.width, preview.height)} vs ${orientation(original.width, original.height)}`,
      },
      {
        name:   "metadata-resolution",
        passed: resolutionOk,
        detail: `${preview.width}×${preview.height} (required edge ≥${Math.round(requiredEdge)}px)`,
      },
    ],
  }
}
