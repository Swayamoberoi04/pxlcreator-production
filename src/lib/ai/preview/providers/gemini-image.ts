/**
 * src/lib/ai/preview/providers/gemini-image.ts
 *
 * GeminiFlashImageProvider — generates the AI-visualized preset preview
 * with Gemini 3.1 Flash Image ("Nano Banana 2") through the SAME
 * @google/genai SDK, key, and transport discipline as the Phase 2
 * vision provider: per-attempt timeout, bounded retries with jittered
 * exponential backoff, fail-fast on 4xx, structured [ai:preview] logs,
 * store:false so Google never persists user images.
 *
 * Editing mode: the original photograph is sent as an image input part
 * together with the identity-locked instruction; response_modalities
 * ["image"] requests an edited image back (interaction.output_image).
 */

import type {
  PreviewProvider,
  PreviewGenerationRequest,
  PreviewGenerationResult,
} from "@/types/preview"

export interface GeminiFlashImageConfig {
  apiKey:      string
  /** Default "gemini-3.1-flash-image" (Nano Banana 2, stable) */
  model?:      string
  /** Per-attempt timeout. Default 20s (blueprint ceiling). */
  timeoutMs?:  number
  /** Retries after the first attempt. Default 1. */
  maxRetries?: number
}

const DEFAULT_MODEL      = "gemini-3.1-flash-image"
const DEFAULT_TIMEOUT_MS = 20_000
const DEFAULT_RETRIES    = 1

/** Blueprint §7: ~$0.04 per generated 1024px image. */
const COST_PER_PREVIEW_USD = 0.04

export class GeminiFlashImageProvider implements PreviewProvider {
  readonly providerId  = "gemini-flash-image" as const
  readonly displayName = "Gemini 3.1 Flash Image"
  readonly costPerPreviewUsd = COST_PER_PREVIEW_USD

  private readonly apiKey:     string
  private readonly model:      string
  private readonly timeoutMs:  number
  private readonly maxRetries: number

  constructor(config: GeminiFlashImageConfig) {
    this.apiKey     = config.apiKey
    this.model      = config.model?.trim() || DEFAULT_MODEL
    this.timeoutMs  = config.timeoutMs  ?? DEFAULT_TIMEOUT_MS
    this.maxRetries = config.maxRetries ?? DEFAULT_RETRIES
  }

  get isAvailable(): boolean {
    return this.apiKey.length > 0
  }

  async generatePreview(request: PreviewGenerationRequest): Promise<PreviewGenerationResult> {
    let lastError: unknown

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const backoff = 800 * 2 ** (attempt - 1) + Math.random() * 300
        log("retrying", { attempt, backoffMs: Math.round(backoff), reason: errMessage(lastError) })
        await sleep(backoff)
      }

      const callStart = Date.now()
      try {
        const result = await withTimeout(this.callGemini(request), this.timeoutMs)
        return {
          ...result,
          providerLatencyMs: Date.now() - callStart,
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

  private async callGemini(
    request: PreviewGenerationRequest
  ): Promise<Omit<PreviewGenerationResult, "providerLatencyMs" | "attempts">> {
    const { GoogleGenAI } = await import("@google/genai")
    const ai = new GoogleGenAI({ apiKey: this.apiKey })

    const interaction = await ai.interactions.create({
      model: this.model,
      input: [
        { type: "image", data: request.imageBase64, mime_type: request.mimeType },
        { type: "text",  text: request.instruction },
      ],
      response_modalities: ["image"],
      store: false,                   // never persist user images on Google's side
    }, {
      /* Retries are owned by our ladder above. The SDK's internal retry
         clones the request per attempt, which throws "TypeError: unusable"
         on consumed bodies (undici) and masks the real HTTP error. */
      maxRetries: 0,
    })

    const image = interaction.output_image
    if (!image?.data) {
      throw new PreviewEmptyResponseError(
        `No image in response (status: ${interaction.status ?? "unknown"})`
      )
    }

    return {
      imageBase64: image.data,
      mimeType:    image.mime_type ?? "image/png",
      usage: {
        inputTokens:  interaction.usage?.total_input_tokens  ?? null,
        outputTokens: interaction.usage?.total_output_tokens ?? null,
      },
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   Errors, timeout, retry classification
   (mirrors src/lib/ai/providers/gemini.ts)
───────────────────────────────────────────────────────────── */

export class PreviewTimeoutError extends Error {
  readonly name = "PreviewTimeoutError"
}
export class PreviewEmptyResponseError extends Error {
  readonly name = "PreviewEmptyResponseError"
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PreviewTimeoutError(`Provider timed out after ${ms}ms`)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof PreviewTimeoutError)       return true
  if (err instanceof PreviewEmptyResponseError) return true

  const msg    = errMessage(err).toLowerCase()
  const status = extractStatus(err)

  if (status !== null) {
    return status === 429 || status >= 500
  }
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

function log(event: string, data: Record<string, unknown>): void {
  console.log(`[ai:preview] ${JSON.stringify({ event, ...data })}`)
}
