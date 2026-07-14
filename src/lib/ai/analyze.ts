/**
 * src/lib/ai/analyze.ts
 *
 * Thin orchestration layer between the API route and the active AIProvider.
 *
 * Responsibilities:
 *   1. Obtain the active provider via getActiveProvider()
 *   2. Forward the request to provider.analyzeImage()
 *   3. Extract a backward-compatible AIAnalysis from the rich ImageAnalysisResult
 *   4. Return both shapes so callers can use either
 *
 * Phase 2 integration:
 *   This file does NOT change when switching providers.
 *   Swap the provider in src/lib/ai/provider.ts → getActiveProvider().
 *
 * Server-only. Never imported by client components.
 */

import { getActiveProvider }    from "@/lib/ai/provider"
import type { ImageAnalysisResult } from "@/types/ai"
import type { AIAnalysis }      from "@/types/studio"

export interface AnalyzeResult {
  /** Legacy shape — kept for backward compat with processImage() callers */
  analysis:      AIAnalysis
  /** Rich shape — used by the premium AnalysisCard UI component */
  imageAnalysis: ImageAnalysisResult
}

/**
 * Analyses an image against a user prompt and aesthetic keywords.
 *
 * @param buffer     - Raw image buffer (validated by Sharp before this call)
 * @param prompt     - User's free-text aesthetic description
 * @param aesthetics - Keyword strings from selected aesthetic chips
 * @param metadata   - Pre-computed Sharp metadata (optional, improves composition analysis)
 */
export async function analyzeImage(
  buffer:     Buffer,
  prompt:     string,
  aesthetics: string[],
  metadata?:  { width?: number; height?: number; format?: string; size?: number }
): Promise<AnalyzeResult> {
  const provider = await getActiveProvider()

  const imageAnalysis = await provider.analyzeImage({
    imageBuffer:       buffer,
    userPrompt:        prompt,
    aestheticKeywords: aesthetics,
    imageMetadata:     metadata,
  })

  /* Extract backward-compatible AIAnalysis from the rich result */
  const analysis: AIAnalysis = {
    mood:           imageAnalysis.mood.adjectives.slice(0, 2).join(" "),
    description:    imageAnalysis.description,
    adjustments:    imageAnalysis.adjustments,
    presetKeywords: imageAnalysis.presetKeywords,
    confidence:     imageAnalysis.confidence,
  }

  return { analysis, imageAnalysis }
}
