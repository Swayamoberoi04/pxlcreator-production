/**
 * src/lib/ai/provider.ts
 *
 * AIProvider — the interface every vision model must implement.
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  PHASE 2 INTEGRATION POINT                              │
 * │                                                         │
 * │  To add Gemini Vision:                                  │
 * │    1. Create src/lib/ai/providers/gemini.ts             │
 * │    2. Implement the AIProvider interface below          │
 * │    3. In getActiveProvider(), swap stub → gemini        │
 * │    4. Set GEMINI_API_KEY in your environment            │
 * │                                                         │
 * │  Zero downstream changes needed — all callers use       │
 * │  the same analyzeImage() signature.                     │
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
 * Phase 2 swap:
 *   Replace the import + instantiation below with GeminiProvider.
 *   The caller (analyze.ts) never changes.
 */
export async function getActiveProvider(): Promise<AIProvider> {
  if (_provider) return _provider

  /* Phase 1: StubProvider — no API key required */
  const { StubProvider } = await import("@/lib/ai/providers/stub")
  _provider = new StubProvider()

  /* ─────────────────────────────────────────
     Phase 2 swap — uncomment ONE of these:

     import { GeminiProvider } from "@/lib/ai/providers/gemini"
     _provider = new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY! })

     import { OpenAIProvider } from "@/lib/ai/providers/openai"
     _provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY! })
  ───────────────────────────────────────── */

  return _provider
}

/**
 * Force-resets the provider singleton.
 * Useful in tests and when rotating keys at runtime.
 */
export function resetProvider(): void {
  _provider = null
}
