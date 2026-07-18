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
  imageMeta:      {
    width: number; height: number; format: string; bytes: number
    /** Phase 4D: worker-level pipeline attempts (jsonb data, not schema) */
    workerAttempts?: number
    /** Phase 4D: last failure category driving the retry policy */
    failureCategory?: string
  }
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
  name:    string          // e.g. "similarity-dhash-band", "identity-edge-stability"
  passed:  boolean
  detail?: string
}

export interface PreviewQAResult {
  /** "pending" was the Phase 4B pass-through; the Phase 4C FidelityQAGate
      returns pass / retry / fail */
  verdict:       "pass" | "retry" | "fail" | "pending"
  checks:        PreviewQACheck[]
  realismScore:  number | null
  fidelityScore: number | null

  /* ── Phase 4C composite report (optional: additive, so 4B-era
        persisted verdicts remain type-valid) ── */
  overallScore?:    number
  similarityScore?: number | null
  identityScore?:   number | null
  metadataScore?:   number | null
  histogramScore?:  number | null
  /** Machine-readable failure/weakness reasons — consumed by the
      Prompt Refinement engine and telemetry */
  failureReasons?:  string[]
  /** Raw metric values from every module (persisted in qa_verdict) */
  metrics?:         Record<string, number>
  /** QA_CONFIG_VERSION the verdict was produced under */
  configVersion?:   string
  evaluationMs?:    number
}

export interface PreviewQAInput {
  originalBase64: string
  previewBase64:  string
  mimeType:       string
  instruction:    string

  /* ── Phase 4C context (optional: the gate degrades gracefully
        when absent) ── */
  /** Knowledge-base entry for the recommended preset — drives the
      fidelity direction checks */
  presetIntel?: import("@/types/preset-intelligence").PresetIntelligence
  /** Sharp adjustments of the target grade — the gate renders a
      deterministic reference via processImage for fidelity comparison */
  referenceAdjustments?: import("@/types/ai").AIAdjustments
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

  /* ── Phase 4D (additive) ── */
  /** Full lifecycle state (QUEUED/VALIDATING/GENERATING/QA/RETRYING/
      READY/FAILED/DEGRADED/CANCELLED/EXPIRED) */
  lifecycle?:    string
  /** Adaptive-polling hint: suggested delay before the next poll;
      0 = terminal, stop polling */
  retryAfterMs?: number
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
