/**
 * src/lib/ai/analyze.ts
 *
 * Sends the image + prompt to OpenAI GPT-4o Vision and returns
 * a structured AIAnalysis with numeric color-grading parameters.
 *
 * Called exclusively from the API route — never imported by client code.
 * OPENAI_API_KEY is read from process.env at call time (server-only).
 */

import OpenAI from "openai"
import sharp from "sharp"
import type { AIAnalysis, ImageAdjustments } from "@/types/studio"

/* ─────────────────────────────────────────────────────────────
   OpenAI client
   Lazy-initialised so the module can be imported without
   OPENAI_API_KEY being set (e.g. during static build passes).
───────────────────────────────────────────────────────────── */
let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set in environment variables.")
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

/* ─────────────────────────────────────────────────────────────
   System prompt
   Tightly constrains the output schema and value ranges.
   The "ONLY return JSON" instruction is critical — GPT-4o
   sometimes wraps JSON in markdown fences without it.
───────────────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `
You are an expert cinematographer and colorist with 20 years of experience
in film color grading for major motion pictures and commercial photography.

Analyze the provided image and the user's requested aesthetic.
Return ONLY a valid JSON object — no markdown, no code fences, no explanation.

Required schema (all fields mandatory):
{
  "mood": "<2–4 words, e.g. 'Warm Cinematic' or 'Cool Noir'>",
  "description": "<1–2 sentences describing the applied look and how it enhances the image>",
  "adjustments": {
    "brightness":  <number, 0.75–1.30, where 1.0 = unchanged>,
    "contrast":    <number, 0.80–1.45, where 1.0 = unchanged>,
    "saturation":  <number, 0.50–1.60, where 1.0 = unchanged>,
    "hue":         <number, -40 to 40, degrees of hue rotation, 0 = unchanged>,
    "gamma":       <number, 0.75–1.35, where 1.0 = unchanged>,
    "tintR":       <number, -20 to 20, red channel offset, 0 = unchanged>,
    "tintG":       <number, -20 to 20, green channel offset, 0 = unchanged>,
    "tintB":       <number, -20 to 20, blue channel offset, 0 = unchanged>
  },
  "presetKeywords": ["<word1>", "<word2>", "..."],
  "confidence": <number, 0.0–1.0>
}

Rules:
- Keep adjustments subtle and professional — heavy-handed processing looks amateur
- The goal is cinematic color grading, not extreme effects or filters
- Analyse the existing image tones before selecting adjustments
- presetKeywords: 5–8 single lowercase words describing the visual mood (e.g. "warm", "cinematic", "golden", "portrait")
- confidence: how well the resulting edit matches the requested aesthetic
`.trim()

/* ─────────────────────────────────────────────────────────────
   Main export
───────────────────────────────────────────────────────────── */

/**
 * Analyses an image buffer against a user prompt using GPT-4o Vision.
 *
 * @param buffer     - Raw image file buffer (any format Sharp supports)
 * @param prompt     - User's free-text aesthetic description
 * @param aesthetics - Array of quick-select vibe keywords (from UI chips)
 * @returns          - Validated AIAnalysis object ready to pass to processImage()
 */
export async function analyzeImage(
  buffer: Buffer,
  prompt: string,
  aesthetics: string[]
): Promise<AIAnalysis> {
  /* ── 1. Resize to 512px thumbnail for cost/speed efficiency ── */
  const thumbnail = await sharp(buffer)
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()

  const base64Image = thumbnail.toString("base64")

  /* ── 2. Build the user message ── */
  const userText = [
    `Requested aesthetic: ${prompt.trim()}`,
    aesthetics.length > 0
      ? `Additional style keywords: ${aesthetics.join(", ")}`
      : null,
    "Apply these as cinematic Lightroom-style adjustments.",
  ]
    .filter(Boolean)
    .join("\n")

  /* ── 3. Call GPT-4o Vision — wrapped so any API failure gracefully
           falls back to a prompt-informed cinematic grade ── */
  let response
  try {
    response = await getClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                /* "low" uses a fixed 85 tokens — significantly cheaper than "high" */
                detail: "low",
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
      temperature: 0.4, // Low temperature = consistent, professional outputs
    })
  } catch (err) {
    /* OpenAI unavailable / invalid key / quota exceeded — use smart fallback
       so the user still gets a processed image instead of an error screen. */
    console.error("[analyze] OpenAI call failed, using prompt-based fallback:", err)
    return buildPromptInformedFallback(prompt, aesthetics)
  }

  /* ── 4. Parse, validate, and return ── */
  const raw = response.choices[0]?.message?.content ?? "{}"

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch {
    /* If GPT-4o somehow returns non-JSON, fall back to neutral defaults */
    console.error("[analyze] Failed to parse OpenAI response:", raw)
    return buildPromptInformedFallback(prompt, aesthetics)
  }

  return validateAndNormalise(parsed)
}

/* ─────────────────────────────────────────────────────────────
   Validation
   Clamps all numeric values to their safe ranges so a
   hallucinated value of 5.0 doesn't destroy someone's image.
───────────────────────────────────────────────────────────── */

function clamp(value: number, min: number, max: number): number {
  const n = Number(value)
  if (!isFinite(n)) return (min + max) / 2
  return Math.min(Math.max(n, min), max)
}

function validateAndNormalise(raw: Record<string, unknown>): AIAnalysis {
  const rawAdj = (raw.adjustments ?? {}) as Partial<Record<keyof ImageAdjustments, unknown>>

  const adjustments: ImageAdjustments = {
    brightness: clamp(rawAdj.brightness as number ?? 1.0,  0.75, 1.30),
    contrast:   clamp(rawAdj.contrast   as number ?? 1.0,  0.80, 1.45),
    saturation: clamp(rawAdj.saturation as number ?? 1.0,  0.50, 1.60),
    hue:        clamp(rawAdj.hue        as number ?? 0,   -40,   40  ),
    gamma:      clamp(rawAdj.gamma      as number ?? 1.0,  0.75, 1.35),
    tintR:      clamp(rawAdj.tintR      as number ?? 0,   -20,   20  ),
    tintG:      clamp(rawAdj.tintG      as number ?? 0,   -20,   20  ),
    tintB:      clamp(rawAdj.tintB      as number ?? 0,   -20,   20  ),
  }

  const presetKeywords = Array.isArray(raw.presetKeywords)
    ? (raw.presetKeywords as unknown[])
        .map((k) => String(k).toLowerCase().trim())
        .filter(Boolean)
        .slice(0, 10)
    : []

  return {
    mood:           String(raw.mood        ?? "Cinematic"),
    description:    String(raw.description ?? "A refined cinematic grade has been applied."),
    adjustments,
    presetKeywords,
    confidence:     clamp(raw.confidence as number ?? 0.75, 0, 1),
  }
}

function buildFallbackAnalysis(): AIAnalysis {
  return {
    mood: "Cinematic",
    description: "A balanced cinematic grade has been applied to your image.",
    adjustments: {
      brightness: 1.02,
      contrast:   1.12,
      saturation: 0.90,
      hue:        0,
      gamma:      0.98,
      tintR:      4,
      tintG:      2,
      tintB:      -5,
    },
    presetKeywords: ["cinematic", "warm", "contrast", "rich"],
    confidence: 0.60,
  }
}

/**
 * Prompt-informed fallback — reads simple keywords from the user's prompt
 * and aesthetics list to pick a cinematic preset even without OpenAI.
 * Ensures the feature degrades gracefully: user still gets a processed image.
 */
function buildPromptInformedFallback(prompt: string, aesthetics: string[]): AIAnalysis {
  const combined = [prompt, ...aesthetics].join(" ").toLowerCase()

  /* Detect the dominant mood from common keywords */
  const isWarm    = /warm|golden|amber|sunset|orange|film|vintage|cozy|desert|summer/.test(combined)
  const isCool    = /cool|blue|teal|cold|winter|night|dark|moody|shadow|noir/.test(combined)
  const isVibrant = /vibrant|vivid|pop|bright|colourful|colorful|saturated|punchy/.test(combined)
  const isFilm    = /film|grain|analog|kodak|fuji|vintage|retro|faded/.test(combined)
  const isPortrait= /portrait|skin|face|soft|pastel|pink|editorial/.test(combined)

  if (isWarm) {
    return {
      mood: "Warm Cinematic",
      description: "A warm golden-hour cinematic grade has been applied, enhancing amber tones and reducing cool shadows.",
      adjustments: { brightness: 1.04, contrast: 1.15, saturation: 0.95, hue: 6, gamma: 0.97, tintR: 8, tintG: 3, tintB: -8 },
      presetKeywords: ["warm", "cinematic", "golden", "amber", "film"],
      confidence: 0.72,
    }
  }
  if (isCool) {
    return {
      mood: "Cool Noir",
      description: "A cool, desaturated cinematic grade has been applied with deep shadows and teal-blue midtones.",
      adjustments: { brightness: 0.97, contrast: 1.18, saturation: 0.80, hue: -8, gamma: 1.04, tintR: -5, tintG: 2, tintB: 10 },
      presetKeywords: ["cool", "cinematic", "moody", "teal", "noir"],
      confidence: 0.70,
    }
  }
  if (isVibrant) {
    return {
      mood: "Vivid Editorial",
      description: "A bold, vibrant editorial grade has been applied with enhanced saturation and contrast.",
      adjustments: { brightness: 1.06, contrast: 1.20, saturation: 1.30, hue: 0, gamma: 0.96, tintR: 2, tintG: 0, tintB: -2 },
      presetKeywords: ["vivid", "editorial", "vibrant", "bold", "saturated"],
      confidence: 0.68,
    }
  }
  if (isFilm) {
    return {
      mood: "Film Emulation",
      description: "A film emulation grade has been applied with lifted shadows, faded blacks, and warm highlights.",
      adjustments: { brightness: 1.03, contrast: 1.05, saturation: 0.82, hue: 4, gamma: 1.05, tintR: 6, tintG: 4, tintB: -3 },
      presetKeywords: ["film", "analog", "vintage", "grain", "faded"],
      confidence: 0.70,
    }
  }
  if (isPortrait) {
    return {
      mood: "Soft Portrait",
      description: "A soft, flattering portrait grade has been applied with lifted highlights and warm skin tones.",
      adjustments: { brightness: 1.06, contrast: 1.06, saturation: 0.92, hue: 2, gamma: 0.95, tintR: 6, tintG: 2, tintB: -4 },
      presetKeywords: ["portrait", "soft", "warm", "skin", "editorial"],
      confidence: 0.68,
    }
  }

  /* Default: balanced cinematic */
  return buildFallbackAnalysis()
}
