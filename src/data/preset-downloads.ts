/**
 * src/data/preset-downloads.ts
 *
 * PUBLIC preset metadata — safe to import from client components.
 * Does NOT contain Drive URLs or passwords (those live server-side in
 * src/lib/presets/secure-registry.ts and are only ever returned via API).
 *
 * Use getPresetMeta(presetName) to check whether a preset is free or
 * whether its download is coming soon, so the UI can render the correct
 * button state before the user clicks.
 */

export interface PresetMeta {
  title:    string
  isFree:   boolean
  comingSoon: boolean
}

const PRESET_META: PresetMeta[] = [
  /* ── Free presets ── */
  { title: "teal and rust preset",      isFree: true,  comingSoon: false },
  { title: "how to create mint blue",   isFree: true,  comingSoon: false },
  { title: "tropical preset",           isFree: true,  comingSoon: false },
  { title: "cinematic v3 preset",       isFree: true,  comingSoon: false },
  { title: "nightlife",                 isFree: true,  comingSoon: false },

  /* ── Paid presets ── */
  { title: "matte tone",                isFree: false, comingSoon: false },
  { title: "cinematic gold",            isFree: false, comingSoon: false },
  { title: "misty forest",              isFree: false, comingSoon: false },
  { title: "aesthetic purple",          isFree: false, comingSoon: false },
  { title: "moody city",                isFree: false, comingSoon: false },
  { title: "deep cinematic",            isFree: false, comingSoon: false },
  { title: "clean",                     isFree: false, comingSoon: false },
  { title: "caramel",                   isFree: false, comingSoon: false },
  { title: "dark blue",                 isFree: false, comingSoon: false },
  { title: "aesthetic beige pink",      isFree: false, comingSoon: false },
  { title: "aesthetic nightvision",     isFree: false, comingSoon: false },
  { title: "red and white",             isFree: false, comingSoon: false },
  { title: "aesthetic beach",           isFree: false, comingSoon: false },
  { title: "magical sunset",            isFree: false, comingSoon: false },
  { title: "city grey",                 isFree: false, comingSoon: false },
  { title: "urban v2",                  isFree: false, comingSoon: false },
  { title: "aqua red",                  isFree: false, comingSoon: false },
  { title: "pastel beach",              isFree: false, comingSoon: false },
  { title: "fantasy lightroom",         isFree: false, comingSoon: false },
  { title: "motography v2",             isFree: false, comingSoon: false },
  { title: "moody green",               isFree: false, comingSoon: false },
  { title: "vibrant red",               isFree: false, comingSoon: false },
  { title: "cinematic street",          isFree: false, comingSoon: false },
  { title: "vintage blue",              isFree: false, comingSoon: false },
  { title: "brownish yellow",           isFree: false, comingSoon: false },
  { title: "garage",                    isFree: false, comingSoon: false },
  { title: "aesthetic selfie",          isFree: false, comingSoon: false },
  { title: "vintage car",               isFree: false, comingSoon: false },
  { title: "campfire",                  isFree: false, comingSoon: false },
  { title: "aesthetic mood",            isFree: false, comingSoon: false },
  { title: "arius",                     isFree: false, comingSoon: false },
  { title: "film green",                isFree: false, comingSoon: false },
  { title: "silhioutte",                isFree: false, comingSoon: false },
  { title: "cinematic car v1",          isFree: false, comingSoon: false },
  { title: "chocolate brown",           isFree: false, comingSoon: false },
  { title: "celestial",                 isFree: false, comingSoon: false },
  { title: "travel blogger",            isFree: false, comingSoon: false },
  { title: "riverdale",                 isFree: false, comingSoon: false },
  { title: "ig wanderlust",             isFree: false, comingSoon: false },
  { title: "new york",                  isFree: false, comingSoon: false },
  { title: "hodophile",                 isFree: false, comingSoon: false },
  { title: "blogger",                   isFree: false, comingSoon: false },
  { title: "retouch",                   isFree: false, comingSoon: false },
  { title: "black moody",               isFree: false, comingSoon: false },
  { title: "vanilla",                   isFree: false, comingSoon: false },
  { title: "indie",                     isFree: false, comingSoon: false },
  { title: "ruby",                      isFree: false, comingSoon: false },
  { title: "urban retro",               isFree: false, comingSoon: false },
  { title: "tempo",                     isFree: false, comingSoon: false },
  { title: "christmas",                 isFree: false, comingSoon: false },
  { title: "pastel tone",               isFree: false, comingSoon: false },
  { title: "golden sunrise",            isFree: false, comingSoon: false },
  { title: "faded street",              isFree: false, comingSoon: false },
  { title: "how to edit cinematic look",isFree: false, comingSoon: false },
  { title: "magical portrait",          isFree: false, comingSoon: false },
  { title: "soft orange ton",           isFree: false, comingSoon: false },
  { title: "vintage",                   isFree: false, comingSoon: false },
  { title: "red velvet",                isFree: false, comingSoon: false },
  { title: "anime",                     isFree: false, comingSoon: false },
  { title: "black and orange",          isFree: false, comingSoon: false },
  { title: "frozen",                    isFree: false, comingSoon: false },
  { title: "matte blue",                isFree: false, comingSoon: false },
  { title: "aqua sunset",               isFree: false, comingSoon: false },
  { title: "urban",                     isFree: false, comingSoon: false },
  { title: "moody red",                 isFree: false, comingSoon: false },
  { title: "grainy vintage",            isFree: false, comingSoon: false },
  { title: "cinematic blue",            isFree: false, comingSoon: false },
  { title: "portrait black and white",  isFree: false, comingSoon: false },
  { title: "urban classic",             isFree: false, comingSoon: false },
  { title: "moody brown",               isFree: false, comingSoon: false },
  { title: "moody night tone",          isFree: false, comingSoon: false },
  { title: "film faded",                isFree: false, comingSoon: false },
  { title: "bali",                      isFree: false, comingSoon: false },
  { title: "jordi koalitic",            isFree: false, comingSoon: false },
  { title: "dark grey tone",            isFree: false, comingSoon: false },
  { title: "cyberpunk",                 isFree: false, comingSoon: false },
  { title: "summer",                    isFree: false, comingSoon: false },
  { title: "rich black",                isFree: false, comingSoon: true  },
  { title: "deep sky tone",             isFree: false, comingSoon: false },
  { title: "bokeh light effect",        isFree: false, comingSoon: false },
  { title: "cream tone",                isFree: false, comingSoon: false },
  { title: "dark disposable camera",    isFree: false, comingSoon: false },
  { title: "black urban",               isFree: false, comingSoon: false },
  { title: "orange teal",               isFree: false, comingSoon: false },
  { title: "tokyo",                     isFree: false, comingSoon: false },
  { title: "dual tone",                 isFree: false, comingSoon: true  },
  { title: "light denim",               isFree: false, comingSoon: false },
  { title: "warm golden",               isFree: false, comingSoon: true  },
  { title: "motography",                isFree: false, comingSoon: false },
  { title: "urban steel",               isFree: false, comingSoon: false },
  { title: "adventure",                 isFree: false, comingSoon: false },
  { title: "film grey",                 isFree: false, comingSoon: false },
  { title: "dark black tone effect",    isFree: false, comingSoon: false },
  { title: "food blogger",              isFree: false, comingSoon: false },
]

const INDEX = new Map<string, PresetMeta>(
  PRESET_META.map((p) => [p.title.toLowerCase().trim(), p])
)

/** Returns public preset metadata matched case-insensitively by title. */
export function getPresetMeta(presetName: string): PresetMeta | null {
  return INDEX.get(presetName.toLowerCase().trim()) ?? null
}
