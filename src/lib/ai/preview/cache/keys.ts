/**
 * src/lib/ai/preview/cache/keys.ts
 *
 * Phase 4E — deterministic cache key construction.
 *
 * Every key is a pure function of its inputs plus the relevant version
 * constants, in a FIXED segment order — stable across deployments and
 * process restarts. Version constants are baked into the key, so any
 * version change (prompt template, QA config, engine, provider) rotates
 * the affected namespace automatically: stale entries can never match
 * again (passive invalidation, §5) and age out via TTL.
 *
 * Segment layout (":"-joined, namespace first so one L1 table serves
 * every namespace without schema change):
 *
 *   preview  v2:preview:{phash}:{preset}:{profile}:{provider}:{promptV}:{qaV}:{engineV}
 *   metadata v2:metadata:{contentHash}
 *   feature  v2:feature:{contentHash}:{qaV}
 *   prompt   v2:prompt:{phash}:{preset}:{profile}:{promptV}
 *   qa       v2:qa:{origHash}:{prevHash}:{qaV}
 *   provider v2:provider:{phash}:{instructionHash}:{provider}:{engineV}
 *
 * The legacy Phase 4B preview key ({phash}:{preset}:{promptV}:{provider},
 * no namespace prefix) is intentionally NOT emitted anymore — the richer
 * key is a superset, and no production entry ever existed under the old
 * format (generation has never succeeded pre-billing), so nothing is
 * orphaned.
 */

import { createHash } from "node:crypto"
import { PROMPT_VERSION } from "../prompt-builder"
import { QA_CONFIG_VERSION } from "../qa/config"
import { ENGINE_VERSION } from "./config"

const KEY_SCHEMA = "v2"

export function previewKey(parts: {
  imagePhash:     string
  presetSlug:     string
  styleProfileId: string
  providerId:     string
}): string {
  return [
    KEY_SCHEMA, "preview",
    parts.imagePhash, parts.presetSlug, parts.styleProfileId, parts.providerId,
    PROMPT_VERSION, QA_CONFIG_VERSION, ENGINE_VERSION,
  ].join(":")
}

export function metadataKey(contentHash: string): string {
  return [KEY_SCHEMA, "metadata", contentHash].join(":")
}

export function featureKey(contentHash: string): string {
  return [KEY_SCHEMA, "feature", contentHash, QA_CONFIG_VERSION].join(":")
}

export function promptKey(parts: {
  imagePhash:     string
  presetSlug:     string
  styleProfileId: string
}): string {
  return [KEY_SCHEMA, "prompt", parts.imagePhash, parts.presetSlug, parts.styleProfileId, PROMPT_VERSION].join(":")
}

export function qaKey(originalHash: string, previewHash: string): string {
  return [KEY_SCHEMA, "qa", originalHash, previewHash, QA_CONFIG_VERSION].join(":")
}

export function providerResponseKey(parts: {
  imagePhash:      string
  instructionHash: string
  providerId:      string
}): string {
  return [KEY_SCHEMA, "provider", parts.imagePhash, parts.instructionHash, parts.providerId, ENGINE_VERSION].join(":")
}

/** Stable short content hash for arbitrary bytes/strings. */
export function contentHash(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex").slice(0, 20)
}

/** Parse the phash + preset segments back out of a preview key (for the
    near-duplicate index). Returns null for foreign/legacy keys. */
export function parsePreviewKey(key: string): { imagePhash: string; presetSlug: string } | null {
  const seg = key.split(":")
  if (seg.length !== 9 || seg[0] !== KEY_SCHEMA || seg[1] !== "preview") return null
  return { imagePhash: seg[2], presetSlug: seg[3] }
}

/** Namespace prefix for bulk operations (manual invalidation). */
export function namespacePrefix(ns: string): string {
  return `${KEY_SCHEMA}:${ns}:`
}
