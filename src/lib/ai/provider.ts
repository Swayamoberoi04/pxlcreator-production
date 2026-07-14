/**
 * src/lib/ai/provider.ts
 *
 * AIProvider — the interface every vision model must implement.
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  PROVIDER REGISTRY (Phase 2 active)                     │
 * │                                                         │
 * │  Providers:                                             │
 * │    stub          — src/lib/ai/providers/stub.ts         │
 * │    gemini-vision — src/lib/ai/providers/gemini.ts       │
 * │                                                         │
 * │  Selection is env-driven (see getActiveProvider):       │
 * │    GEMINI_API_KEY set  → GeminiProvider                 │
 * │    AI_PROVIDER=stub    → force StubProvider             │
 * │    neither             → StubProvider + warning         │
 * │                                                         │
 * │  To add another vendor (e.g. OpenAI Vision): create     │
 * │  providers/openai.ts implementing AIProvider, add one   │
 * │  branch below. Zero downstream changes.                 │
 * └─────────────────────────────────────────────────────────┘
 */

import type {
  AIAnalysisRequest,
  ImageAnalysisResult,
  AIProviderId,
} from "@/types/ai"

/* ─────────────────────────────────────────────────────────────
   Provider Interface
   Any vision AI provider must implement this contract.
───────────────────────────────────────────────────────────── */

export interface AIProvider {
  /** Machine-readable ID, e.g. "stub", "gemini-vision", "openai-gpt4v" */
  readonly providerId:   AIProviderId
  /** Human-readable name for display and logging */
  readonly displayName:  string
  /** Whether this provider can currently accept requests */
  readonly isAvailable:  boolean

  /**
   * Analyse an image and return a structured result.
   *
   * Phase 1 (StubProvider): derives from selected StyleProfile + image metadata.
   * Phase 2 (GeminiProvider): sends image pixels to Gemini Vision API.
   *
   * The returned shape is identical in both phases — no downstream changes.
   */
  analyzeImage(request: AIAnalysisRequest): Promise<ImageAnalysisResult>
}

/* ─────────────────────────────────────────────────────────────
   Active Provider Registry
   Change getActiveProvider() to swap implementations.
───────────────────────────────────────────────────────────── */

let _provider: AIProvider | null = null

/**
 * Returns the active AI provider instance (singleton per process).
 *
 * Resolution order:
 *   1. AI_PROVIDER=stub          → StubProvider (explicit override, useful in dev/CI)
 *   2. GEMINI_API_KEY present    → GeminiProvider (Phase 2 — production)
 *   3. otherwise                 → StubProvider with a startup warning
 *
 * Swapping to another vendor later (e.g. OpenAI Vision) means adding one
 * provider file and one branch here. No other file changes.
 */
export async function getActiveProvider(): Promise<AIProvider> {
  if (_provider) return _provider

  const forced = process.env.AI_PROVIDER?.trim().toLowerCase()
  const geminiKey = process.env.GEMINI_API_KEY?.trim()

  if (forced !== "stub" && geminiKey) {
    /* Phase 2: Gemini Vision — real image analysis */
    const { GeminiProvider } = await import("@/lib/ai/providers/gemini")
    _provider = new GeminiProvider({
      apiKey: geminiKey,
      model:  process.env.GEMINI_MODEL,
    })
    console.log(`[ai:provider] ${JSON.stringify({ event: "provider_selected", provider: "gemini-vision", model: process.env.GEMINI_MODEL || "gemini-3.5-flash" })}`)
    return _provider
  }

  /* Fallback: StubProvider — no API key required */
  if (forced !== "stub") {
    console.warn(`[ai:provider] ${JSON.stringify({ event: "provider_fallback", reason: "GEMINI_API_KEY not set", provider: "stub" })}`)
  }
  const { StubProvider } = await import("@/lib/ai/providers/stub")
  _provider = new StubProvider()
  return _provider
}

/**
 * Force-resets the provider singleton.
 * Useful in tests and when rotating keys at runtime.
 */
export function resetProvider(): void {
  _provider = null
}
