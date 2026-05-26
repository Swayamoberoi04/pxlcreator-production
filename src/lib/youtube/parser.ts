/**
 * src/lib/youtube/parser.ts
 *
 * Intelligent metadata parser for YouTube video data.
 *
 * Given a video title + description, this module:
 *  1. Extracts download links (Payhip, Gumroad, Drive, etc.)
 *  2. Classifies the preset category (Cinematic, Film Emulation, etc.)
 *  3. Detects mood and tone keywords
 *  4. Extracts clean preset name
 *  5. Generates a URL slug
 *  6. Builds ai_tags array for search
 */

import type { YouTubeVideoData } from "./api"
import type { PresetCategory }   from "@/types/product"

/* ── Types ──────────────────────────────────────────────── */

export interface ParsedPresetData {
  title:          string           // cleaned preset name
  slug:           string           // url-safe slug
  tagline:        string           // short description
  category:       PresetCategory   // classified category
  categorySlug:   string           // category slug (for DB lookup)
  mood:           string | null    // e.g. "Warm", "Moody"
  tone:           string | null    // e.g. "Gold", "Teal-Orange"
  downloadUrl:    string | null    // first download link found
  allLinks:       string[]         // all links found
  aiTags:         string[]         // keywords for search
  thumbnailUrl:   string           // YouTube thumbnail
  youtubeVideoId: string
  youtubeUrl:     string
  description:    string           // cleaned description for detail page
  features:       string[]         // extracted feature bullets
  presetType:     string           // 'lightroom' | 'capture_one' | 'dng'
}

/* ── Category keyword map ───────────────────────────────── */

const CATEGORY_KEYWORDS: Record<PresetCategory, string[]> = {
  "Bundle": [
    "bundle", "pack", "mega pack", "complete", "collection",
    "all in one", "combo", "ultimate pack", "full pack",
  ],
  "Film Emulation": [
    "kodak", "fuji", "fujifilm", "ilford", "film", "analog", "analogue",
    "35mm", "grain", "portra", "ektar", "kodak gold", "film stock",
    "film emulation", "film simulation", "agfa", "velvia", "provia",
    "kodak 400h", "kodak ultra max",
  ],
  "Cinematic": [
    "cinematic", "cinema", "hollywood", "film look", "dramatic",
    "movie tone", "teal orange", "teal and orange", "blockbuster",
    "dark cinematic", "cine", "letterbox",
  ],
  "Portrait": [
    "portrait", "skin", "face", "beauty", "wedding", "headshot",
    "people", "person", "skin tone", "soft skin", "natural skin",
    "boudoir",
  ],
  "Landscape": [
    "landscape", "nature", "outdoor", "sunset", "sunrise",
    "golden hour", "forest", "mountain", "sky", "travel",
    "seascape", "waterfall", "desert", "field", "aerial",
  ],
  "Street": [
    "street", "urban", "city", "gritty", "architecture",
    "documentary", "noir", "black and white", "black & white",
    "monochrome", "editorial", "reportage", "travel street",
  ],
}

/* ── Mood keyword map ───────────────────────────────────── */

const MOOD_KEYWORDS: Record<string, string[]> = {
  "Moody":   ["moody", "dark", "dramatic", "noir", "shadow", "brooding"],
  "Warm":    ["warm", "golden", "amber", "sunset", "cozy", "honey", "bronze", "sun"],
  "Cool":    ["cool", "cold", "blue", "arctic", "icy", "winter", "crisp"],
  "Vintage": ["vintage", "retro", "old", "classic", "nostalgic", "faded"],
  "Clean":   ["clean", "bright", "airy", "light", "minimal", "fresh"],
  "Earthy":  ["earthy", "brown", "beige", "cafe", "autumn", "fall", "terracotta"],
  "Pastel":  ["pastel", "soft", "haze", "muted", "faded", "dreamy"],
  "Vivid":   ["vivid", "vibrant", "bold", "saturated", "pop", "neon"],
}

/* ── Tone keyword map ───────────────────────────────────── */

const TONE_KEYWORDS: Record<string, string[]> = {
  "Gold":          ["gold", "golden", "amber", "honey", "desert"],
  "Teal-Orange":   ["teal orange", "teal and orange", "teal-orange"],
  "B&W":           ["black and white", "black & white", "monochrome", "b&w", "bw"],
  "Green":         ["green", "forest", "jungle", "nature"],
  "Blue":          ["blue", "arctic", "cool", "ocean", "steel"],
  "Film":          ["film", "kodak", "fuji", "grain"],
  "Bronze":        ["bronze", "copper", "rust", "terracotta"],
  "Lavender":      ["lavender", "purple", "violet", "lilac"],
}

/* ── Download link patterns ─────────────────────────────── */

const DOWNLOAD_PATTERNS = [
  /https?:\/\/payhip\.com\/[^\s\)\]\>\"\']+/gi,
  /https?:\/\/gumroad\.com\/[^\s\)\]\>\"\']+/gi,
  /https?:\/\/gum\.co\/[^\s\)\]\>\"\']+/gi,
  /https?:\/\/drive\.google\.com\/[^\s\)\]\>\"\']+/gi,
  /https?:\/\/bit\.ly\/[^\s\)\]\>\"\']+/gi,
  /https?:\/\/tinyurl\.com\/[^\s\)\]\>\"\']+/gi,
  /https?:\/\/linktr\.ee\/[^\s\)\]\>\"\']+/gi,
  /https?:\/\/stan\.store\/[^\s\)\]\>\"\']+/gi,
]

/* ── Preset name cleanup patterns ───────────────────────── */

// Phrases to strip from video titles to get a clean preset name
const TITLE_STRIP_PATTERNS = [
  /\s*[-|–—]\s*free\s+download/gi,
  /\s*[-|–—]\s*lightroom\s+preset/gi,
  /\s*lightroom\s+(mobile\s+)?preset/gi,
  /\s*\(free\)/gi,
  /\s*\[free\]/gi,
  /\s*free\s+preset/gi,
  /\s*preset\s+tutorial/gi,
  /\s*how\s+to\s+edit\s+like\s+/gi,
  /\s*editing\s+tutorial/gi,
  /\s*color\s+grade/gi,
  /\s*\|\s*pxl\s+creator/gi,
  /\s*-\s*pxl\s+creator/gi,
  /\s*\|\s*[a-z\s]+channel/gi,
]

/* ── Utility: slugify ───────────────────────────────────── */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/* ── Category classifier ────────────────────────────────── */

function classifyCategory(title: string, description: string, tags: string[]): PresetCategory {
  const searchText = `${title} ${description} ${tags.join(" ")}`.toLowerCase()

  const scores: Record<PresetCategory, number> = {
    "Bundle":         0,
    "Film Emulation": 0,
    "Cinematic":      0,
    "Portrait":       0,
    "Landscape":      0,
    "Street":         0,
  }

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        // Title matches score higher than description
        const titleBonus = title.toLowerCase().includes(keyword.toLowerCase()) ? 2 : 0
        scores[category as PresetCategory] += 1 + titleBonus
      }
    }
  }

  // Find highest score
  const sorted = (Object.entries(scores) as [PresetCategory, number][])
    .sort((a, b) => b[1] - a[1])

  // Default to "Cinematic" if no strong match
  return sorted[0][1] > 0 ? sorted[0][0] : "Cinematic"
}

/* ── Mood detector ──────────────────────────────────────── */

function detectMood(title: string, description: string): string | null {
  const text = `${title} ${description}`.toLowerCase()

  const scores: Record<string, number> = {}
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    scores[mood] = 0
    for (const kw of keywords) {
      if (text.includes(kw)) scores[mood]++
    }
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])
  return best[0][1] > 0 ? best[0][0] : null
}

/* ── Tone detector ──────────────────────────────────────── */

function detectTone(title: string, description: string): string | null {
  const text = `${title} ${description}`.toLowerCase()

  const scores: Record<string, number> = {}
  for (const [tone, keywords] of Object.entries(TONE_KEYWORDS)) {
    scores[tone] = 0
    for (const kw of keywords) {
      if (text.includes(kw)) scores[tone]++
    }
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])
  return best[0][1] > 0 ? best[0][0] : null
}

/* ── Link extractor ─────────────────────────────────────── */

function extractLinks(description: string): string[] {
  const found: string[] = []
  for (const pattern of DOWNLOAD_PATTERNS) {
    const matches = description.matchAll(pattern)
    for (const match of matches) {
      const link = match[0].replace(/[.,;!?]+$/, "") // trim trailing punctuation
      if (!found.includes(link)) found.push(link)
    }
  }
  return found
}

/* ── Title cleaner ──────────────────────────────────────── */

function cleanTitle(rawTitle: string): string {
  let title = rawTitle
  for (const pattern of TITLE_STRIP_PATTERNS) {
    title = title.replace(pattern, "")
  }
  // Title-case the result
  return title
    .trim()
    .replace(/\s+/g, " ")
}

/* ── AI tags builder ────────────────────────────────────── */

function buildAiTags(
  title: string,
  description: string,
  ytTags: string[],
  category: PresetCategory,
  mood: string | null,
  tone: string | null
): string[] {
  const tags = new Set<string>()

  // Add category keywords
  for (const kw of CATEGORY_KEYWORDS[category]) {
    tags.add(kw.toLowerCase())
  }

  // Add mood/tone
  if (mood) tags.add(mood.toLowerCase())
  if (tone) tags.add(tone.toLowerCase())

  // Add YT tags (clean them)
  for (const t of ytTags) {
    const cleaned = t.toLowerCase().trim()
    if (cleaned.length > 2 && cleaned.length < 30) tags.add(cleaned)
  }

  // Extract meaningful words from title
  const titleWords = title.toLowerCase().split(/\s+/)
  const stopWords = new Set(["the", "a", "an", "and", "or", "but", "for", "with", "from", "to", "of", "in", "on", "at", "by", "as"])
  for (const word of titleWords) {
    if (word.length > 3 && !stopWords.has(word)) tags.add(word)
  }

  return Array.from(tags).slice(0, 20) // cap at 20 tags
}

/* ── Description → feature bullets ─────────────────────── */

function extractFeatures(description: string): string[] {
  const features: string[] = []

  // Look for lines starting with bullet characters
  const lines = description.split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (
      (trimmed.startsWith("•") ||
       trimmed.startsWith("-") ||
       trimmed.startsWith("✓") ||
       trimmed.startsWith("✔") ||
       trimmed.startsWith("▸") ||
       /^\d+\.\s/.test(trimmed))
      && trimmed.length > 5
      && trimmed.length < 120
    ) {
      features.push(trimmed.replace(/^[•\-✓✔▸\d\.]\s*/, "").trim())
    }
  }

  return features.slice(0, 8) // max 8 features
}

/* ── Clean description for detail page ──────────────────── */

function cleanDescription(raw: string): string {
  // Remove links, strip excessive newlines, limit to ~400 chars
  return raw
    .replace(/https?:\/\/\S+/g, "")   // remove URLs
    .replace(/\n{3,}/g, "\n\n")        // max 2 consecutive newlines
    .trim()
    .slice(0, 400)
}

/* ── Detect preset type ──────────────────────────────────── */

function detectPresetType(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase()
  if (text.includes("capture one") || text.includes("captureone")) return "capture_one"
  if (text.includes(".dng") || text.includes("dng preset")) return "dng"
  return "lightroom"
}

/* ── Main parse function ────────────────────────────────── */

/**
 * Parses YouTube video data into a structured preset entry.
 * Returns all the fields needed to pre-fill the admin import form.
 */
export function parseYouTubePreset(video: YouTubeVideoData): ParsedPresetData {
  const cleanedTitle = cleanTitle(video.title)
  const category     = classifyCategory(video.title, video.description, video.tags)
  const mood         = detectMood(video.title, video.description)
  const tone         = detectTone(video.title, video.description)
  const allLinks     = extractLinks(video.description)
  const features     = extractFeatures(video.description)
  const aiTags       = buildAiTags(video.title, video.description, video.tags, category, mood, tone)

  const categorySlugMap: Record<PresetCategory, string> = {
    "Bundle":         "bundle",
    "Film Emulation": "film-emulation",
    "Cinematic":      "cinematic",
    "Portrait":       "portrait",
    "Landscape":      "landscape",
    "Street":         "street",
  }

  return {
    title:          cleanedTitle,
    slug:           slugify(cleanedTitle),
    tagline:        cleanedTitle,          // admin will refine this
    category,
    categorySlug:   categorySlugMap[category],
    mood,
    tone,
    downloadUrl:    allLinks[0] ?? null,
    allLinks,
    aiTags,
    thumbnailUrl:   video.thumbnail,
    youtubeVideoId: video.videoId,
    youtubeUrl:     `https://www.youtube.com/watch?v=${video.videoId}`,
    description:    cleanDescription(video.description),
    features,
    presetType:     detectPresetType(video.title, video.description),
  }
}
