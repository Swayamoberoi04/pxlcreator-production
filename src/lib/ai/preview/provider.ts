/**
 * src/lib/ai/preview/provider.ts
 *
 * PreviewProvider registry — sibling of src/lib/ai/provider.ts (vision),
 * same env-driven singleton pattern.
 *
 * Resolution:
 *   PREVIEW_ENGINE=off      → engine disabled (null)
 *   GEMINI_API_KEY present  → GeminiFlashImageProvider
 *   otherwise               → engine disabled (null) with a logged warning
 *
 * Adding FLUX Kontext later (blueprint §9.1) = one provider file + one
 * branch here. Callers never change.
 */

import type { PreviewProvider } from "@/types/preview"

let _provider: PreviewProvider | null | undefined

export async function getActivePreviewProvider(): Promise<PreviewProvider | null> {
  if (_provider !== undefined) return _provider

  if (process.env.PREVIEW_ENGINE?.trim().toLowerCase() === "off") {
    console.log(`[ai:preview] ${JSON.stringify({ event: "engine_disabled", reason: "PREVIEW_ENGINE=off" })}`)
    _provider = null
    return _provider
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    console.warn(`[ai:preview] ${JSON.stringify({ event: "engine_disabled", reason: "GEMINI_API_KEY not set" })}`)
    _provider = null
    return _provider
  }

  const { GeminiFlashImageProvider } = await import("./providers/gemini-image")
  _provider = new GeminiFlashImageProvider({
    apiKey,
    model: process.env.GEMINI_IMAGE_MODEL,
  })
  console.log(`[ai:preview] ${JSON.stringify({ event: "provider_selected", provider: _provider.providerId, model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image" })}`)
  return _provider
}

/** Test/ops hook — force re-resolution on next access. */
export function resetPreviewProvider(): void {
  _provider = undefined
}
