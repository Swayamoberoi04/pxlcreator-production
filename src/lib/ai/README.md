# PXL Creator — AI Vision Layer

Phase 2 status: **Gemini Vision is the active production provider.**
Phase 3 status: **Preset Intelligence Engine live** — see the Phase 3 section at the bottom.

```
                        ┌──────────────────────────────┐
  /api/studio/process ─►│                              │
  /api/ai/analyze     ─►│  analyzeImage()  (analyze.ts)│
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │ getActiveProvider()          │   env-driven registry
                        │ (provider.ts)                │   GEMINI_API_KEY → gemini
                        └──────┬───────────────┬───────┘   AI_PROVIDER=stub → stub
                               │               │
                  ┌────────────▼───┐   ┌───────▼────────┐
                  │ GeminiProvider │   │  StubProvider  │  ◄─ automatic fallback
                  │ (gemini.ts)    │   │  (stub.ts)     │     on provider outage
                  └────────┬───────┘   └────────────────┘
                           │
        ┌──────────────────┼──────────────────────┐
        │                  │                      │
┌───────▼────────┐ ┌───────▼────────┐  ┌──────────▼─────────┐
│ gemini-prompt  │ │ gemini-schema  │  │ Sharp preprocessing│
│ system prompt +│ │ JSON schema +  │  │ EXIF rotate, ≤768px│
│ profile catalog│ │ Zod + clamping │  │ JPEG q80 → 1 tile  │
└────────────────┘ └────────────────┘  └────────────────────┘
```

## Files

| File | Responsibility |
|---|---|
| `provider.ts` | `AIProvider` interface + env-driven singleton registry |
| `analyze.ts` | Orchestration between API routes and the active provider (unchanged since Phase 1) |
| `providers/gemini.ts` | Production provider: preprocessing, transport, retries, timeout, merging, fallback, telemetry |
| `providers/gemini-prompt.ts` | System instruction + per-request prompt; StyleProfile vocabulary injection |
| `providers/gemini-schema.ts` | Request-time JSON schema (constrained decoding) + response-time Zod validation + numeric clamping |
| `providers/stub.ts` | Phase 1 provider, retained as the graceful-degradation path |

## Environment variables (server-side only)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | yes (for Gemini) | — | From https://aistudio.google.com/apikey. Never `NEXT_PUBLIC_`. |
| `GEMINI_MODEL` | no | `gemini-3.5-flash` | Set `gemini-3.1-flash-lite` to cut cost ~4× |
| `AI_PROVIDER` | no | — | `stub` forces the stub provider (dev/CI) |

## Data flow per request

1. **Profile match (deterministic)** — `matchStyleProfile(prompt, aesthetics)` picks one of the 12
   StyleProfiles from the user's own words. If the user pre-selected a profile it is locked.
2. **Preprocess** — Sharp: EXIF-rotate, resize longest edge to 768px, JPEG q80.
   A ≤768×768 image is exactly **one Gemini tile = 258 input tokens**, regardless of original size.
3. **Model call** — Interactions API (`ai.interactions.create`) with:
   - `system_instruction`: grounding rules (no hallucinated metadata, "unknown" when not visible)
   - `response_format.schema`: constrained decoding — output *cannot* deviate from the schema
   - `generation_config`: temperature 0.2, `thinking_level: "low"`, max 2048 output tokens
   - `store: false`: Google does not retain the interaction
4. **Validate** — Zod parses the JSON; every enum has a `.catch()` fallback, every number is clamped.
   One bad field degrades to a default; it never rejects the whole analysis.
5. **Merge** — final adjustments = `profile.defaultAdjustments` + Gemini's bounded corrective deltas
   (`exposureDelta` ±0.12, `contrastDelta` ±0.10, `saturationDelta` ±0.15, `warmthDelta` ±8),
   clamped again against absolute rails. The profile is the grade; Gemini adapts it to the image.
6. **Compose** — `ImageAnalysisResult`, with `composition.orientation/aspectRatio` computed from
   real Sharp dimensions (never asked of the model) and palette/grade-name from the profile.

## Failure handling

| Failure | Behaviour |
|---|---|
| 429 / 5xx / network / timeout (25s) | Retry, max 2, exponential backoff 600ms→1200ms + jitter |
| Unparseable / schema-invalid JSON | Retried once (treated as a generation glitch) |
| 4xx client error (bad key, blocked) | No retry — fail fast |
| All retries exhausted | **Graceful degradation to StubProvider.** The edit still succeeds; the result honestly reports `providerId: "stub"` |
| `GEMINI_API_KEY` missing | StubProvider selected at startup with a logged warning |

## Observability

All logs are single-line JSON prefixed `[ai:gemini]` / `[ai:provider]` for log aggregators.

- `provider_selected` / `provider_fallback` — startup decision
- `analysis_ok` — analysisId, profile + how it was chosen (`user` / `text-match` / `gemini`),
  confidence, attempts, preprocessMs, providerLatencyMs, totalMs, imageBytesSent, input/output/thought tokens
- `retrying` — attempt, backoffMs, reason
- `analysis_failed_final` / `fallback_to_stub` — error detail before degradation

## Cost model (per analysed image)

Input: 258 image tokens + ~800 prompt tokens ≈ 1,050. Output: ~450 tokens + low thinking.

| Model | Approx. cost / image | Notes |
|---|---|---|
| `gemini-3.5-flash` (default) | ~$0.0005–0.001 | Best accuracy; recommended |
| `gemini-3.1-flash-lite` | ~$0.0001–0.0003 | ~4× cheaper, slightly weaker on nuanced mood/lighting |

At the current rate limit (10 analyses/hour/IP) cost is negligible; 10,000 images ≈ $5–10 on the default model.

## Adding another vendor (e.g. OpenAI Vision)

1. Create `providers/openai.ts` implementing `AIProvider` (mirror `gemini.ts` structure).
2. Add one branch in `getActiveProvider()` keyed on `OPENAI_API_KEY` / `AI_PROVIDER=openai`.
3. Nothing else changes — routes, UI, types, recommendation engine are provider-agnostic.

## Testing

```powershell
# Pipeline test with a real photo (requires GEMINI_API_KEY in .env.local):
npx tsx scripts/test-gemini-provider.ts path\to\photo.jpg "warm cinematic golden hour"

# Synthetic smoke test across scene categories (no photo needed):
npx tsx scripts/test-gemini-provider.ts --synthetic
```

---

# Phase 3 — Preset Intelligence Engine

The AI layer that understands every preset in the catalogue and matches
Gemini image analyses against it with weighted similarity — replacing
pure keyword intersection.

```
 ImageAnalysisResult (from Gemini / stub)
          |
          v
 POST /api/ai/recommendations-v2          <150ms, no model call
          |
          v
 +--------------------------+     +----------------------------------+
 | Knowledge Base (cached)  |<----| Metadata Generator               |
 | Map<slug, Intelligence>  |     | preset text corpus -> evidence   |
 | keyed by catalog version |     | rules -> 35+ derived attributes  |
 +------------+-------------+     +----------------------------------+
              |
              v
 +--------------------------+
 | Scoring Engine           |  14 weighted dimensions:
 | rankPresets()            |  lighting, colorPalette (hex distance),
 +------------+-------------+  scene, mood, composition, exposure,
              |                style, subject, whiteBalance,
              v                dominantColors, contrast, saturation,
 Top 5 + confidence + reasons  tone, keywords
 + chips + dimension breakdown
```

## Files

| File | Responsibility |
|---|---|
| `src/types/preset-intelligence.ts` | PresetIntelligence, ScoringWeights, ScoredRecommendation, API response types |
| `src/lib/ai/preset-intelligence/metadata-generator.ts` | Evidence-rule derivation of 35+ attributes per preset. Nothing hardcoded per preset. |
| `src/lib/ai/preset-intelligence/knowledge-base.ts` | Cached KB (rebuilds only when catalogue changes) + lazy memoized similar/complementary relationships |
| `src/lib/ai/preset-intelligence/scoring.ts` | 14-dimension weighted similarity, reasons, chips. `rankPresets()` is the stable public entry point. |
| `src/app/api/ai/recommendations-v2/route.ts` | POST endpoint: imageAnalysis in, top-5 scored recommendations out |
| `src/components/studio/RecommendationsV2.tsx` | Studio UI: hero card (stars, match %, reason + attribute chips) + 4 runner-ups, skeletons, v1 fallback |

## Generated per preset (automatically, from its own catalogue data)

Identity, mood, style, aesthetic tags, Instagram tags, film inspiration,
lighting conditions, time of day, indoor/outdoor, seasons, skin-tone
compatibility, white balance lean, contrast level, saturation tendency,
exposure tendency, highlight recovery, shadow depth, black level,
dominant colours, hex palette, 9 genre affinity scores (cinematic,
portrait, landscape, street, travel, fashion, food, car, architecture),
recommended cameras and phones, difficulty, similar presets,
complementary presets, SEO tags, and a flat `embeddingText` descriptor.

## Performance / scalability (measured)

| Catalogue | KB build (once) | Ranking per request |
|---|---|---|
| 22 presets | <5ms | ~1ms |
| 5,000 presets | ~1.7s | ~117ms |

The KB is cached per catalogue signature; relationships are computed
lazily per preset and memoized. No architecture changes needed from
22 to 5,000 presets.

## Future: vector embeddings

`PresetIntelligence.embeddingText` is ready to be embedded. A vector
engine replaces the internals of `rankPresets()` (same signature), the
API and UI never change. For >5,000 presets add an ANN pre-filter in
front of the weighted scorer.

## Backward compatibility

- `/api/ai/recommendations` (v1) unchanged
- `recommendPreset()` keyword engine unchanged (still feeds `/api/studio/process`)
- `PresetRecommendCard` retained — the v2 UI degrades to it if the engine call fails

## Tests

```powershell
npx tsx scripts/test-preset-intelligence.ts
```
32 checks: metadata completeness, cache behaviour, 4 scoring scenarios,
relationships, determinism, latency at 22 and 5,000 presets.

---

# Phase 4C — AI Quality Assurance & Fidelity Engine

The validation layer that decides whether an AI-generated preview is
trustworthy enough to show. Active gate: `FidelityQAGate`
(`src/lib/ai/preview/qa/gate.ts`), selected by `getActiveQAGate()` in
`src/lib/ai/preview/qa.ts`. `QA_GATE=off` restores the Phase 4B
pass-through (operational escape hatch).

## Pipeline

```
 original ──┐
 AI preview ─┼─ extractFeatures (one decode each: metadata, 64x64 RGB
 Sharp ref ──┘   plane, 32x32 gray plane, dHash, DCT pHash)
      │
      ├─ similarity  hash bands + tonal no-op detection
      ├─ histogram   RGB/luminance intersection, luminance-shift ceiling
      ├─ metadata    aspect / orientation / relative resolution floor
      ├─ identity    8x8 block-structure + edge-map Pearson correlation
      ├─ fidelity    Sharp-reference histogram match + per-promise
      │              direction checks from Preset Intelligence
      └─ realism     clipping / posterization / hypersaturation /
                     edge-energy (oversharpening & noise)
      │
      ▼
 weighted composite (config weights, normalized)
      │
      ▼
 verdict:  hard fail ──────────────────────────→ FAIL
           composite < retryFloor ─────────────→ FAIL
           retry-capped reason OR < pass ──────→ RETRY
           otherwise ──────────────────────────→ PASS
```

## Decision & retry logic (job-service integration)

- PASS → store + cache + publish (`status: ready`)
- RETRY → `buildCorrectiveInstruction()` (qa/refinement.ts) appends
  deterministic corrective clauses mapped from machine-readable
  failure reasons — identity lock untouched, grade/lighting/mood only —
  then ONE regeneration and one more QA pass. PASS publishes; anything
  else degrades to the Sharp preview (`QA_REJECTED_AFTER_RETRY`).
- FAIL → degrade immediately (`QA_REJECTED`). The user always keeps the
  Sharp preview; QA can never make the studio worse.

Hard-fail reasons (unfixable by prompt): corrupt-file,
composition-replaced, aspect-changed, orientation-changed,
structure-diverged+edges-diverged.
Retry-capping reasons (never publish, always correctable):
edit-invisible, every wrong-direction fidelity reason, channel-collapsed,
luminance-shifted, and all realism artefacts.

## Scoring

Weighted composite over module scores (weights in qa/config.ts:
identity 0.30, similarity 0.25, fidelity 0.20, realism 0.15,
metadata 0.10; histogram folds in as a 0.85–1.0 multiplier).
Thresholds: pass >= 0.70, fail < 0.45, RETRY between. Every verdict is
stamped with `QA_CONFIG_VERSION` and persisted (preview_jobs.qa_verdict
jsonb, full report incl. per-module scores, raw metrics, failure
reasons) plus one provider_logs row per evaluation (`operation: "qa"`).

Key insight encoded in the similarity module: perceptual hashes are
grade-invariant BY DESIGN, so hash identity alone cannot detect a
provider no-op — "edit-invisible" additionally requires unchanged tonal
statistics (meanL / warmth / chroma deltas + luminance-histogram
intersection). Conversely, LOW hash distance with real tonal change is
the ideal outcome (identity preserved, grade applied).

## Fixture verdicts (scripts/test-qa-engine.ts — 24 checks, no AI calls)

| Fixture (Sharp-built from a real photo) | Verdict |
|---|---|
| The style profile's own grade via processImage | PASS (0.93) |
| Unchanged re-encode | RETRY (edit-invisible) |
| Cool desaturated grade vs warm preset | RETRY (wb-went-cool, palette-off-lean) |
| Center crop / 90-degree rotation | FAIL (geometry hard fail) |
| Different photograph (hashes fooled, sim=1!) | FAIL (identity hard fail) |
| Corrupt bytes | FAIL (corrupt-file) |

Measured: ~37ms per full evaluation including the Sharp reference
render (budget 500ms).

## Extension points (Phase 5)

- `FaceVerifier` (qa/identity.ts) → `gate.setFaceVerifier()` — face
  embedding identity checks
- `RealismReferee` (qa/realism.ts) → `gate.setRealismReferee()` — the
  blueprint §6.2 Gemini Vision referee
Both abstain today and are recorded in checks for telemetry.

---

# Phase 4D — Production Async Job System

Request lifecycle is fully separated from execution: the POST route
validates, persists the job + payload, and kicks a worker tick. Workers
claim jobs atomically and own retries, timeouts, recovery, and cleanup.
The external API is unchanged (status/cancel additions are additive).

## Job lifecycle (10 states over the UNCHANGED migration-020 schema)

```
                      VALIDATING (pre-persistence, POST route)
                          |
                          v
   QUEUED ──claim──> GENERATING ──> QA ──pass──> READY ──TTL──> EXPIRED
     ^  ^                |           |
     |  |   (worker/QA retry)        |fail
     |  └── RETRYING <───┴───────────┘
     |          |                        any failure path
     |          └─ attempts exhausted ─> DEGRADED (Sharp fallback)
     |                                       |resume
  resume <── CANCELLED (idempotent cancel)   |
     └───────────────────────────────────────┘
   FAILED = request-level failures before generation
```

Persisted mapping (schema untouched): RETRYING = queued+workerAttempts>0
or generating+qa_retries>0; CANCELLED = deleted+error_code CANCELLED
(the 'deleted' CHECK value was reserved unused by migration 020);
workerAttempts/failureCategory live as DATA inside the image_meta jsonb.
`src/lib/ai/preview/lifecycle.ts` holds the deterministic projection +
the explicit transition table; illegal transitions throw.

## Worker architecture (src/lib/ai/preview/worker.ts)

- enqueuePreviewJob(): payload -> payload-store (in-process LRU +
  durable pending/{jobId}.json in the private bucket) -> tick
- runWorkerTick(): recovery sweep -> claim loop (atomic
  transitionJob(queued->generating) conditional UPDATE = the job lock;
  racing instances get exactly one winner) -> bounded concurrency
  (maxConcurrent=2, maxJobsPerTick=5 per tick) -> opportunistic cleanup
- processClaimedJob(): watchdog(120s) around the untouched 4B/4C
  pipeline (runGenerationJob with finalizeFailures:false) -> outcome
  classified -> per-category retry policy
- Horizontal scaling = more claim competitors; nothing else changes.

## Retry strategy (worker-config.ts, w4d.1.0.0)

| Category | Max attempts | Backoff |
|---|---|---|
| provider (429/5xx) | 2 | 2s x2 exponential + jitter |
| timeout (watchdog/stall) | 2 | 1s x2 + jitter |
| network | 3 | 1.5s x2 + jitter |
| qa | 1 (owned by the 4C gate, inside the pipeline) | — |
| permanent (ENGINE_DISABLED, PRESET_NOT_FOUND, PAYLOAD_LOST) | 0 | — |

Between attempts the job returns to queued (lifecycle RETRYING) so any
instance may claim it after the backoff; exhaustion -> degraded (Sharp).

## Recovery + timeouts

- updated_at is the heartbeat. generating/qa jobs stale beyond 180s
  (hungAfterMs > watchdog 120s) are swept every tick: payload present ->
  re-queued; payload lost -> degraded TIMEOUT.
- Server restart: QUEUED/GENERATING/RETRYING jobs survive in Supabase;
  payloads survive in the bucket; the next tick re-claims them.
- Queued jobs nobody claims for 10 min -> expired QUEUE_TIMEOUT.

## Cleanup (cleanup.ts — config-driven, self-rate-limited to 1/5min)

TTL-expired previews -> expired + bucket asset deleted + inline data-URI
cleared; terminal rows purged after 30d; expired preview_cache rows
deleted; orphaned pending payloads swept. Callable with force=true from
a platform cron.

## Polling (adaptive)

Status endpoint returns retryAfterMs = clamp(elapsed/6, 1.2s, 5s), 0 on
terminal (stop). The slider consumes the hint; 30s client budget and
early termination unchanged. Cancellation: POST /api/ai/preview/cancel
{jobId, action: cancel|resume} — idempotent; in-flight workers discover
cancellation at their next atomic transition and abandon cleanly.

## Observability (existing schema only)

provider_logs gains operation "worker" rows: queueWaitMs, attempt,
outcome, failure category, worker latency, config version. preview_jobs
carries qa_retries, workerAttempts, failureCategory, total_ms.

## Measured (scripts/test-worker-system.ts — 41 checks)

10,000 queued jobs: seed 85ms, claim-batch selection 2.5ms, heap 21MB.
Live drill: real Gemini 429 -> worker retry (300ms backoff) -> second
429 -> retries exhausted -> degraded. Nothing mocked anywhere.
