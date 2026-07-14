/**
 * src/lib/ai/providers/gemini.ts
 *
 * GeminiProvider — Phase 2 production vision provider.
 *
 * Implements the same AIProvider contract as StubProvider. Zero downstream
 * changes: analyze.ts, the API routes, and the UI are untouched.
 *
 * Pipeline per request:
 *   1. Resolve the StyleProfile deterministically from the user's words
 *   2. Preprocess the image with Sharp (EXIF rotate, ≤768px, JPEG q80)
 *      → the whole image fits one Gemini tile = flat 258 input tokens
 *   3. Call Gemini (Interactions API, JSON mode + response schema,
 *      low thinking, temperature 0.2) with timeout + bounded retries
 *   4. Parse → Zod-validate → clamp (see gemini-schema.ts)
 *   5. Merge: profile grade + Gemini's bounded corrective deltas,
 *      clamped again against absolute rails
 *   6. On unrecoverable failure, degrade gracefully to StubProvider so the
 *      user's edit never fails outright. The result honestly reports
 *      providerId "stub" when that happens.
 *
 * Environment:
 *   GEMINI_API_KEY  (required)  — server-side only, never NEXT_PUBLIC
 *   GEMINI_MODEL    (optional)  — default "gemini-3.5-flash";
 *                                 set "gemini-3.1-flash-lite" to cut cost
 *
 * Security: the API key lives only in this module's closure. Image bytes are
 * sent to Google for analysis and are never persisted by us.
 */

import type { AIProvider } from "@/lib/ai/provider"
import type {
  AIAnalysisRequest,
  ImageAnalysisResult,
  AIAdjustments,
  CompositionAnalysis,
  StyleProfile,
} from "@/types/ai"
import { getStyleProfile, matchStyleProfile } from "@/lib/studio/style-profiles"
import { SYSTEM_INSTRUCTION, buildUserPrompt } from "./gemini-prompt"
import {
  RESPONSE_JSON_SCHEMA,
  parseGeminiResponse,
  GeminiParseError,
  ADJUSTMENT_RAILS,
  clamp,
  type GeminiVisionResponse,
} from "./gemini-schema"

/* ─────────────────────────────────────────────────────────────
   Configuration
───────────────────────────────────────────────────────────── */

export interface GeminiProviderConfig {
  apiKey:          string
  /** Default "gemini-3.5-flash". Use "gemini-3.1-flash-lite" for lower cost. */
  model?:          string
  /** Per-attempt timeout in ms. Default 25s. */
  timeoutMs?:      number
  /** Retries after the first attempt. Default 2. */
  maxRetries?:     number
  /** Degrade to StubProvider instead of throwing on total failure. Default true. */
  fallbackToStub?: boolean
}

const DEFAULT_MODEL      = "gemini-3.5-flash"
const DEFAULT_TIMEOUT_MS = 25_000
const DEFAULT_RETRIES    = 2
/** Longest image edge sent for analysis — one Gemini tile, 258 tokens */
const ANALYSIS_MAX_EDGE  = 768

export class GeminiProvider implements AIProvider {
  readonly providerId  = "gemini-vision" as const
  readonly displayName = "Google Gemini Vision"

  private readonly apiKey:         string
  private readonly model:          string
  private readonly timeoutMs:      number
  private readonly maxRetries:     number
  private readonly fallbackToStub: boolean

  constructor(config: GeminiProviderConfig) {
    this.apiKey         = config.apiKey
    this.model          = config.model?.trim() || DEFAULT_MODEL
    this.timeoutMs      = config.timeoutMs      ?? DEFAULT_TIMEOUT_MS
    this.maxRetries     = config.maxRetries     ?? DEFAULT_RETRIES
    this.fallbackToStub = config.fallbackToStub ?? true
  }

  get isAvailable(): boolean {
    return this.apiKey.length > 0
  }

  async analyzeImage(request: AIAnalysisRequest): Promise<ImageAnalysisResult> {
    const startMs = Date.now()

    try {
      return await this.analyzeWithGemini(request, startMs)
    } catch (err) {
      logError("analysis_failed_final", {
        model:     this.model,
        latencyMs: Date.now() - startMs,
        error:     errMessage(err),
      })
      if (!this.fallbackToStub) throw err

      /* Graceful degradation — the edit still succeeds, honestly labelled */
      log("fallback_to_stub", { reason: errMessage(err) })
      const { StubProvider } = await import("./stub")
      return new StubProvider().analyzeImage(request)
    }
  }

  /* ───────────────────────────────────────────────────────────
     Core Gemini pipeline
  ─────────────────────────────────────────────────────────── */

  private async analyzeWithGemini(
    request: AIAnalysisRequest,
    startMs: number
  ): Promise<ImageAnalysisResult> {

    /* 1 ── Deterministic profile match from the user's own words */
    const localProfile = request.styleProfileId
      ? getStyleProfile(request.styleProfileId) ?? matchStyleProfile(request.userPrompt, request.aestheticKeywords)
      : matchStyleProfile(request.userPrompt, request.aestheticKeywords)

    const userLockedProfile = Boolean(request.styleProfileId)
    const localOverlap      = hasTagOverlap(request.userPrompt, request.aestheticKeywords, localProfile)

    /* 2 ── Image preprocessing (token + latency optimization) */
    const prepStart = Date.now()
    const { base64, bytes } = await preprocessImage(request.imageBuffer)
    const prepMs = Date.now() - prepStart

    /* 3 ── Model call with timeout + bounded retries */
    const userPrompt = buildUserPrompt({
      userPrompt:        request.userPrompt,
      aestheticKeywords: request.aestheticKeywords,
      matchedProfile:    localProfile,
      imageMetadata:     request.imageMetadata,
    })

    const { parsed, providerLatencyMs, tokens, attempts } =
      await this.callWithRetry(base64, userPrompt)

    /* 4 ── Final profile resolution
       - explicit user selection always wins
       - otherwise trust Gemini's image-informed suggestion when the local
         text match was weak (no tag overlap = pure default) */
    let profile = localProfile
    if (!userLockedProfile && parsed.suggestedStyleProfileId !== localProfile.id) {
      if (!localOverlap) {
        profile = getStyleProfile(parsed.suggestedStyleProfileId) ?? localProfile
      }
    }

    /* 5 ── Merge grade: profile base + bounded Gemini refinements */
    const adjustments = mergeAdjustments(profile.defaultAdjustments, parsed.adjustmentTuning)

    const result = composeResult({
      request, parsed, profile, adjustments,
      processingMs: Date.now() - startMs,
    })

    log("analysis_ok", {
      model:            this.model,
      analysisId:       result.analysisId,
      profile:          profile.id,
      profileSource:    userLockedProfile ? "user" : profile.id === localProfile.id ? "text-match" : "gemini",
      confidence:       result.confidence,
      attempts,
      preprocessMs:     prepMs,
      providerLatencyMs,
      totalMs:          result.processingMs,
      imageBytesSent:   bytes,
      inputTokens:      tokens.input,
      outputTokens:     tokens.output,
      thoughtTokens:    tokens.thought,
    })

    return result
  }

  /* ───────────────────────────────────────────────────────────
     Transport: Interactions API + retry with exponential backoff
  ─────────────────────────────────────────────────────────── */

  private async callWithRetry(imageBase64: string, userPrompt: string) {
    let lastError: unknown

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const backoff = 600 * 2 ** (attempt - 1) + Math.random() * 300
        log("retrying", { attempt, backoffMs: Math.round(backoff), reason: errMessage(lastError) })
        await sleep(backoff)
      }

      const callStart = Date.now()
      try {
        const raw = await withTimeout(this.callGemini(imageBase64, userPrompt), this.timeoutMs)
        const parsed = parseGeminiResponse(raw.text)
        return {
          parsed,
          providerLatencyMs: Date.now() - callStart,
          tokens:            raw.tokens,
          attempts:          attempt + 1,
        }
      } catch (err) {
        lastError = err
        if (!isRetryable(err) || attempt === this.maxRetries) throw err
      }
    }

    /* Unreachable — loop either returns or throws */
    throw lastError
  }

  private async callGemini(imageBase64: string, userPrompt: string) {
    const { GoogleGenAI } = await import("@google/genai")
    const ai = new GoogleGenAI({ apiKey: this.apiKey })

    const interaction = await ai.interactions.create({
      model: this.model,
      system_instruction: SYSTEM_INSTRUCTION,
      input: [
        { type: "image", data: imageBase64, mime_type: "image/jpeg" },
        { type: "text",  text: userPrompt },
      ],
      response_format: {
        type:      "text",
        mime_type: "application/json",
        schema:    RESPONSE_JSON_SCHEMA as Record<string, unknown>,
      },
      generation_config: {
        temperature:       0.2,      // analytical task — low variance
        thinking_level:    "low",    // schema-constrained extraction needs little deliberation
        max_output_tokens: 2048,
      },
      store: false,                  // never persist user images on Google's side
    })

    const text = interaction.output_text
    if (!text) {
      throw new GeminiEmptyResponseError(`Empty response (status: ${interaction.status ?? "unknown"})`)
    }

    return {
      text,
      tokens: {
        input:   interaction.usage?.total_input_tokens   ?? null,
        output:  interaction.usage?.total_output_tokens  ?? null,
        thought: interaction.usage?.total_thought_tokens ?? null,
      },
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   Image preprocessing
───────────────────────────────────────────────────────────── */

async function preprocessImage(buffer: Buffer): Promise<{ base64: string; bytes: number }> {
  const sharp = (await import("sharp")).default

  const optimized = await sharp(buffer)
    .rotate()                                   // honour EXIF orientation
    .resize(ANALYSIS_MAX_EDGE, ANALYSIS_MAX_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer()

  return { base64: optimized.toString("base64"), bytes: optimized.length }
}

/* ─────────────────────────────────────────────────────────────
   Merging: profile grade + Gemini's bounded corrections
───────────────────────────────────────────────────────────── */

function mergeAdjustments(
  base:   AIAdjustments,
  tuning: GeminiVisionResponse["adjustmentTuning"]
): AIAdjustments {
  const r = ADJUSTMENT_RAILS
  return {
    brightness: clamp(base.brightness + tuning.exposureDelta,   r.brightness.min, r.brightness.max),
    contrast:   clamp(base.contrast   + tuning.contrastDelta,   r.contrast.min,   r.contrast.max),
    saturation: clamp(base.saturation + tuning.saturationDelta, r.saturation.min, r.saturation.max),
    hue:        clamp(base.hue,                                 r.hue.min,        r.hue.max),
    gamma:      clamp(base.gamma,                               r.gamma.min,      r.gamma.max),
    tintR:      clamp(base.tintR + tuning.warmthDelta,          r.tint.min,       r.tint.max),
    tintG:      clamp(base.tintG,                               r.tint.min,       r.tint.max),
    tintB:      clamp(base.tintB - tuning.warmthDelta,          r.tint.min,       r.tint.max),
  }
}

/* ─────────────────────────────────────────────────────────────
   Result composition — Gemini observations + profile grade data
───────────────────────────────────────────────────────────── */

function composeResult(args: {
  request:      AIAnalysisRequest
  parsed:       GeminiVisionResponse
  profile:      StyleProfile
  adjustments:  AIAdjustments
  processingMs: number
}): ImageAnalysisResult {
  const { request, parsed, profile, adjustments, processingMs } = args
  const tmpl = profile.analysisTemplate

  return {
    analysisId:     `${profile.id}-${Date.now().toString(36)}`,
    analysedAt:     new Date().toISOString(),
    styleProfileId: profile.id,
    providerId:     "gemini-vision",

    scene: parsed.scene,

    lighting: {
      quality:              parsed.lighting.quality,
      direction:            parsed.lighting.direction,
      intensity:            parsed.lighting.intensity,
      colorTemperature:     parsed.lighting.colorTemperature,
      kelvin:               Math.round(parsed.lighting.kelvin),
      hasHighlightClipping: parsed.lighting.hasHighlightClipping,
      hasShadowCrush:       parsed.lighting.hasShadowCrush,
    },

    colors: {
      /* What Gemini actually saw in the pixels */
      dominant:         parsed.colors.dominant.length > 0 ? parsed.colors.dominant : tmpl.colors.dominant!,
      colorTemperature: parsed.colors.colorTemperature,
      saturationLevel:  parsed.colors.saturationLevel,
      contrastLevel:    parsed.colors.contrastLevel,
      /* What the grade will apply — from the profile definition */
      palette:          tmpl.colors.palette!,
      grade:            tmpl.colors.grade!,
    },

    subject: parsed.subject,

    mood: {
      primary:    parsed.mood.primary,
      secondary:  parsed.mood.secondary === "none" ? null : parsed.mood.secondary,
      energy:     parsed.mood.energy,
      adjectives: parsed.mood.adjectives.length > 0 ? parsed.mood.adjectives : tmpl.mood.adjectives!,
    },

    composition: {
      ...computeGeometry(request.imageMetadata),   // orientation + ratio from real dimensions
      leadingLines: parsed.composition.leadingLines,
      ruleOfThirds: parsed.composition.ruleOfThirds,
      symmetry:     parsed.composition.symmetry,
      depth:        parsed.composition.depth,
    },

    quality: {
      overall:   round2(parsed.quality.overall),
      sharpness: parsed.quality.sharpness,
      noise:     parsed.quality.noise,
      exposure:  parsed.quality.exposure,
      detail:    round2(parsed.quality.detail),
    },

    presetKeywords: mergeKeywords(parsed.presetKeywords, profile.tags),
    adjustments,

    description: parsed.description || profile.description,
    confidence:  round2(parsed.confidence),
    processingMs,
  }
}

function computeGeometry(
  meta?: AIAnalysisRequest["imageMetadata"]
): Pick<CompositionAnalysis, "orientation" | "aspectRatio"> {
  const w = meta?.width  ?? 0
  const h = meta?.height ?? 0
  const ratio = h > 0 ? w / h : 1.333

  let orientation: CompositionAnalysis["orientation"] = "landscape"
  if (Math.abs(ratio - 1) < 0.05) orientation = "square"
  else if (ratio < 1)             orientation = "portrait"

  const COMMON: Array<[number, number]> = [
    [16, 9], [4, 3], [3, 2], [1, 1], [5, 4], [21, 9], [9, 16], [3, 4], [2, 3],
  ]
  let aspectRatio = "16:9"
  let minDiff = Infinity
  if (w > 0 && h > 0) {
    for (const [rw, rh] of COMMON) {
      const diff = Math.abs(ratio - rw / rh)
      if (diff < minDiff) { minDiff = diff; aspectRatio = `${rw}:${rh}` }
    }
  }
  return { orientation, aspectRatio }
}

function mergeKeywords(fromModel: string[], fromProfile: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const k of [...fromModel, ...fromProfile]) {
    const norm = k.toLowerCase().trim()
    if (norm && !seen.has(norm)) {
      seen.add(norm)
      out.push(norm)
      if (out.length >= 8) break
    }
  }
  return out
}

function hasTagOverlap(prompt: string, aesthetics: string[], profile: StyleProfile): boolean {
  const combined = [prompt, ...aesthetics].join(" ").toLowerCase()
  return profile.tags.some((t) => combined.includes(t))
}

/* ─────────────────────────────────────────────────────────────
   Errors, timeout, retry classification
───────────────────────────────────────────────────────────── */

export class GeminiTimeoutError extends Error {
  readonly name = "GeminiTimeoutError"
}
export class GeminiEmptyResponseError extends Error {
  readonly name = "GeminiEmptyResponseError"
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new GeminiTimeoutError(`Provider timed out after ${ms}ms`)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof GeminiTimeoutError)       return true
  if (err instanceof GeminiEmptyResponseError) return true
  /* A parse failure is usually a one-off generation glitch — retry once */
  if (err instanceof GeminiParseError)         return true

  const msg    = errMessage(err).toLowerCase()
  const status = extractStatus(err)

  if (status !== null) {
    /* Rate limits and server-side errors are transient; 4xx client errors are not */
    return status === 429 || status >= 500
  }
  /* Network-level failures with no HTTP status */
  return /fetch failed|network|econnreset|econnrefused|etimedout|socket|aborted/.test(msg)
}

function extractStatus(err: unknown): number | null {
  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>
    for (const key of ["status", "statusCode", "code"]) {
      const v = e[key]
      if (typeof v === "number" && v >= 100 && v < 600) return v
    }
  }
  const m = errMessage(err).match(/\b(429|500|502|503|504)\b/)
  return m ? parseInt(m[1], 10) : null
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/* ─────────────────────────────────────────────────────────────
   Structured logging — single-line JSON for log aggregators
───────────────────────────────────────────────────────────── */

function log(event: string, data: Record<string, unknown>): void {
  console.log(`[ai:gemini] ${JSON.stringify({ event, ...data })}`)
}

function logError(event: string, data: Record<string, unknown>): void {
  console.error(`[ai:gemini] ${JSON.stringify({ event, ...data })}`)
}
