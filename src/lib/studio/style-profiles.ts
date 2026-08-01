/**
 * src/lib/studio/style-profiles.ts
 *
 * 12 cinematic style profiles — the aesthetic vocabulary of PXL Creator.
 *
 * Each profile is a complete specification of a visual grade:
 *   - Human-readable metadata (name, description, ideal scenes)
 *   - Sharp pipeline parameters (the actual color grade)
 *   - Analysis template (what the AI reports about this grade)
 *   - Keyword tags (for preset matching)
 *
 * Phase 2: Vision AI will validate and refine these values based on actual
 * image analysis. Phase 1: StubProvider uses them directly.
 *
 * These profiles were crafted from real cinematography and colour grading principles.
 * They are NOT fake AI — they represent genuine aesthetic intelligence encoded
 * by experienced colourists.
 */

import type { StyleProfile } from "@/types/ai"

export const STYLE_PROFILES: StyleProfile[] = [

  /* ─────────────────────────────────────────────────────
     CINEMATIC
     The Hollywood grade. Teal-orange split tone,
     elevated contrast, slightly desaturated midtones.
  ───────────────────────────────────────────────────── */
  {
    id:          "cinematic",
    name:        "Cinematic",
    emoji:       "🎬",
    tagline:     "Hollywood-grade teal-orange drama",
    description: "A professional film-grade colour treatment inspired by major motion pictures. Teal shadows balance warm highlights for the iconic cinematic look.",
    colorPalette: ["#1A3A3A", "#2D5A5A", "#C9813A", "#E8A848", "#F5D080"],
    lighting:    "Dramatic contrast, warm highlights, teal-shifted shadows",
    mood:        "Dramatic, cinematic, powerful",
    colors:      "Orange-teal split tone with desaturated midtones",
    contrast:    "High — deep blacks, bright highlights",
    tone:        "Rich, filmic, atmospheric",
    idealScenes: ["Action shots", "Portraits", "Urban street", "Drama", "Film stills"],
    editingGoals: [
      "Apply teal-orange complementary split tone",
      "Increase contrast for cinematic depth",
      "Desaturate midtones slightly for realism",
      "Shift shadows toward teal/blue",
    ],
    tags: ["cinematic", "dramatic", "teal", "orange", "contrast", "film", "movie", "dark", "rich"],
    defaultAdjustments: {
      brightness: 0.99,
      contrast:   1.22,
      saturation: 0.88,
      hue:        -5,
      gamma:      1.04,
      tintR:      4,
      tintG:      -1,
      tintB:      -5,
    },
    analysisTemplate: {
      lighting: { quality: "dramatic", colorTemperature: "warm", kelvin: 5000, intensity: "high" },
      colors:   { dominant: ["teal", "orange", "amber"], palette: ["#1A3A3A", "#C9813A", "#E8A848"], grade: "Teal-orange split tone", saturationLevel: "muted", contrastLevel: "dramatic", colorTemperature: "warm" },
      mood:     { primary: "dramatic", secondary: "mysterious", energy: "high", adjectives: ["cinematic", "powerful", "teal", "atmospheric", "dark"] },
      scene:    { timeOfDay: "unknown", weather: "unknown" },
      quality:  { sharpness: "high", noise: "low", exposure: "well-exposed" },
    },
  },

  /* ─────────────────────────────────────────────────────
     GOLDEN HOUR
     The warmth of 20 minutes after sunset. Amber,
     lifted shadows, romantic light.
  ───────────────────────────────────────────────────── */
  {
    id:          "golden-hour",
    name:        "Golden Hour",
    emoji:       "🌅",
    tagline:     "Amber warmth, lifted shadows, romantic light",
    description: "The most universally flattering light in photography. Warm amber tones enhance sunsets, portraits, and landscapes with a timeless, romantic quality.",
    colorPalette: ["#F59E0B", "#D97706", "#B45309", "#FDE68A", "#FCA5A5"],
    lighting:    "Warm side/back lighting, golden directional, soft shadows",
    mood:        "Romantic, nostalgic, warm, dreamy",
    colors:      "Amber, gold, orange — warm throughout",
    contrast:    "Medium — lifted shadows, bright highlights",
    tone:        "Warm, golden, soft",
    idealScenes: ["Sunsets", "Portraits", "Outdoor", "Travel", "Couple shots", "Landscapes"],
    editingGoals: [
      "Enhance warm amber and orange tones",
      "Lift shadows for a warm, open feel",
      "Add subtle hue rotation toward gold",
      "Apply warm RGB tint (boost red, reduce blue)",
    ],
    tags: ["warm", "golden", "amber", "sunset", "romantic", "outdoor", "portrait", "travel", "soft", "glow"],
    defaultAdjustments: {
      brightness: 1.04,
      contrast:   1.15,
      saturation: 0.95,
      hue:        6,
      gamma:      0.97,
      tintR:      8,
      tintG:      3,
      tintB:      -8,
    },
    analysisTemplate: {
      lighting: { quality: "warm directional", colorTemperature: "warm", kelvin: 4500, intensity: "medium" },
      colors:   { dominant: ["amber", "gold", "orange"], palette: ["#F59E0B", "#D97706", "#FDE68A"], grade: "Warm amber grade", saturationLevel: "natural", contrastLevel: "medium", colorTemperature: "warm" },
      mood:     { primary: "romantic", secondary: "nostalgic", energy: "medium", adjectives: ["warm", "golden", "dreamy", "cinematic", "soft"] },
      scene:    { timeOfDay: "golden hour", weather: "clear" },
      quality:  { sharpness: "high", noise: "low", exposure: "well-exposed" },
    },
  },

  /* ─────────────────────────────────────────────────────
     MOODY DARK
     Atmospheric darkness. Crushed blacks,
     desaturated, blue-tinged shadows.
  ───────────────────────────────────────────────────── */
  {
    id:          "moody",
    name:        "Moody Dark",
    emoji:       "🌑",
    tagline:     "Atmospheric darkness, deep shadows, mystery",
    description: "A brooding, atmospheric grade that embraces shadow and restraint. Desaturated midtones and cool shadow tones create tension and emotional depth.",
    colorPalette: ["#0F172A", "#1E293B", "#334155", "#475569", "#94A3B8"],
    lighting:    "Low key, deep shadows, minimal fill",
    mood:        "Mysterious, melancholic, dark, tense",
    colors:      "Desaturated greys, cool shadows, minimal saturation",
    contrast:    "High — deep blacks, controlled highlights",
    tone:        "Dark, cool, atmospheric",
    idealScenes: ["Night scenes", "Urban noir", "Rain", "Dark interiors", "Drama", "Portraiture"],
    editingGoals: [
      "Crush blacks for deep, inky shadows",
      "Desaturate for a raw, authentic feel",
      "Shift shadows toward cool/blue",
      "Maintain highlight detail while darkening overall",
    ],
    tags: ["moody", "dark", "shadows", "noir", "atmospheric", "desaturated", "cool", "dramatic", "mystery"],
    defaultAdjustments: {
      brightness: 0.92,
      contrast:   1.25,
      saturation: 0.72,
      hue:        -5,
      gamma:      1.08,
      tintR:      -3,
      tintG:      0,
      tintB:      6,
    },
    analysisTemplate: {
      lighting: { quality: "dramatic", colorTemperature: "cool", kelvin: 6500, intensity: "low" },
      colors:   { dominant: ["shadow grey", "dark blue", "cool neutral"], palette: ["#0F172A", "#1E293B", "#334155"], grade: "Desaturated noir grade", saturationLevel: "desaturated", contrastLevel: "dramatic", colorTemperature: "cool" },
      mood:     { primary: "mysterious", secondary: "melancholic", energy: "low", adjectives: ["dark", "atmospheric", "moody", "raw", "cinematic"] },
      scene:    { timeOfDay: "dusk", weather: "overcast" },
      quality:  { sharpness: "high", noise: "low", exposure: "well-exposed" },
    },
  },

  /* ─────────────────────────────────────────────────────
     FILM VINTAGE
     Analog emulation. Lifted blacks, faded tone,
     warm cast — Kodak/Fuji nostalgia.
  ───────────────────────────────────────────────────── */
  {
    id:          "film",
    name:        "Film Vintage",
    emoji:       "📽",
    tagline:     "Analog soul, lifted blacks, Kodak warmth",
    description: "Inspired by Kodak Portra and Fuji Pro 400H. Lifted shadow toe, slightly faded highlights, and a warm orange cast recreate authentic film emulsion character.",
    colorPalette: ["#8B6E47", "#C4A35A", "#D4B483", "#E8D5B0", "#F5EDD0"],
    lighting:    "Soft, diffused, characteristic film latitude",
    mood:        "Nostalgic, warm, timeless, storytelling",
    colors:      "Lifted shadows, warm highlights, faded contrast",
    contrast:    "Low-medium — lifted blacks, compressed highlights",
    tone:        "Warm, faded, grain-compatible",
    idealScenes: ["Portraits", "Street", "Documentary", "Travel", "Family", "Lifestyle"],
    editingGoals: [
      "Lift shadow toe for film-like base density",
      "Reduce contrast for analog compression",
      "Add warm tint to simulate film dye curves",
      "Slightly desaturate for authentic emulsion look",
    ],
    tags: ["film", "analog", "vintage", "grain", "kodak", "fuji", "retro", "faded", "warm", "nostalgia"],
    defaultAdjustments: {
      brightness: 1.03,
      contrast:   1.05,
      saturation: 0.82,
      hue:        4,
      gamma:      1.05,
      tintR:      6,
      tintG:      4,
      tintB:      -3,
    },
    analysisTemplate: {
      lighting: { quality: "soft diffused", colorTemperature: "warm", kelvin: 5200, intensity: "medium" },
      colors:   { dominant: ["warm tan", "lifted shadow", "faded highlight"], palette: ["#8B6E47", "#C4A35A", "#E8D5B0"], grade: "Film emulation — warm base", saturationLevel: "muted", contrastLevel: "low", colorTemperature: "warm" },
      mood:     { primary: "nostalgic", secondary: "peaceful", energy: "low", adjectives: ["analog", "warm", "timeless", "soft", "faded"] },
      scene:    { timeOfDay: "unknown", weather: "unknown" },
      quality:  { sharpness: "medium", noise: "medium", exposure: "well-exposed" },
    },
  },

  /* ─────────────────────────────────────────────────────
     PORTRAIT GLOW
     Soft skin, flattering warmth.
     Designed to flatter all skin tones.
  ───────────────────────────────────────────────────── */
  {
    id:          "portrait",
    name:        "Portrait Glow",
    emoji:       "✨",
    tagline:     "Soft skin, warm light, magazine-quality finish",
    description: "Engineered for skin tones. Slight highlight lift brightens faces, warm tint enhances natural warmth, and refined contrast preserves texture without harshness.",
    colorPalette: ["#FBBF24", "#F97316", "#FDE68A", "#FCA5A5", "#FECACA"],
    lighting:    "Soft, front/side, flattering wraparound",
    mood:        "Soft, romantic, elegant, editorial",
    colors:      "Warm peach, soft highlights, subtle blush",
    contrast:    "Low-medium — gentle, flattering",
    tone:        "Warm, luminous, skin-optimised",
    idealScenes: ["Headshots", "Fashion", "Couple portraits", "Editorial", "Beauty"],
    editingGoals: [
      "Lift and warm highlights to flatter faces",
      "Boost skin-tone warmth with red/green tint",
      "Reduce contrast slightly for soft editorial feel",
      "Maintain shadow detail for dimensionality",
    ],
    tags: ["portrait", "skin", "soft", "warm", "glow", "faces", "editorial", "beauty", "flattering"],
    defaultAdjustments: {
      brightness: 1.06,
      contrast:   1.06,
      saturation: 0.92,
      hue:        2,
      gamma:      0.95,
      tintR:      6,
      tintG:      2,
      tintB:      -4,
    },
    analysisTemplate: {
      lighting: { quality: "soft diffused", colorTemperature: "warm", kelvin: 5000, intensity: "medium" },
      colors:   { dominant: ["warm peach", "soft gold", "blush"], palette: ["#FBBF24", "#FDE68A", "#FCA5A5"], grade: "Warm portrait grade", saturationLevel: "muted", contrastLevel: "low", colorTemperature: "warm" },
      mood:     { primary: "romantic", secondary: "peaceful", energy: "medium", adjectives: ["soft", "warm", "luminous", "flattering", "elegant"] },
      scene:    { timeOfDay: "unknown", weather: "unknown" },
      quality:  { sharpness: "medium", noise: "low", exposure: "well-exposed" },
    },
  },

  /* ─────────────────────────────────────────────────────
     STREET GRITTY
     Raw, authentic, high contrast.
     Documentary and street photography.
  ───────────────────────────────────────────────────── */
  {
    id:          "street",
    name:        "Street Gritty",
    emoji:       "🏙",
    tagline:     "Raw, contrasty, unfiltered city life",
    description: "Inspired by documentary and street photographers. High contrast, slightly cooled and desaturated, with enough grit to feel authentic and immediate.",
    colorPalette: ["#1C1C1C", "#374151", "#6B7280", "#9CA3AF", "#D1D5DB"],
    lighting:    "Harsh mixed, available light, high contrast",
    mood:        "Raw, authentic, energetic, gritty",
    colors:      "Cool grey, desaturated, deep black",
    contrast:    "High — deep shadows, punchy highlights",
    tone:        "Cool, gritty, documentary",
    idealScenes: ["Street photography", "Urban", "Documentary", "Candid", "Architecture"],
    editingGoals: [
      "Increase contrast for punchy, immediate feel",
      "Desaturate for documentary authenticity",
      "Cool slightly to emphasise urban environment",
      "Preserve texture and detail in highlights",
    ],
    tags: ["street", "gritty", "urban", "documentary", "contrast", "cool", "raw", "authentic", "city"],
    defaultAdjustments: {
      brightness: 0.96,
      contrast:   1.30,
      saturation: 0.78,
      hue:        -3,
      gamma:      1.03,
      tintR:      0,
      tintG:      1,
      tintB:      4,
    },
    analysisTemplate: {
      lighting: { quality: "harsh directional", colorTemperature: "cool", kelvin: 6800, intensity: "high" },
      colors:   { dominant: ["dark grey", "cool neutral", "deep black"], palette: ["#1C1C1C", "#374151", "#9CA3AF"], grade: "Urban documentary grade", saturationLevel: "desaturated", contrastLevel: "high", colorTemperature: "cool" },
      mood:     { primary: "raw", secondary: "energetic", energy: "high", adjectives: ["gritty", "authentic", "dark", "dramatic", "urban"] },
      scene:    { timeOfDay: "unknown", weather: "unknown" },
      quality:  { sharpness: "high", noise: "medium", exposure: "well-exposed" },
    },
  },

  /* ─────────────────────────────────────────────────────
     TRAVEL VIBRANT
     Clear skies, punchy colours, wanderlust energy.
  ───────────────────────────────────────────────────── */
  {
    id:          "travel",
    name:        "Travel Vibrant",
    emoji:       "🌍",
    tagline:     "Punchy, clear, wanderlust energy",
    description: "Made for the explorer. Vibrant colour, crisp clarity and a warm punch that makes every destination look like a postcard. Sky stays blue, greens pop, skin glows.",
    colorPalette: ["#06B6D4", "#0EA5E9", "#10B981", "#84CC16", "#F59E0B"],
    lighting:    "Clear daylight, natural, bright and open",
    mood:        "Energetic, joyful, adventurous, optimistic",
    colors:      "Vibrant blue sky, punchy green, warm highlights",
    contrast:    "Medium-high — clear and punchy",
    tone:        "Bright, clear, vibrant",
    idealScenes: ["Travel", "Landscapes", "Beaches", "Nature", "Adventure", "Architecture"],
    editingGoals: [
      "Boost saturation for vivid travel look",
      "Increase brightness and lift for open, airy feel",
      "Enhance blues and greens",
      "Warm highlights slightly for life and energy",
    ],
    tags: ["travel", "vibrant", "saturated", "outdoor", "landscape", "adventure", "clear", "punchy", "beach", "nature"],
    defaultAdjustments: {
      brightness: 1.07,
      contrast:   1.18,
      saturation: 1.20,
      hue:        3,
      gamma:      0.97,
      tintR:      2,
      tintG:      1,
      tintB:      -3,
    },
    analysisTemplate: {
      lighting: { quality: "soft diffused", colorTemperature: "neutral", kelvin: 6000, intensity: "high" },
      colors:   { dominant: ["sky blue", "vibrant green", "warm highlight"], palette: ["#06B6D4", "#10B981", "#F59E0B"], grade: "Travel vibrant grade", saturationLevel: "vibrant", contrastLevel: "medium", colorTemperature: "neutral" },
      mood:     { primary: "energetic", secondary: "playful", energy: "high", adjectives: ["vibrant", "clear", "adventurous", "warm", "joyful"] },
      scene:    { timeOfDay: "midday", weather: "clear" },
      quality:  { sharpness: "high", noise: "low", exposure: "well-exposed" },
    },
  },

  /* ─────────────────────────────────────────────────────
     LUXURY EDITORIAL
     Dark richness, deep shadows, gold accents.
     Fashion and commercial.
  ───────────────────────────────────────────────────── */
  {
    id:          "luxury",
    name:        "Luxury Editorial",
    emoji:       "👑",
    tagline:     "Dark, rich, editorial-grade glamour",
    description: "The look of premium fashion and luxury campaigns. Deep shadows, rich contrast, and a warm gold-shifted grade that elevates anything into editorial territory.",
    colorPalette: ["#0A0A0A", "#1A1207", "#3D2B0A", "#FFD60A", "#F5D080"],
    lighting:    "Studio-quality, dramatic, high contrast",
    mood:        "Luxurious, powerful, seductive, aspirational",
    colors:      "Deep black, rich brown, gold highlights",
    contrast:    "Very high — velvet blacks, controlled gold highlights",
    tone:        "Dark, rich, warm gold",
    idealScenes: ["Fashion", "Product", "Luxury brand", "Portrait", "Commercial"],
    editingGoals: [
      "Deepen blacks for luxury velvet feel",
      "Add warm gold tone to highlights",
      "Boost contrast for editorial punch",
      "Slightly desaturate shadows for depth",
    ],
    tags: ["luxury", "editorial", "dark", "rich", "gold", "fashion", "commercial", "premium", "glamour"],
    defaultAdjustments: {
      brightness: 0.94,
      contrast:   1.28,
      saturation: 0.85,
      hue:        5,
      gamma:      1.06,
      tintR:      5,
      tintG:      2,
      tintB:      -6,
    },
    analysisTemplate: {
      lighting: { quality: "dramatic", colorTemperature: "warm", kelvin: 4800, intensity: "high" },
      colors:   { dominant: ["black", "gold", "rich brown"], palette: ["#0A0A0A", "#FFD60A", "#3D2B0A"], grade: "Luxury editorial grade", saturationLevel: "muted", contrastLevel: "dramatic", colorTemperature: "warm" },
      mood:     { primary: "luxurious", secondary: "dramatic", energy: "medium", adjectives: ["rich", "dark", "premium", "gold", "cinematic"] },
      scene:    { timeOfDay: "unknown", weather: "unknown" },
      quality:  { sharpness: "high", noise: "low", exposure: "well-exposed" },
    },
  },

  /* ─────────────────────────────────────────────────────
     NIGHT VISION
     City lights, deep blue atmosphere.
  ───────────────────────────────────────────────────── */
  {
    id:          "night",
    name:        "Night Vision",
    emoji:       "🌃",
    tagline:     "Deep blues, city light, nocturnal atmosphere",
    description: "Designed for the magic hours after dark. Deep indigo shadows, cool colour temperature, and careful shadow lifting reveal the mood without crushing detail.",
    colorPalette: ["#0C0E1E", "#1E2140", "#2D3561", "#4361EE", "#7B8FFF"],
    lighting:    "Mixed artificial, city light, blue atmosphere",
    mood:        "Mysterious, calm, nocturnal, urban",
    colors:      "Deep indigo, city blue, neon accent",
    contrast:    "High with lifted shadow — preserves night detail",
    tone:        "Cool, deep blue, atmospheric",
    idealScenes: ["Night", "City lights", "Blue hour", "Urban", "Astrophotography"],
    editingGoals: [
      "Shift colour temperature toward blue/indigo",
      "Lift shadows slightly to preserve night detail",
      "Add cool blue tint for atmospheric depth",
      "Enhance ambient light separation",
    ],
    tags: ["night", "blue", "city", "urban", "nocturnal", "indigo", "atmospheric", "cool", "dark", "neon"],
    defaultAdjustments: {
      brightness: 0.96,
      contrast:   1.20,
      saturation: 0.88,
      hue:        -12,
      gamma:      1.02,
      tintR:      -4,
      tintG:      2,
      tintB:      10,
    },
    analysisTemplate: {
      lighting: { quality: "mixed", colorTemperature: "very cool", kelvin: 8500, intensity: "low" },
      colors:   { dominant: ["deep indigo", "city blue", "dark shadow"], palette: ["#0C0E1E", "#1E2140", "#4361EE"], grade: "Night blue grade", saturationLevel: "muted", contrastLevel: "high", colorTemperature: "very cool" },
      mood:     { primary: "mysterious", secondary: "peaceful", energy: "low", adjectives: ["nocturnal", "deep", "atmospheric", "blue", "cinematic"] },
      scene:    { timeOfDay: "night", weather: "clear" },
      quality:  { sharpness: "medium", noise: "medium", exposure: "well-exposed" },
    },
  },

  /* ─────────────────────────────────────────────────────
     CYBERPUNK NEON
     Teal-magenta split, ultra contrast, futuristic.
  ───────────────────────────────────────────────────── */
  {
    id:          "cyberpunk",
    name:        "Cyberpunk Neon",
    emoji:       "⚡",
    tagline:     "Teal-magenta neon, ultra contrast, futuristic",
    description: "The future is soaked in neon. High saturation, extreme teal-magenta split tone, and ultra contrast create an otherworldly, electric visual aesthetic.",
    colorPalette: ["#0D0D1A", "#00B4D8", "#E040FB", "#FF006E", "#FFBE0B"],
    lighting:    "Neon artificial, mixed, high contrast",
    mood:        "Energetic, futuristic, electric, edgy",
    colors:      "Teal cyan, magenta, neon yellow — vivid split",
    contrast:    "Extreme — neon pops against darkness",
    tone:        "Electric, vivid, futuristic",
    idealScenes: ["Sci-fi", "Urban night", "Gaming", "Fashion", "Tech product", "Concert"],
    editingGoals: [
      "Create strong teal-magenta complementary split",
      "Boost saturation dramatically",
      "Increase contrast to extreme for neon punch",
      "Shift hue strongly toward cyan/teal",
    ],
    tags: ["cyberpunk", "neon", "teal", "magenta", "futuristic", "electric", "vibrant", "contrast", "sci-fi", "punchy"],
    defaultAdjustments: {
      brightness: 1.05,
      contrast:   1.35,
      saturation: 1.30,
      hue:        -15,
      gamma:      0.98,
      tintR:      8,
      tintG:      -3,
      tintB:      12,
    },
    analysisTemplate: {
      lighting: { quality: "dramatic", colorTemperature: "very cool", kelvin: 9000, intensity: "high" },
      colors:   { dominant: ["teal cyan", "magenta", "deep black"], palette: ["#00B4D8", "#E040FB", "#0D0D1A"], grade: "Teal-magenta neon split", saturationLevel: "hypersaturated", contrastLevel: "dramatic", colorTemperature: "cool" },
      mood:     { primary: "energetic", secondary: "mysterious", energy: "high", adjectives: ["electric", "futuristic", "vivid", "neon", "intense"] },
      scene:    { timeOfDay: "night", weather: "unknown" },
      quality:  { sharpness: "high", noise: "low", exposure: "well-exposed" },
    },
  },

  /* ─────────────────────────────────────────────────────
     ANIME POP
     Vibrant primaries, clean whites, manga clarity.
  ───────────────────────────────────────────────────── */
  {
    id:          "anime",
    name:        "Anime Pop",
    emoji:       "🌸",
    tagline:     "Vibrant primaries, clean whites, manga pop",
    description: "Inspired by Japanese animation aesthetics. High saturation, clean whites, and bright primary colours create the distinctive vivid look of anime illustration.",
    colorPalette: ["#FF6B9D", "#C9E4F7", "#88D8B0", "#FFE66D", "#A8EDEA"],
    lighting:    "Clean, even, bright and airy",
    mood:        "Playful, vibrant, joyful, energetic",
    colors:      "Vivid primaries, clean whites, candy pastels",
    contrast:    "Medium — clean without harshness",
    tone:        "Bright, clean, saturated",
    idealScenes: ["Fashion", "Street style", "Product", "Youth culture", "Creative portrait"],
    editingGoals: [
      "Push saturation for vivid, illustrative feel",
      "Lift brightness for clean, airy foundation",
      "Preserve colour separation and clarity",
      "Minimise shadows for open, anime-style look",
    ],
    tags: ["anime", "vibrant", "saturated", "clean", "bright", "pop", "colorful", "bold", "manga", "vivid"],
    defaultAdjustments: {
      brightness: 1.10,
      contrast:   1.15,
      saturation: 1.45,
      hue:        0,
      gamma:      0.93,
      tintR:      3,
      tintG:      0,
      tintB:      -2,
    },
    analysisTemplate: {
      lighting: { quality: "soft diffused", colorTemperature: "neutral", kelvin: 6200, intensity: "high" },
      colors:   { dominant: ["vivid pink", "sky blue", "bright green"], palette: ["#FF6B9D", "#C9E4F7", "#88D8B0"], grade: "Anime vivid grade", saturationLevel: "hypersaturated", contrastLevel: "medium", colorTemperature: "neutral" },
      mood:     { primary: "playful", secondary: "energetic", energy: "high", adjectives: ["vibrant", "bright", "clean", "vivid", "joyful"] },
      scene:    { timeOfDay: "midday", weather: "clear" },
      quality:  { sharpness: "high", noise: "low", exposure: "well-exposed" },
    },
  },

  /* ─────────────────────────────────────────────────────
     VINTAGE RETRO
     Warm orange cast, faded contrast, instant nostalgia.
  ───────────────────────────────────────────────────── */
  {
    id:          "vintage",
    name:        "Vintage Retro",
    emoji:       "🟤",
    tagline:     "Faded warmth, orange cast, instant nostalgia",
    description: "Takes you straight back to the 70s. Warm orange cast, reduced contrast, faded shadows and a slightly lifted, desaturated look — nostalgic by design.",
    colorPalette: ["#7C5B3A", "#B8860B", "#DAA520", "#E8C96A", "#F5E6B0"],
    lighting:    "Soft, warm, aged — like old photographic prints",
    mood:        "Nostalgic, warm, timeless, story-driven",
    colors:      "Warm orange, faded brown, aged highlight",
    contrast:    "Low — faded and vintage",
    tone:        "Warm, orange-shifted, faded",
    idealScenes: ["Lifestyle", "Portraits", "Architectural", "Product", "Family", "Documentary"],
    editingGoals: [
      "Apply warm orange cast for vintage character",
      "Reduce contrast for authentic aged feel",
      "Lift shadows for faded vintage base",
      "Slightly desaturate for aged colour film look",
    ],
    tags: ["vintage", "retro", "warm", "orange", "faded", "nostalgic", "70s", "aged", "old", "timeless"],
    defaultAdjustments: {
      brightness: 1.02,
      contrast:   0.95,
      saturation: 0.75,
      hue:        8,
      gamma:      1.08,
      tintR:      8,
      tintG:      6,
      tintB:      -5,
    },
    analysisTemplate: {
      lighting: { quality: "soft diffused", colorTemperature: "very warm", kelvin: 3800, intensity: "medium" },
      colors:   { dominant: ["warm orange", "faded brown", "aged white"], palette: ["#7C5B3A", "#B8860B", "#F5E6B0"], grade: "Vintage orange grade", saturationLevel: "muted", contrastLevel: "flat", colorTemperature: "very warm" },
      mood:     { primary: "nostalgic", secondary: "peaceful", energy: "low", adjectives: ["vintage", "warm", "faded", "timeless", "aged"] },
      scene:    { timeOfDay: "unknown", weather: "unknown" },
      quality:  { sharpness: "medium", noise: "medium", exposure: "well-exposed" },
    },
  },
]

/* ─────────────────────────────────────────────────────────────
   Lookup utilities
───────────────────────────────────────────────────────────── */

const PROFILES_MAP = new Map(STYLE_PROFILES.map((p) => [p.id, p]))

export function getStyleProfile(id: string): StyleProfile | null {
  return PROFILES_MAP.get(id as StyleProfile["id"]) ?? null
}

export function getAllStyleProfiles(): StyleProfile[] {
  return STYLE_PROFILES
}

/**
 * Matches a free-text prompt + keyword array to the best StyleProfile.
 * Uses a weighted keyword intersection: profile.tags vs (prompt tokens ∪ aesthetics).
 * Falls back to "cinematic" if nothing scores above 0.
 */
export function matchStyleProfile(prompt: string, aesthetics: string[]): StyleProfile {
  const tokens = [
    ...prompt.toLowerCase().split(/\W+/).filter(Boolean),
    ...aesthetics.map((a) => a.toLowerCase()),
  ]

  let best      = STYLE_PROFILES[0]
  let bestScore = -1

  for (const profile of STYLE_PROFILES) {
    const matches = profile.tags.filter((tag) => tokens.some((t) => t.includes(tag) || tag.includes(t)))
    const score   = matches.length / Math.max(profile.tags.length, 1)

    if (score > bestScore) {
      bestScore = score
      best      = profile
    }
  }

  return best
}
