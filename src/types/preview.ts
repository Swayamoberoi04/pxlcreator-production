/**
 * src/types/preview.ts
 *
 * Phase 4B — AI Preview Generation Engine type system.
 *
 * Implements the contracts from docs/AI_PREVIEW_ENGINE_BLUEPRINT.md:
 *   - PreviewProvider (provider abstraction — Gemini Flash Image today,
 *     FLUX Kontext or others later, without touching callers)
 *   - PreviewJob (the async job store shape, blueprint §11)
 *   - PreviewQAGate (Phase 4C extension point — interfaces only in 4B)
 *   - API response contracts (blueprint §12)
 */

/* ═══════════════════════════════════════════════════════════════
   PROVIDER ABSTRACTION
═══════════════════════════════════════════════════════════════ */

export type PreviewProviderId = "gemini-flash-image" | "flux-kontext" | "custom"

export interface PreviewGenerationRequest {
  /** Base64 image bytes, ≤1024px longest edge, no data-URI prefix */
  imageBase64: string
  mimeType:    "image/jpeg" | "image/png" | "image/webp"
  /** Complete edit instruction from the prompt builder (identity lock + grade brief) */
  instruction: string
}

export interface PreviewGenerationResult {
  /** Base64 image bytes of the generated preview, no data-URI prefix */
  imageBase64:       string
  mimeType:          string
  providerLatencyMs: number
  /** 1 = first try succeeded */
  attempts:          number
  usage: {
    inputTokens:  number | null
    outputTokens: number | null
  }
}

export interface PreviewProvider {
  readonly providerId:        PreviewProviderId
  readonly displayName:       string
  readonly isAvailable:       boolean
  /** Flat per-generation cost estimate used for telemetry + ledger */
  readonly costPerPreviewUsd: number

  generatePreview(request: PreviewGenerationRequest): Promise<PreviewGenerationResult>
}

/* ═══════════════════════════════════════════════════════════════
   JOB SYSTEM (blueprint §11 preview_jobs)
═══════════════════════════════════════════════════════════════ */

export type PreviewJobStatus =
  | "queued"
  | "generating"
  | "qa"
  | "ready"
  | "degraded"   // generation/QA failed — client keeps the Sharp preview
  | "failed"     // request-level failure before generation started
  | "expired"
  | "deleted"

export interface PreviewJob {
  id:             string
  createdAt:      string
  updatedAt:      string
  status:         PreviewJobStatus
  clientIpHash:   string
  imagePhash:     string
  imageMeta:      { width: number; height: number; format: string; bytes: number }
  presetSlug:     string
  styleProfileId: string
  promptVersion:  string
  provider:       PreviewProviderId | null
  providerMs:     number | null
  qa:             PreviewQAResult | null
  qaRetries:      number
  /** Storage key inside the private ai-previews bucket */
  previewPath:    string | null
  /** Inline fallback when storage upload is unavailable */
  previewDataUri: string | null
  expiresAt:      string | null
  errorCode:      string | null
  totalMs:        number | null
  costUsd:        number | null
}

/* ═══════════════════════════════════════════════════════════════
   QA GATE — Phase 4C extension point (interfaces only in 4B)
═══════════════════════════════════════════════════════════════ */

export interface PreviewQACheck {
  name:    string          // e.g. "phash-band", "dimensions", "vision-referee"
  passed:  boolean
  detail?: string
}

export interface PreviewQAResult {
  /** "pending" = Phase 4B pass-through — real gating lands in Phase 4C */
  verdict:       "pass" | "retry" | "fail" | "pending"
  checks:        PreviewQACheck[]
  realismScore:  number | null
  fidelityScore: number | null
}

export interface PreviewQAInput {
  originalBase64: string
  previewBase64:  string
  mimeType:       string
  instruction:    string
}

export interface PreviewQAGate {
  readonly gateId: string
  evaluate(input: PreviewQAInput): Promise<PreviewQAResult>
}

/* ═══════════════════════════════════════════════════════════════
   API CONTRACTS (blueprint §12)
═══════════════════════════════════════════════════════════════ */

/** POST /api/ai/preview — 202 job created, or 200 on cache hit */
export interface PreviewCreateResponse {
  success:     true
  jobId:       string | null      // null on cache hit (no job created)
  status:      PreviewJobStatus
  cached:      boolean
  etaSeconds:  number | null
  previewUrl:  string | null      // populated on cache hit
}

/** GET /api/ai/preview/status?jobId= */
export interface PreviewStatusResponse {
  success:    true
  jobId:      string
  status:     PreviewJobStatus
  previewUrl: string | null       // populated when status === "ready"
  provider:   PreviewProviderId | null
  elapsedMs:  number
  qa:         { verdict: PreviewQAResult["verdict"] } | null
  errorCode:  string | null
}

export interface PreviewErrorResponse {
  success: false
  error:   string
  code:
    | "RATE_LIMITED"
    | "ENGINE_DISABLED"
    | "INVALID_FILE"
    | "INVALID_ANALYSIS"
    | "PRESET_NOT_FOUND"
    | "JOB_NOT_FOUND"
    | "INTERNAL"
}
