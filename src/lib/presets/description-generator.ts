/**
 * src/lib/presets/description-generator.ts
 *
 * Generates professional, preset-specific product descriptions from preset
 * metadata — name, category, AI tags, tagline, best-use-case.
 *
 * Does NOT use the raw YouTube description. Every output is purpose-written
 * editorial copy inferred from the preset's visual and tonal character.
 *
 * Called server-side only (Server Components, API routes).
 */

export interface DescriptionInput {
  name:         string
  slug?:        string
  category?:    string
  aiTags?:      string[]
  tagline?:     string
  bestUseCase?: string
  isFree?:      boolean
}

/* ── Trait detection ──────────────────────────────────────────────────────── */

function detect(text: string) {
  const t = text.toLowerCase()
  return {
    moody:     /\bmoody\b|noir|shadow|brooding|gloomy/.test(t),
    cinematic: /cinematic|film(?!m)|blockbuster/.test(t),
    vintage:   /vintage|retro|analog|grain|grainy|faded|film\s/.test(t),
    pastel:    /pastel|soft\s|cream|vanilla|airy|gentle|bright/.test(t),
    aesthetic: /aesthetic|lofi|lo-fi|dreamy/.test(t),
    urban:     /urban|city|street|downtown|concrete/.test(t),
    portrait:  /portrait|selfie|face|skin|retouch|people/.test(t),
    travel:    /travel|bali|adventure|wanderlust|landscape|mountain/.test(t),
    nature:    /forest|tropical|jungle|outdoor|nature|misty/.test(t),
    food:      /food|cafe|coffee|blogger/.test(t),
    golden:    /golden|warm\s|sunrise|sunset|summer/.test(t),
    blue:      /\bblue\b|aqua|teal|cyan|denim|sky\s|ocean|mint/.test(t),
    green:     /\bgreen\b|forest|tropical|indie/.test(t),
    orange:    /orange|tangerine|campfire|celestial/.test(t),
    red:       /\bred\s|\bruby\b|velvet|cherry|riverdale/.test(t),
    purple:    /purple|violet|lavender/.test(t),
    dark:      /\bdark\b|\bblack\b|noir|deep\s|night/.test(t),
    night:     /night|nightlife|tokyo|neon|cyberpunk/.test(t),
    car:       /\bcar\b|moto|motorcycle|garage|automobile/.test(t),
    clean:     /\bclean\b|minimal|fresh\s/.test(t),
    gold:      /\bgold\b|cinematic gold/.test(t),
    brown:     /brown|chocolate|caramel|mocha/.test(t),
    grey:      /grey|gray/.test(t),
  }
}

/* ── Paragraph templates ──────────────────────────────────────────────────── */

export function generatePresetDescription(preset: DescriptionInput): string {
  const combined = [
    preset.name,
    preset.slug ?? "",
    preset.category ?? "",
    (preset.aiTags ?? []).join(" "),
    preset.tagline ?? "",
    preset.bestUseCase ?? "",
  ].join(" ")

  const is = detect(combined)
  const n  = preset.name

  /* ── Cinematic Gold / Warm Cinema ── */
  if ((is.gold || is.golden) && is.cinematic) {
    return [
      `${n} wraps every frame in the unmistakable warmth of golden-hour cinema — lifted blacks, amber-tinted highlights, and a colour grade that feels pulled straight from a professional colour suite. It is built for creators who want their work to carry the weight and warmth of a feature film without a single manual adjustment.`,
      `City scenes, portrait sessions, and travel photography all benefit from its rich tonal depth. Warm mid-tones draw out skin naturally while controlled shadow lift prevents harsh clipping in darker areas, giving a finished, editorial quality to images that would otherwise read as ordinary.`,
    ].join("\n\n")
  }

  /* ── Moody Blue ── */
  if (is.moody && is.blue) {
    return [
      `${n} brings a cool, restrained intensity to every frame — deep shadows softened with blue undertones, muted highlights, and a mid-tone contrast that reads as deliberately crafted. The result is images that feel heavy with atmosphere and visual intention.`,
      `Ideal for urban architecture, night photography, and portrait work in mixed or artificial light. The cool shadow palette performs particularly well in blue-hour city streets and any scene where quiet drama through colour is the intended statement.`,
    ].join("\n\n")
  }

  /* ── Moody Green ── */
  if (is.moody && is.green) {
    return [
      `${n} channels the depth of a dense forest into every photograph — rich, saturated greens layered over deep shadows and a controlled, film-like mid-tone roll-off. The result is images that feel grounded, organic, and genuinely cinematic.`,
      `Built for outdoor photography, travel editorial, and portrait work in natural light. The green-shifted tone profile pairs beautifully with foliage, earthy environments, and any scene where a lush, verdant atmosphere serves the composition.`,
    ].join("\n\n")
  }

  /* ── Moody (general) ── */
  if (is.moody || is.dark) {
    return [
      `${n} is built around tension — deep, crushed blacks, restrained highlights, and a mid-tone contrast that commands attention. The look is deliberate and cinematic, stripping each frame down to its essential mood without feeling heavy-handed.`,
      `Best applied to street photography, portraits shot in low or mixed light, and urban scenes where contrast carries the story. The tonal structure retains natural detail in shadow regions while ensuring highlights remain controlled and intentional.`,
    ].join("\n\n")
  }

  /* ── Cinematic (general) ── */
  if (is.cinematic) {
    return [
      `${n} applies the logic of a professional colour grade to Lightroom Mobile — a balanced tonal curve, deliberately weighted shadows, and film-like mid-tone rendering that bridges the gap between casual photography and polished editorial work.`,
      `Versatile enough for street photography, architecture, and portrait sessions, it performs particularly well in environments with layered or directional light. The neutral grade ensures it translates reliably across a wide variety of shooting conditions.`,
    ].join("\n\n")
  }

  /* ── Vintage / Film ── */
  if (is.vintage) {
    return [
      `${n} captures the texture and colour memory of analog film — lifted shadow tones, slightly desaturated highlights, and a grain-forward character that makes digital images feel genuinely lived-in. It is the preset for work that should feel shot, not rendered.`,
      `Well suited to portrait sessions, street documentation, lifestyle photography, and any subject matter that benefits from warmth and a sense of timelessness. The film emulation holds up particularly well in soft, diffused natural light.`,
    ].join("\n\n")
  }

  /* ── Pastel / Aesthetic ── */
  if (is.pastel || is.aesthetic) {
    return [
      `${n} is built on restraint — a soft colour palette, elevated whites, and a gentle tone curve that reads as airy, minimal, and intentionally refined. It translates the visual language of curated editorial photography into a consistent, reproducible Lightroom grade.`,
      `Designed for portrait photography, lifestyle content, and flat-lay imagery that benefits from a clean, luminous atmosphere. Skin tones are rendered warmly and naturally, making it particularly effective for close-up portrait and fashion editorial work.`,
    ].join("\n\n")
  }

  /* ── Night / Urban Neon ── */
  if (is.night || (is.urban && is.dark)) {
    return [
      `${n} is a colour grade calibrated for the city after dark — high contrast, controlled saturation, and a tone profile built to read well under neon, artificial, and mixed-source light. It gives night photography the same tonal authority that separates editorial street work from casual documentation.`,
      `Optimised for night scenes, neon-lit streets, and any urban environment where artificial light defines the atmosphere. The shadow density creates graphic, high-impact compositions while highlight management prevents neon sources from overwhelming the frame.`,
    ].join("\n\n")
  }

  /* ── Urban / Street ── */
  if (is.urban) {
    return [
      `${n} is a city-made colour grade — controlled saturation, a mid-tone contrast curve that emphasises texture and structure, and a tonal profile built for the variety of light conditions urban environments present. The result reads as precise, deliberate, and undeniably street.`,
      `Built specifically for street photography, architecture, and urban documentary work. The tone structure creates visual clarity in complex, layered environments while retaining the raw energy of city light.`,
    ].join("\n\n")
  }

  /* ── Travel / Nature ── */
  if (is.travel || is.nature) {
    return [
      `${n} translates the sensory clarity of outdoor exploration into a consistent colour grade — vivid mid-tones, lifted shadows for natural depth, and a warm-cool balance that renders landscapes and portraits with equal confidence.`,
      `Ideal for travel photography, landscape documentation, and lifestyle content created in natural light. The balanced saturation lifts greens and blues just enough to make outdoor environments feel genuinely present without veering into over-processing.`,
    ].join("\n\n")
  }

  /* ── Portrait / Selfie ── */
  if (is.portrait) {
    return [
      `${n} is engineered for faces — a tone curve that opens shadow detail in skin, controlled highlight rendering that prevents blown-out complexions, and a colour balance that flatters a wide range of skin tones without requiring heavy manual correction.`,
      `Suited to editorial portrait photography, personal branding sessions, and lifestyle imagery where a natural, polished result is the priority. The grade holds up across indoor and outdoor portrait environments with equal reliability.`,
    ].join("\n\n")
  }

  /* ── Car / Motography ── */
  if (is.car) {
    return [
      `${n} is a colour grade built for machines — rich shadows, precise metallic highlights, and a contrast curve that emphasises surface texture and form. It gives automotive and street photography the same visual weight found in high-end motoring editorial.`,
      `Optimised for car photography, motography, and urban scenes where your subject is defined by shape and surface. The shadow structure creates drama around edges while keeping reflective surface detail — paint, chrome, and glass — clearly legible.`,
    ].join("\n\n")
  }

  /* ── Golden / Warm ── */
  if (is.golden || is.gold) {
    return [
      `${n} channels the quality of late-afternoon light into a consistent, portable grade — warm mid-tones, amber-lifted shadows, and highlights that glow rather than clip. The overall effect is intimate, sun-kissed, and distinctly photogenic.`,
      `Best applied to sunset and golden-hour sessions, travel portraiture, and lifestyle content where warmth communicates ease and authenticity. Works particularly well on skin tones and natural outdoor environments.`,
    ].join("\n\n")
  }

  /* ── Orange / Warm chromatic ── */
  if (is.orange) {
    return [
      `${n} works through bold, chromatic confidence — a warm, saturated palette anchored by deep shadow tones and highlights that feel vivid and precise simultaneously. The result is photography with immediate visual impact and a strong editorial identity.`,
      `Suited to portrait sessions, lifestyle editorial, and urban photography where a strong, signature colour palette strengthens the final composition. Controlled saturation prevents warm tones from drifting into excess across varied shooting conditions.`,
    ].join("\n\n")
  }

  /* ── Red / Ruby ── */
  if (is.red) {
    return [
      `${n} builds on a warm, red-shifted colour signature — deep, weighty shadows, luminous mid-tones with a chromatic presence, and highlight rendering that keeps the warm palette feeling polished rather than over-processed.`,
      `Particularly effective for portrait photography, fashion editorial, and lifestyle content where a rich, confident colour tone serves the creative direction. The tonal structure performs reliably across both studio and natural light conditions.`,
    ].join("\n\n")
  }

  /* ── Purple / Aesthetic Purple ── */
  if (is.purple) {
    return [
      `${n} leans into a cool, purple-shifted colour grade with a lofi sensibility — softened shadows, slightly desaturated highlights, and a tone curve that creates a dreamlike atmosphere across a wide range of photographic subjects.`,
      `Designed for aesthetic portrait photography, night scenes lit with artificial colour, and lifestyle content where a distinctive, non-naturalistic palette is the creative objective. The muted highlight structure keeps the look refined and intentional.`,
    ].join("\n\n")
  }

  /* ── Blue (general) ── */
  if (is.blue) {
    return [
      `${n} builds its identity around cool, precise tonality — blue-shifted shadows, controlled highlights, and a mid-tone curve that reads as measured and editorial. The colour grade communicates clarity and quiet confidence.`,
      `Particularly effective for portrait work, travel photography, and scenes shot in overcast or blue-hour light. The cool temperature renders natural environments with a calm, composed character that holds up in both intimate and expansive compositions.`,
    ].join("\n\n")
  }

  /* ── Brown / Chocolate / Caramel ── */
  if (is.brown) {
    return [
      `${n} is built around the warmth of earth tones — rich brown mid-tones, a gentle shadow lift that prevents deep browns from going flat, and a highlight profile that renders warm skin and textured surfaces with natural depth.`,
      `Well suited to lifestyle photography, portrait sessions, and travel content where a warm, earthy palette grounds the image and creates a sense of familiarity and comfort. The tone structure handles mixed light sources gracefully.`,
    ].join("\n\n")
  }

  /* ── Grey / Film Grey ── */
  if (is.grey) {
    return [
      `${n} distils the tonal restraint of black-and-white film into a muted, grey-shifted colour grade — desaturated mid-tones, carefully balanced shadow depth, and a film-like curve that translates colour photography into something closer to documentary.`,
      `Ideal for street photography, editorial portraiture, and any scene where colour would distract from form, structure, and light quality. The neutral palette transfers consistently across widely varied shooting conditions.`,
    ].join("\n\n")
  }

  /* ── Food / Clean ── */
  if (is.food || is.clean) {
    return [
      `${n} delivers a clean, bright colour profile designed to make subjects feel fresh, elevated, and accurately rendered — lifted mid-tones, precise white balance, and a tone structure that translates well across both social media and print.`,
      `A natural choice for food photography, product documentation, flat-lay content, and lifestyle imagery. The restrained palette keeps colours accurate and inviting without pushing into over-saturation or artificial-looking enhancement.`,
    ].join("\n\n")
  }

  /* ── Generic fallback ── */
  return [
    `${n} delivers a considered, adaptable colour grade that brings tonal consistency and visual clarity to your photography — balanced contrast, controlled saturation, and a tone curve engineered to perform reliably across a broad range of shooting conditions.`,
    `Suitable for portrait photography, travel content, lifestyle imagery, and social editorial work. Built to enhance rather than transform, it preserves the natural character of your light while applying a cohesive, professional finish.`,
  ].join("\n\n")
}

/* ── How-to-unlock copy ───────────────────────────────────────────────────── */

export const HOW_TO_UNLOCK_COPY = {
  heading: "How to Access This Preset",
  body: [
    "This preset can be unlocked at no cost by watching the accompanying YouTube tutorial. The unlock password appears split across two moments in the upper-right corner of the video during playback — you will need both parts to complete the entry.",
    "If you prefer immediate access without watching the tutorial, purchasing the preset delivers an instant download with no additional steps required. Both options provide exactly the same file and the same lifetime access.",
    "Choose whichever method better suits your workflow.",
  ],
} as const
