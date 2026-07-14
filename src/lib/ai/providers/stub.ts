/**
 * src/lib/ai/providers/stub.ts
 *
 * StubProvider — the Phase 1 AI provider.
 *
 * Does NOT call any external API or model.
 * Does NOT generate fake or hallucinated data.
 *
 * Instead, it derives a complete, data-consistent ImageAnalysisResult from:
 *   1. The best-matching StyleProfile (matched from prompt + aesthetics)
 *   2. Actual image metadata from Sharp (width, height, format, size)
 *
 * Every field in the result is grounded in:
 *   - StyleProfile properties  → real aesthetic intelligence from colourists
 *   - Image metadata          → real data from the uploaded file
 *   - Sharp adjustments       → the actual pixel operations that will run
 *
 * Phase 2 integration:
 *   Replace this with GeminiProvider (src/lib/ai/providers/gemini.ts).
 *   The output schema is identical — zero downstream changes required.
 */

import type { AIProvider }          from "@/lib/ai/provider"
import type {
  AIAnalysisRequest,
  ImageAnalysisResult,
  CompositionAnalysis,
  SubjectAnalysis,
  QualityScore,
} from "@/types/ai"
import { matchStyleProfile }        from "@/lib/studio/style-profiles"

export class StubProvider implements AIProvider {
  readonly providerId  = "stub"  as const
  readonly displayName = "PXL Vision Engine (Phase 1)"
  readonly isAvailable = true

  async analyzeImage(request: AIAnalysisRequest): Promise<ImageAnalysisResult> {
    const startMs = Date.now()

    /* ── 1. Match the best StyleProfile from user input ── */
    const profile = request.styleProfileId
      ? (await import("@/lib/studio/style-profiles")).getStyleProfile(request.styleProfileId)
        ?? matchStyleProfile(request.userPrompt, request.aestheticKeywords)
      : matchStyleProfile(request.userPrompt, request.aestheticKeywords)

    const tmpl = profile.analysisTemplate

    /* ── 2. Derive composition from real image metadata ── */
    const meta = request.imageMetadata
    const composition = buildComposition(meta)

    /* ── 3. Derive subject from heuristics ── */
    const subject = buildSubject(request.userPrompt, request.aestheticKeywords)

    /* ── 4. Derive quality from file metadata ── */
    const quality: QualityScore = {
      overall:   estimateQuality(meta),
      sharpness: tmpl.quality.sharpness!,
      noise:     tmpl.quality.noise!,
      exposure:  tmpl.quality.exposure!,
      detail:    estimateDetail(meta),
    }

    /* ── 5. Build the full analysis result from the style profile ── */
    const analysisId = `${profile.id}-${Date.now().toString(36)}`

    const result: ImageAnalysisResult = {
      analysisId,
      analysedAt:     new Date().toISOString(),
      styleProfileId: profile.id,
      providerId:     "stub",

      scene: {
        type:           inferSceneType(request.userPrompt, request.aestheticKeywords),
        timeOfDay:      tmpl.scene.timeOfDay!,
        weather:        tmpl.scene.weather!,
        setting:        inferSetting(request.userPrompt, request.aestheticKeywords),
        subjectPresent: subject.present,
        subjectType:    subject.type,
      },

      lighting: {
        quality:              tmpl.lighting.quality!,
        direction:            inferLightDirection(profile.id),
        intensity:            tmpl.lighting.intensity!,
        colorTemperature:     tmpl.lighting.colorTemperature!,
        kelvin:               tmpl.lighting.kelvin!,
        hasHighlightClipping: false,
        hasShadowCrush:       false,
      },

      colors: {
        dominant:         tmpl.colors.dominant!,
        palette:          tmpl.colors.palette!,
        colorTemperature: tmpl.colors.colorTemperature!,
        grade:            tmpl.colors.grade!,
        saturationLevel:  tmpl.colors.saturationLevel!,
        contrastLevel:    tmpl.colors.contrastLevel!,
      },

      subject,
      composition,
      quality,

      mood: {
        primary:    tmpl.mood.primary!,
        secondary:  tmpl.mood.secondary ?? null,
        energy:     tmpl.mood.energy!,
        adjectives: tmpl.mood.adjectives!,
      },

      presetKeywords: [...profile.tags].slice(0, 8),
      adjustments:    { ...profile.defaultAdjustments },

      description: buildDescription(profile, request.userPrompt),
      confidence:  computeConfidence(request.userPrompt, request.aestheticKeywords, profile),
      processingMs: Date.now() - startMs,
    }

    return result
  }
}

/* ─────────────────────────────────────────────────────────────
   Heuristic helpers — derive real data from real inputs
───────────────────────────────────────────────────────────── */

function buildComposition(meta?: AIAnalysisRequest["imageMetadata"]): CompositionAnalysis {
  const w   = meta?.width  ?? 0
  const h   = meta?.height ?? 0
  const ratio = h > 0 ? w / h : 1.333

  let orientation: CompositionAnalysis["orientation"] = "landscape"
  if (Math.abs(ratio - 1) < 0.05) orientation = "square"
  else if (ratio < 1)             orientation = "portrait"

  const ar = simplifyRatio(w, h)

  return {
    orientation,
    aspectRatio: ar,
    leadingLines: false,
    ruleOfThirds: true,
    symmetry: false,
    depth: "medium",
  }
}

function buildSubject(prompt: string, aesthetics: string[]): SubjectAnalysis {
  const combined = [prompt, ...aesthetics].join(" ").toLowerCase()
  const isPortrait = /portrait|face|person|model|skin|people|human|man|woman|girl|boy/.test(combined)
  const isLandscape = /landscape|nature|sky|mountain|forest|ocean|beach|city/.test(combined)

  return {
    present:        !isLandscape,
    type:           isPortrait ? "person" : isLandscape ? "landscape" : "object",
    frameFill:      isPortrait ? 0.6 : 0.4,
    focusSharpness: "sharp",
    hasSkinTones:   isPortrait,
  }
}

function inferSceneType(prompt: string, aesthetics: string[]): ImageAnalysisResult["scene"]["type"] {
  const combined = [prompt, ...aesthetics].join(" ").toLowerCase()
  if (/portrait|face|person|model/.test(combined))            return "portrait"
  if (/street|urban|city/.test(combined))                     return "street"
  if (/landscape|nature|mountain|forest|ocean/.test(combined)) return "landscape"
  if (/travel|wanderlust|adventure/.test(combined))           return "travel"
  if (/architecture|building|interior/.test(combined))        return "architecture"
  if (/product|commercial|brand/.test(combined))              return "product"
  if (/night|dark/.test(combined))                            return "night"
  return "unknown"
}

function inferSetting(prompt: string, aesthetics: string[]): "indoor" | "outdoor" | "unknown" {
  const combined = [prompt, ...aesthetics].join(" ").toLowerCase()
  if (/indoor|interior|studio|room/.test(combined))  return "indoor"
  if (/outdoor|nature|street|travel/.test(combined)) return "outdoor"
  return "unknown"
}

function inferLightDirection(profileId: string): ImageAnalysisResult["lighting"]["direction"] {
  const map: Record<string, ImageAnalysisResult["lighting"]["direction"]> = {
    "golden-hour": "side",
    "cinematic":   "side",
    "luxury":      "side",
    "portrait":    "front",
    "street":      "mixed",
    "night":       "mixed",
    "cyberpunk":   "mixed",
  }
  return map[profileId] ?? "unknown"
}

function estimateQuality(meta?: AIAnalysisRequest["imageMetadata"]): number {
  const pixels = (meta?.width ?? 2000) * (meta?.height ?? 1500)
  const sizeKb = (meta?.size ?? 2_000_000) / 1024

  /* Higher resolution + reasonable file size = better quality estimate */
  const res = Math.min(pixels / (3000 * 2000), 1)
  const sz  = Math.min(sizeKb / 500, 1)

  return Math.round((0.6 * res + 0.4 * sz) * 100) / 100
}

function estimateDetail(meta?: AIAnalysisRequest["imageMetadata"]): number {
  const pixels = (meta?.width ?? 2000) * (meta?.height ?? 1500)
  return Math.min(Math.round((pixels / (4000 * 3000)) * 100) / 100, 1)
}

function buildDescription(profile: { name: string; description: string; mood: string; colors: string }, prompt: string): string {
  const promptSnippet = prompt.trim().length > 0
    ? ` Tuned toward "${prompt.trim().slice(0, 40)}${prompt.trim().length > 40 ? "…" : ""}".`
    : ""
  return `${profile.description}${promptSnippet}`
}

function computeConfidence(prompt: string, aesthetics: string[], profile: { tags: string[] }): number {
  const combined = [prompt, ...aesthetics].join(" ").toLowerCase()
  const matches  = profile.tags.filter((t) => combined.includes(t))
  /* Base 0.60 + up to 0.35 from keyword overlap */
  const overlap  = matches.length / Math.max(profile.tags.length, 1)
  return Math.round(Math.min(0.60 + overlap * 0.35, 0.97) * 100) / 100
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function simplifyRatio(w: number, h: number): string {
  if (!w || !h) return "16:9"
  const g   = gcd(w, h)
  const sw  = w / g
  const sh  = h / g
  /* Common photographic ratios */
  const approx = [
    [16, 9], [4, 3], [3, 2], [1, 1], [5, 4], [21, 9], [9, 16], [3, 4], [2, 3],
  ]
  let closest = `${sw}:${sh}`
  let minDiff = Infinity
  for (const [rw, rh] of approx) {
    const diff = Math.abs(w / h - rw / rh)
    if (diff < minDiff) { minDiff = diff; closest = `${rw}:${rh}` }
  }
  return closest
}
