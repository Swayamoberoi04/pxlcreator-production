/**
 * src/lib/ai/preset-intelligence/metadata-generator.ts
 *
 * Generates a PresetIntelligence entry from a Preset's own catalogue data.
 *
 * DESIGN RULE — nothing is hardcoded per preset. Every field is derived by
 * evidence-based rules applied to the preset's text corpus (name, tagline,
 * description, aiTags, idealLighting, bestUseCase, seoDescription, hook,
 * features) plus its structured fields (category, difficulty, cameras).
 * Add a new preset to the catalogue and it is understood automatically.
 *
 * The same rules scale from 22 to 5,000 presets — generation is O(1)
 * per preset over a fixed vocabulary.
 */

import type { Preset } from "@/types/product"
import type {
  PresetIntelligence,
  SceneAffinityScores,
  IntensityLevel,
  LevelTendency,
  SettingAffinity,
  SkinCompat,
  SeasonAffinity,
} from "@/types/preset-intelligence"
import type { ColorTemperature } from "@/types/ai"

export const ENGINE_VERSION = "3.0.0"

/* ═══════════════════════════════════════════════════════════════
   VOCABULARY TABLES — the engine's fixed knowledge
═══════════════════════════════════════════════════════════════ */

/** Colour vocabulary: name → { family for matching, hex for palette } */
const COLOR_VOCAB: Record<string, { family: string; hex: string }> = {
  orange:   { family: "orange", hex: "#E8853C" },
  amber:    { family: "orange", hex: "#D9962E" },
  gold:     { family: "orange", hex: "#FFD60A" },
  golden:   { family: "orange", hex: "#FFD60A" },
  yellow:   { family: "orange", hex: "#E3C44B" },
  warm:     { family: "orange", hex: "#D98E4A" },
  red:      { family: "red",    hex: "#C24B3A" },
  crimson:  { family: "red",    hex: "#A93226" },
  pink:     { family: "pink",   hex: "#D98BA6" },
  pastel:   { family: "pink",   hex: "#E8C4CE" },
  blush:    { family: "pink",   hex: "#E3B7B0" },
  magenta:  { family: "pink",   hex: "#B84D8B" },
  neon:     { family: "pink",   hex: "#D14BA8" },
  teal:     { family: "teal",   hex: "#2E7D7B" },
  cyan:     { family: "teal",   hex: "#3E9E9B" },
  aqua:     { family: "teal",   hex: "#4AA8A0" },
  blue:     { family: "blue",   hex: "#3B6EA8" },
  indigo:   { family: "blue",   hex: "#3F4D8C" },
  navy:     { family: "blue",   hex: "#2C3A63" },
  cool:     { family: "blue",   hex: "#5B7A9E" },
  green:    { family: "green",  hex: "#4B7A4E" },
  olive:    { family: "green",  hex: "#6B7A42" },
  emerald:  { family: "green",  hex: "#2F7D5B" },
  sage:     { family: "green",  hex: "#8CA080" },
  brown:    { family: "brown",  hex: "#6E4F35" },
  sepia:    { family: "brown",  hex: "#8A6A48" },
  bronze:   { family: "brown",  hex: "#8C6239" },
  cream:    { family: "cream",  hex: "#E8DCC4" },
  beige:    { family: "cream",  hex: "#D9CBB0" },
  ivory:    { family: "cream",  hex: "#EFE8D8" },
  white:    { family: "cream",  hex: "#EDEDED" },
  black:    { family: "black",  hex: "#141414" },
  charcoal: { family: "black",  hex: "#2B2B2B" },
  grey:     { family: "grey",   hex: "#8A8A8A" },
  gray:     { family: "grey",   hex: "#8A8A8A" },
  silver:   { family: "grey",   hex: "#B5B5B5" },
  slate:    { family: "grey",   hex: "#5F6B78" },
}

/** Mood evidence: term → canonical moods it implies */
const MOOD_VOCAB: Record<string, string[]> = {
  moody:      ["mysterious", "melancholic"],
  dark:       ["mysterious", "dramatic"],
  noir:       ["mysterious", "dramatic"],
  dramatic:   ["dramatic"],
  drama:      ["dramatic"],
  cinematic:  ["dramatic"],
  romantic:   ["romantic"],
  dreamy:     ["romantic", "serene"],
  soft:       ["serene"],
  calm:       ["peaceful"],
  peaceful:   ["peaceful"],
  serene:     ["serene"],
  airy:       ["serene"],
  clean:      ["serene"],
  vibrant:    ["energetic", "playful"],
  punchy:     ["energetic"],
  bold:       ["energetic"],
  electric:   ["energetic"],
  playful:    ["playful"],
  fun:        ["playful"],
  nostalgic:  ["nostalgic"],
  vintage:    ["nostalgic"],
  retro:      ["nostalgic"],
  film:       ["nostalgic"],
  timeless:   ["nostalgic"],
  luxurious:  ["luxurious"],
  luxury:     ["luxurious"],
  elegant:    ["luxurious"],
  premium:    ["luxurious"],
  raw:        ["raw"],
  gritty:     ["raw"],
  authentic:  ["raw"],
  eerie:      ["eerie"],
  mysterious: ["mysterious"],
  warm:       ["romantic"],
  golden:     ["romantic", "nostalgic"],
}

/** Lighting-condition evidence: pattern → lighting descriptors */
const LIGHTING_VOCAB: Array<{ pattern: RegExp; conditions: string[]; times: string[] }> = [
  { pattern: /golden hour|sunset|sunrise|magic hour/,  conditions: ["golden hour", "warm directional"], times: ["golden hour", "sunset", "sunrise"] },
  { pattern: /harsh (sun|light)|midday|direct sun/,    conditions: ["harsh sun", "harsh directional"],  times: ["midday"] },
  { pattern: /backlit|silhouette/,                     conditions: ["backlit"],                          times: [] },
  { pattern: /overcast|cloudy|diffused|soft light/,    conditions: ["soft diffused", "overcast"],        times: ["overcast"] },
  { pattern: /night|nocturnal|after dark|low light/,   conditions: ["low light", "artificial light"],    times: ["night"] },
  { pattern: /neon|city light|artificial/,             conditions: ["artificial light", "mixed"],        times: ["night"] },
  { pattern: /blue hour|dusk|twilight/,                conditions: ["blue hour"],                        times: ["blue hour", "dusk"] },
  { pattern: /studio|flash|strobe/,                    conditions: ["studio light"],                     times: [] },
  { pattern: /window light|indoor light/,              conditions: ["window light"],                     times: [] },
]

/** Scene affinity evidence: term → genre boosts */
const SCENE_VOCAB: Record<string, Partial<SceneAffinityScores>> = {
  cinematic:    { cinematic: 0.5 },
  film:         { cinematic: 0.35 },
  movie:        { cinematic: 0.4 },
  portrait:     { portrait: 0.5, fashion: 0.15 },
  skin:         { portrait: 0.4 },
  faces:        { portrait: 0.35 },
  beauty:       { portrait: 0.3, fashion: 0.3 },
  wedding:      { portrait: 0.35 },
  landscape:    { landscape: 0.5, travel: 0.2 },
  nature:       { landscape: 0.4 },
  mountain:     { landscape: 0.4, travel: 0.2 },
  forest:       { landscape: 0.4 },
  desert:       { landscape: 0.35, travel: 0.25 },
  beach:        { landscape: 0.3, travel: 0.35 },
  street:       { street: 0.5 },
  urban:        { street: 0.45, architecture: 0.2 },
  city:         { street: 0.4, architecture: 0.25 },
  grunge:       { street: 0.3 },
  travel:       { travel: 0.5 },
  wanderlust:   { travel: 0.4 },
  adventure:    { travel: 0.35, landscape: 0.15 },
  blogger:      { travel: 0.3, fashion: 0.2 },
  fashion:      { fashion: 0.5 },
  editorial:    { fashion: 0.35, portrait: 0.2 },
  model:        { fashion: 0.35, portrait: 0.25 },
  food:         { food: 0.55 },
  restaurant:   { food: 0.4 },
  culinary:     { food: 0.45 },
  car:          { car: 0.55 },
  automotive:   { car: 0.55 },
  vehicle:      { car: 0.4 },
  garage:       { car: 0.35 },
  architecture: { architecture: 0.55 },
  building:     { architecture: 0.4 },
  interior:     { architecture: 0.3 },
}

/** Category priors — the genre baseline before tag evidence */
const CATEGORY_PRIORS: Record<string, Partial<SceneAffinityScores>> = {
  "Cinematic":      { cinematic: 0.55, portrait: 0.2, street: 0.2, travel: 0.2 },
  "Film Emulation": { cinematic: 0.4, portrait: 0.3, street: 0.25, travel: 0.2 },
  "Portrait":       { portrait: 0.6, fashion: 0.3, cinematic: 0.15 },
  "Landscape":      { landscape: 0.6, travel: 0.4, cinematic: 0.15 },
  "Street":         { street: 0.6, architecture: 0.3, cinematic: 0.2 },
}

/** Film-stock / cinema inspiration: evidence → named inspiration */
const FILM_VOCAB: Array<{ pattern: RegExp; inspiration: string }> = [
  { pattern: /noir/,                     inspiration: "Classic film noir" },
  { pattern: /teal.*orange|orange.*teal|blockbuster/, inspiration: "Hollywood blockbuster grade" },
  { pattern: /kodak|portra/,             inspiration: "Kodak Portra 400" },
  { pattern: /fuji(film)?|velvia/,       inspiration: "Fujifilm Velvia" },
  { pattern: /kodachrome|vintage|retro/, inspiration: "Kodachrome era" },
  { pattern: /cyberpunk|neon/,           inspiration: "Blade Runner neon-noir" },
  { pattern: /anime|ghibli/,             inspiration: "Studio Ghibli palettes" },
  { pattern: /western|desert/,           inspiration: "Modern western cinema" },
  { pattern: /pastel|dreamy/,            inspiration: "Wes Anderson pastel symmetry" },
  { pattern: /film|analog|grain/,        inspiration: "35mm analog film" },
]

/** Instagram style hashtag derivation */
const INSTAGRAM_VOCAB: Array<{ pattern: RegExp; tags: string[] }> = [
  { pattern: /moody|dark|noir/,       tags: ["#moodygrams", "#darkaesthetic"] },
  { pattern: /golden|sunset|warm/,    tags: ["#goldenhour", "#warmtones"] },
  { pattern: /travel|wanderlust/,     tags: ["#travelgram", "#passionpassport"] },
  { pattern: /film|vintage|retro/,    tags: ["#filmisnotdead", "#vintagevibes"] },
  { pattern: /street|urban|city/,     tags: ["#streetphotography", "#urbanandstreet"] },
  { pattern: /portrait|skin|beauty/,  tags: ["#portraitmood", "#skintones"] },
  { pattern: /pastel|soft|dreamy/,    tags: ["#pastelaesthetic", "#softtones"] },
  { pattern: /landscape|nature/,      tags: ["#earthfocus", "#naturephotography"] },
  { pattern: /minimal|clean|airy/,    tags: ["#minimalmood", "#cleanaesthetic"] },
  { pattern: /neon|cyberpunk/,        tags: ["#neonnights", "#cyberpunkstyle"] },
]

const PHONE_RECOMMENDATIONS = [
  "iPhone 14 Pro or newer (ProRAW)",
  "Google Pixel 7 or newer (RAW)",
  "Samsung Galaxy S22+ (Expert RAW)",
]

/* ═══════════════════════════════════════════════════════════════
   GENERATOR
═══════════════════════════════════════════════════════════════ */

export function generatePresetIntelligence(preset: Preset): PresetIntelligence {
  /* One lowercase text corpus from every descriptive field the preset has */
  const corpus = [
    preset.name, preset.tagline, preset.description ?? "",
    (preset.aiTags ?? []).join(" "),
    preset.idealLighting ?? "", preset.bestUseCase ?? "",
    preset.seoDescription ?? "", preset.hook ?? "",
    (preset.features ?? []).join(" "),
  ].join(" ").toLowerCase()

  const tags = (preset.aiTags ?? []).map((t) => t.toLowerCase())

  /* ── Colours ── */
  const colorHits = Object.keys(COLOR_VOCAB).filter((c) => corpus.includes(c))

  /* Fallback for tonally-neutral presets (e.g. pure grain / muted looks):
     derive a colour identity from the grade's temperature lean so every
     entry can participate in colour matching. */
  if (colorHits.length === 0) {
    const warmLean = count(corpus, /warm|golden|amber|sunset/g)
    const coolLean = count(corpus, /cool|blue|teal|noir/g)
    colorHits.push(warmLean > coolLean ? "warm" : coolLean > warmLean ? "cool" : "grey")
  }

  const dominantColors = dedupe(colorHits.map((c) => c)).slice(0, 5)
  const colorPalette   = dedupe(colorHits.map((c) => COLOR_VOCAB[c].hex)).slice(0, 5)
  const colorFamilies  = dedupe(colorHits.map((c) => COLOR_VOCAB[c].family))

  /* ── Mood ── */
  const mood = dedupe(
    Object.entries(MOOD_VOCAB)
      .filter(([term]) => corpus.includes(term))
      .flatMap(([, moods]) => moods)
  ).slice(0, 4)

  /* ── Lighting + time of day ── */
  const lightingConditions: string[] = []
  const timeOfDay: string[] = []
  for (const { pattern, conditions, times } of LIGHTING_VOCAB) {
    if (pattern.test(corpus)) {
      lightingConditions.push(...conditions)
      timeOfDay.push(...times)
    }
  }

  /* ── White balance lean ── */
  const warmth = count(corpus, /warm|golden|amber|orange|sunset|sepia|honey/g)
  const chill  = count(corpus, /cool|blue|teal|cold|icy|winter|noir|cyan/g)
  const whiteBalance: ColorTemperature =
    warmth - chill >= 3 ? "very warm" :
    warmth > chill      ? "warm"      :
    chill - warmth >= 3 ? "very cool" :
    chill > warmth      ? "cool"      : "neutral"

  /* ── Contrast ── */
  const contrastHi = count(corpus, /high[- ]contrast|contrast|punchy|crush|dramatic|bold|deep/g)
  const contrastLo = count(corpus, /soft|flat|faded|low[- ]contrast|gentle|airy|matte/g)
  const contrastLevel: IntensityLevel =
    contrastHi - contrastLo >= 2 ? "high" :
    contrastLo - contrastHi >= 2 ? "low"  : "medium"

  /* ── Saturation ── */
  const satHi = count(corpus, /vibrant|saturated|rich|vivid|punchy|colorful|bold/g)
  const satLo = count(corpus, /muted|desaturated|faded|pastel|washed|soft|subtle|minimal/g)
  const saturationLevel: LevelTendency =
    satHi - satLo >= 2 ? "boosted" :
    satLo - satHi >= 2 ? "reduced" : "neutral"

  /* ── Exposure / highlights / shadows / blacks ── */
  const lifts   = count(corpus, /lift(ed)? shadows|bright|airy|light and|luminous|glow/g)
  const darkens = count(corpus, /dark|moody|crush|deep shadows|noir|underexpose/g)
  const exposureTendency: PresetIntelligence["exposureTendency"] =
    darkens - lifts >= 2 ? "darkens" :
    lifts - darkens >= 1 ? "lifts"   : "neutral"

  const highlightRecovery: IntensityLevel =
    /blown highlights|recover|highlight recovery|handle.*highlight|controlled highlight/.test(corpus)
      ? "high"
      : /highlight/.test(corpus) ? "medium" : "low"

  const shadowDepth: IntensityLevel =
    /crush|deep shadows|rich shadows|black crush/.test(corpus) ? "high" :
    /lift(ed)? shadows|open shadows|soft shadows/.test(corpus) ? "low"  : "medium"

  const blackLevel: PresetIntelligence["blackLevel"] =
    /crush(es|ed)? blacks|black crush|deep blacks/.test(corpus) ? "crushed" :
    /faded|matte|lifted blacks|washed/.test(corpus)             ? "lifted"  : "neutral"

  /* ── Setting ── */
  const indoor  = count(corpus, /indoor|interior|studio|restaurant|window light|room/g)
  const outdoor = count(corpus, /outdoor|landscape|street|travel|nature|beach|desert|mountain|city|sunset/g)
  const setting: SettingAffinity =
    indoor > 0 && outdoor > 0 ? "both" :
    indoor > outdoor          ? "indoor" :
    outdoor > 0               ? "outdoor" : "both"

  /* ── Season ── */
  const season = deriveSeasons(corpus)

  /* ── Skin compatibility ── */
  const skinPositive = count(corpus, /skin|portrait|faces|flattering|beauty|wedding/g)
  const heavyCast    = count(corpus, /neon|cyberpunk|extreme|heavy cast|monochrome|black and white/g)
  const skinToneCompat: SkinCompat =
    skinPositive >= 3 && heavyCast === 0 ? "excellent" :
    skinPositive >= 1 && heavyCast === 0 ? "good"      :
    heavyCast > skinPositive             ? "not-recommended" : "neutral"

  /* ── Scene affinity scores ── */
  const sceneScores = deriveSceneScores(preset.category, corpus)

  /* ── Style / aesthetics ── */
  const style = dedupe(tags.filter((t) =>
    /cinematic|noir|film|vintage|retro|minimal|editorial|moody|pastel|clean|grunge|luxury|anime|cyberpunk/.test(t)
  ))
  const aestheticTags = dedupe([...tags, ...mood]).slice(0, 16)

  /* ── Named inspirations + Instagram tags ── */
  const filmInspiration = dedupe(
    FILM_VOCAB.filter(({ pattern }) => pattern.test(corpus)).map(({ inspiration }) => inspiration)
  ).slice(0, 3)

  const instagramTags = dedupe(
    INSTAGRAM_VOCAB.filter(({ pattern }) => pattern.test(corpus)).flatMap(({ tags: t }) => t)
  ).slice(0, 6)

  /* ── Cameras / phones ── */
  const recommendedCameras = preset.cameraTypes ?? []
  const phoneFriendly =
    (preset.compatibility ?? []).some((c) => /mobile|cc/i.test(c)) ||
    (preset.includedFiles ?? []).some((f) => /dng|mobile/i.test(f))
  const recommendedPhones = phoneFriendly ? PHONE_RECOMMENDATIONS : []

  /* ── SEO tags ── */
  const seoTags = dedupe([
    ...tags,
    preset.category.toLowerCase(),
    ...mood,
    ...dominantColors,
    ...timeOfDay,
  ]).slice(0, 20)

  /* ── Embedding text — one flat descriptor paragraph ── */
  const embeddingText = [
    `${preset.name}: ${preset.tagline}.`,
    `Category ${preset.category}.`,
    `Mood: ${mood.join(", ") || "balanced"}.`,
    `Lighting: ${lightingConditions.join(", ") || "flexible"}.`,
    `Time of day: ${timeOfDay.join(", ") || "any"}.`,
    `Colors: ${dominantColors.join(", ") || "natural"}.`,
    `White balance ${whiteBalance}, contrast ${contrastLevel}, saturation ${saturationLevel}, blacks ${blackLevel}.`,
    `Best for: ${preset.bestUseCase ?? preset.category}.`,
    `Tags: ${tags.join(", ")}.`,
  ].join(" ")

  return {
    presetId: preset.id,
    slug:     preset.slug,
    name:     preset.name,
    category: preset.category,

    mood, style, aestheticTags, instagramTags, filmInspiration,
    lightingConditions: dedupe(lightingConditions),
    timeOfDay:          dedupe(timeOfDay),
    setting, season, skinToneCompat,

    whiteBalance, contrastLevel, saturationLevel,
    exposureTendency, highlightRecovery, shadowDepth, blackLevel,

    dominantColors: dedupe([...dominantColors, ...colorFamilies]).slice(0, 6),
    colorPalette,
    sceneScores,

    recommendedCameras, recommendedPhones,
    difficulty: preset.difficultyLevel ?? "Beginner",

    /* Relationships are computed lazily by the knowledge base */
    similarPresets:       [],
    complementaryPresets: [],

    seoTags,
    embeddingText,
    generatedAt: new Date().toISOString(),
  }
}

/* ═══════════════════════════════════════════════════════════════
   Derivation helpers
═══════════════════════════════════════════════════════════════ */

function deriveSceneScores(category: string, corpus: string): SceneAffinityScores {
  const scores: SceneAffinityScores = {
    cinematic: 0.1, portrait: 0.1, landscape: 0.1, street: 0.1,
    travel: 0.1, fashion: 0.05, food: 0.05, car: 0.05, architecture: 0.05,
  }

  /* Category prior */
  const prior = CATEGORY_PRIORS[category] ?? {}
  for (const [genre, boost] of Object.entries(prior)) {
    scores[genre as keyof SceneAffinityScores] += boost
  }

  /* Tag / text evidence */
  for (const [term, boosts] of Object.entries(SCENE_VOCAB)) {
    if (!corpus.includes(term)) continue
    for (const [genre, boost] of Object.entries(boosts)) {
      scores[genre as keyof SceneAffinityScores] += boost
    }
  }

  /* Clamp to 0–1 */
  for (const genre of Object.keys(scores) as Array<keyof SceneAffinityScores>) {
    scores[genre] = Math.min(Math.round(scores[genre] * 100) / 100, 1)
  }
  return scores
}

function deriveSeasons(corpus: string): SeasonAffinity[] {
  const seasons: SeasonAffinity[] = []
  if (/autumn|fall|golden|amber|harvest|warm/.test(corpus))  seasons.push("autumn")
  if (/summer|beach|tropical|sunny|vibrant/.test(corpus))    seasons.push("summer")
  if (/winter|snow|icy|cold|cool blue/.test(corpus))         seasons.push("winter")
  if (/spring|pastel|bloom|fresh|soft green/.test(corpus))   seasons.push("spring")
  return seasons.length > 0 ? seasons.slice(0, 2) : ["all-season"]
}

function count(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}
