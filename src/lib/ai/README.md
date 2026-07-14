# PXL Creator — AI Vision Layer

Phase 2 status: **Gemini Vision is the active production provider.**

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
