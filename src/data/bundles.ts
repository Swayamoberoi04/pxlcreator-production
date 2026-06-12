/**
 * src/data/bundles.ts
 *
 * PXL Creator — Premium Bundle Catalogue (7 distinct bundles)
 *
 * Bundle strategy:
 *   Each bundle targets a specific creator persona and shooting scenario.
 *   No two bundles overlap excessively — they serve clearly different audiences.
 *
 * Pricing logic:
 *   - Individual value = what you'd pay buying equivalent packs separately
 *   - Bundle discount: 55–74% off individual value (justified by volume)
 *   - Savings displayed prominently to encourage bundle-over-individual purchase
 *   - Entry bundle ($19) sits at Creator plan monthly price — creates subscription framing
 *   - Complete library ($79) anchors the top — makes mid bundles feel like bargains
 *
 * Bundle identity:
 *   1. Cinema Director   — cinematic YouTubers & filmmakers
 *   2. Film Lab          — film emulation & analogue aesthetics
 *   3. Portrait Master   — portrait & wedding photographers
 *   4. Creator Starter   — beginners & newcomers (entry bundle)
 *   5. Golden Lifestyle  — Instagram & lifestyle influencers
 *   6. Nature & Travel   — travel & outdoor photographers
 *   7. Complete Library  — serious creators who want everything
 *
 * Cart compatibility:
 *   Bundle extends Preset with category "Bundle" — works with the existing
 *   cart and checkout without any changes. No special handling needed.
 */

import type { Bundle } from "@/types/bundle"

export const ALL_BUNDLES: Bundle[] = [

  /* ─────────────────────────────────────────────────────────
     BUNDLE 1 — Cinema Director Bundle
     Target: YouTubers, filmmakers, cinematic content creators
     Individual value: $109 → Bundle: $39 (save 64%)
  ───────────────────────────────────────────────────────── */
  {
    id:            "bundle-001",
    slug:          "cinema-director-bundle",
    name:          "Cinema Director Bundle",
    tagline:       "40 presets. One cinematic signature.",
    description:   "The Cinema Director Bundle is the definitive collection for creators who want their work to look like it came out of a production house. We combined our most powerful cinematic looks — warm amber grades, rich shadow science, and teal-orange film pulls — into one cohesive 40-preset system. Whether you're shooting YouTube vlogs, short films, brand campaigns, or travel content, this bundle gives you a professional cinematic signature that's instantly recognisable.",
    whyCreatorsLoveIt: "Creators love this bundle because it solves the biggest editing problem: consistency. Every preset shares the same colour science and light response, so switching between looks feels intentional, not random. The tonal range is wide enough to cover golden-hour magic and overcast drama, but cohesive enough that your entire feed looks like one cinematic universe.",

    price:          39,
    originalPrice:  109,
    category:       "Bundle",
    isFeatured:     true,
    isFree:         false,
    includeCount:   40,
    thumbnailUrl:   "/presets/cinematic.webp",
    images:         ["/presets/cinematic1.webp", "/presets/cinematic2.webp", "/presets/cinematic3.webp"],
    beforeUrl:      "/presets/fr_before.webp",
    afterUrl:       "/presets/fr_after.webp",
    downloadFileName: "PXL_Cinema_Director_Bundle_v1.zip",

    features: [
      "40 hand-crafted cinematic presets",
      "Teal-orange & amber grade system",
      "Works on golden hour, overcast, and harsh light",
      "Includes .cube LUT exports for video editing",
      "Tested on Sony A7IV, Canon R5, Nikon Z8 RAW",
      "Lifetime access — free updates included",
    ],
    compatibility:  ["Lightroom Classic", "Lightroom CC", "Camera Raw", "DaVinci Resolve (LUT)"],
    aiTags:         ["cinematic", "warm", "teal", "orange", "golden", "dramatic", "rich", "film", "video", "youtube"],

    bundleBadge:         "BESTSELLER",
    individualValueUsd:  109,
    targetAudience: ["YouTubers", "Filmmakers", "Travel Creators", "Brand Photographers", "Content Creators"],
    useCases: ["YouTube", "Reels", "Travel", "Portraits", "Content Creation"],
    includedPacks: [
      { name: "Desert Gold Pack",         presetCount: 15, category: "Cinematic",      icon: "🌅", description: "Warm amber & golden-hour cinematic grades" },
      { name: "Cinematic Starter Bundle", presetCount: 10, category: "Cinematic",      icon: "🎬", description: "Versatile teal-orange cinematic baseline" },
      { name: "Golden Hour Portrait",     presetCount:  8, category: "Portrait",       icon: "✨", description: "Luminous golden skin-tone enhancement" },
      { name: "Warm Lifestyle Series",    presetCount:  7, category: "Cinematic",      icon: "🎥", description: "Clean warm grades for lifestyle & vlogs" },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     BUNDLE 2 — Film Lab Collection
     Target: Fine art photographers, vintage aesthetic creators
     Individual value: $79 → Bundle: $29 (save 63%)
  ───────────────────────────────────────────────────────── */
  {
    id:            "bundle-002",
    slug:          "film-lab-collection",
    name:          "Film Lab Collection",
    tagline:       "Five decades of film. One digital library.",
    description:   "The Film Lab Collection brings together the finest film emulation presets we've ever made — 55 individual looks spanning Kodachrome slide film, Kodak Portra portraiture, Fuji Velvia landscapes, and classic Ilford black-and-white. Each preset is built from scratch to recreate authentic grain structures, halation, and the characteristic colour science of each film stock. If you've always wanted your digital photos to feel like they were shot on real film, this is the only bundle you need.",
    whyCreatorsLoveIt: "Film emulation is having a major moment — and for good reason. These presets don't just add grain, they recreate the full optical character of each film stock. Photographers use this bundle to create editorial series with narrative depth, build consistent Instagram feeds with a retro-analogue identity, and produce wedding galleries that feel timeless rather than trend-dependent.",

    price:          29,
    originalPrice:  79,
    category:       "Bundle",
    isFeatured:     true,
    isFree:         false,
    includeCount:   55,
    thumbnailUrl:   "/presets/documentary1.webp",
    images:         ["/presets/documentary2.webp", "/presets/documentary3.webp", "/presets/fr1.webp"],
    beforeUrl:      "/presets/documentary_before.webp",
    afterUrl:       "/presets/documentary_after.webp",
    downloadFileName: "PXL_Film_Lab_Collection_v1.zip",

    features: [
      "55 film emulation presets across 8 stocks",
      "Authentic grain — not digital noise simulation",
      "Halation & bloom effects on highlights",
      "Kodachrome, Portra, Velvia, HP5 & more",
      "B&W and colour variants for each stock",
      "Mobile-optimised for Lightroom CC",
    ],
    compatibility:  ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
    aiTags:         ["film", "grain", "vintage", "analogue", "kodak", "fuji", "ilford", "retro", "fade", "nostalgic", "editorial"],

    bundleBadge:         "MOST POPULAR",
    individualValueUsd:  79,
    targetAudience: ["Fine Art Photographers", "Wedding Photographers", "Editorial Creators", "Instagram Aesthetic Builders"],
    useCases: ["Instagram", "Film Look", "Portraits", "Weddings", "Fashion"],
    includedPacks: [
      { name: "Film Emulation Bundle",  presetCount: 30, category: "Film Emulation", icon: "📷", description: "6 complete film stock emulations" },
      { name: "Kodak Chrome Pack",      presetCount: 15, category: "Film Emulation", icon: "🎞️", description: "Kodachrome-inspired punchy slide look" },
      { name: "Vintage B&W Series",     presetCount: 10, category: "Film Emulation", icon: "⬛", description: "Ilford HP5 & Tri-X black-and-white emulations" },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     BUNDLE 3 — Portrait Master Bundle
     Target: Portrait photographers, lifestyle influencers
     Individual value: $64 → Bundle: $24 (save 63%)
  ───────────────────────────────────────────────────────── */
  {
    id:            "bundle-003",
    slug:          "portrait-master-bundle",
    name:          "Portrait Master Bundle",
    tagline:       "Every skin tone. Every light. Every time.",
    description:   "Portrait editing is where most presets fail — skin tones break, shadows go muddy, and the warmth looks fake. The Portrait Master Bundle was built differently. Every single look was developed and tested across 200+ real portrait sessions on diverse skin tones. You get 30 presets that handle golden hour, studio strobe, window light, and harsh outdoor sun with equal grace. The shadows lift softly, the skin glows naturally, and the overall tone feels intentionally crafted — not filtered.",
    whyCreatorsLoveIt: "Skin-safe colour science is the difference between looking professional and looking amateur. This bundle uses a proprietary shadow-lift system that opens shadows without adding unwanted colour casts — something most presets get completely wrong. Portrait photographers report cutting their editing time in half after switching to these presets.",

    price:          24,
    originalPrice:  64,
    category:       "Bundle",
    isFeatured:     true,
    isFree:         false,
    includeCount:   30,
    thumbnailUrl:   "/presets/magical_sunset.webp",
    images:         ["/presets/ic1.webp", "/presets/ic2.webp", "/presets/ic3.webp"],
    beforeUrl:      "/presets/tropical_before.webp",
    afterUrl:       "/presets/tropical_after.webp",
    downloadFileName: "PXL_Portrait_Master_Bundle_v1.zip",

    features: [
      "30 portrait-specific presets",
      "Skin-safe tone mapping across all skin tones",
      "Tested across 200+ real portrait sessions",
      "Soft shadow lift with zero muddy casts",
      "Golden hour, studio, window & outdoor variants",
      "Works beautifully on couples, families & solo portraits",
    ],
    compatibility:  ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
    aiTags:         ["portrait", "skin", "warm", "golden", "soft", "natural", "lifestyle", "flattering", "couple", "glow"],

    bundleBadge:         "CREATOR FAVORITE",
    individualValueUsd:  64,
    targetAudience: ["Portrait Photographers", "Wedding Photographers", "Lifestyle Influencers", "Family Photographers"],
    useCases: ["Portraits", "Weddings", "Instagram", "Lifestyle", "Fashion"],
    includedPacks: [
      { name: "Sunset Portrait Pack",  presetCount: 10, category: "Portrait", icon: "🌇", description: "Warm skin with golden diffusion" },
      { name: "Golden Hour Portrait",  presetCount: 10, category: "Portrait", icon: "✨", description: "Magenta & amber luminosity" },
      { name: "Studio Light Series",   presetCount: 10, category: "Portrait", icon: "💡", description: "Clean, professional studio look" },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     BUNDLE 4 — Creator Starter Kit  ← ENTRY BUNDLE
     Target: Beginners, photographers just starting with presets
     Individual value: $58 → Bundle: $19 (save 67%)
     Positioned at the Creator plan monthly price for upsell framing
  ───────────────────────────────────────────────────────── */
  {
    id:            "bundle-005",
    slug:          "creator-starter-kit",
    name:          "Creator Starter Kit",
    tagline:       "The best first preset purchase you'll ever make.",
    description:   "New to Lightroom presets? The Creator Starter Kit is where to begin. We selected our most versatile, forgiving, and widely-loved looks — presets that work on portraits, landscapes, and travel photography without needing manual adjustment. 52 total presets, including the acclaimed Desert Gold Pack and Cinematic Starter Bundle, plus an exclusive beginner workflow guide. This bundle converts 'I'll fix it in post' photographers into 'I can't believe how fast I edit now' creators.",
    whyCreatorsLoveIt: "Most beginners make the mistake of buying highly stylised presets that only work in very specific conditions. The Creator Starter Kit is built for the opposite — broad compatibility and forgiving colour science that works across a huge range of shooting scenarios. You get the same cinematic quality as our advanced packs, just without the steep learning curve.",

    price:          19,
    originalPrice:  58,
    category:       "Bundle",
    isFeatured:     true,
    isFree:         false,
    includeCount:   52,
    thumbnailUrl:   "/presets/cinematic.webp",
    images:         ["/presets/cg.webp", "/presets/dark_blue.webp", "/presets/campfire.webp"],
    beforeUrl:      "/presets/fr_before.webp",
    afterUrl:       "/presets/fr_after.webp",
    downloadFileName: "PXL_Creator_Starter_Kit_v1.zip",

    features: [
      "52 versatile presets — portraits, landscapes & street",
      "Balanced tones that work without manual tweaking",
      "Includes 40-page beginner editing guide (PDF)",
      "Arctic Blue Pack included as FREE bonus",
      "Lightroom mobile-optimised for shooting on the go",
      "Best value entry point to PXL presets",
    ],
    compatibility:  ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
    aiTags:         ["beginner", "versatile", "balanced", "warm", "cinematic", "clean", "natural", "starter", "easy", "workflow"],

    bundleBadge:         "BEST VALUE",
    individualValueUsd:  58,
    targetAudience: ["Photography Beginners", "Hobbyist Creators", "Social Media Starters", "Lightroom Newcomers"],
    useCases: ["Instagram", "Reels", "Travel", "Portraits", "Content Creation"],
    includedPacks: [
      { name: "Cinematic Starter Bundle", presetCount: 25, category: "Cinematic",  icon: "🎬", description: "25 versatile cinematic looks for beginners" },
      { name: "Desert Gold Pack",         presetCount: 15, category: "Cinematic",  icon: "🌅", description: "Warm amber grades for any shooting condition" },
      { name: "Arctic Blue Pack",         presetCount: 12, category: "Landscape",  icon: "❄️",  description: "Free bonus — editorial cool landscapes" },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     BUNDLE 5 — Golden Lifestyle Bundle
     Target: Lifestyle creators, travel bloggers, Instagram influencers
     Individual value: $84 → Bundle: $29 (save 65%)
  ───────────────────────────────────────────────────────── */
  {
    id:            "bundle-006",
    slug:          "golden-lifestyle-bundle",
    name:          "Golden Lifestyle Bundle",
    tagline:       "Sun-drenched. Instagram-ready. Scroll-stopping.",
    description:   "The Golden Lifestyle Bundle is built for the creators who understand that warmth sells. Warm skin, warm light, warm atmosphere — the kind of images that make people stop scrolling and wish they were there. 45 presets across portrait, lifestyle, and golden-hour categories, all tuned to that specific honey-and-amber colour palette that consistently outperforms cooler tones on Instagram and Reels engagement metrics. If your brand is lifestyle, travel, fashion, or content creation, this is your signature pack.",
    whyCreatorsLoveIt: "Lifestyle photographers and Instagram influencers return to this bundle repeatedly because it produces consistent, on-brand results regardless of the shooting condition. The warmth feels natural — not orange — which is notoriously hard to achieve. Several of our users have built audiences of 100k+ using the Golden Lifestyle Bundle as their sole editing system.",

    price:          29,
    originalPrice:  84,
    category:       "Bundle",
    isFeatured:     true,
    isFree:         false,
    includeCount:   45,
    thumbnailUrl:   "/presets/campfire.webp",
    images:         ["/presets/magical_sunset.webp", "/presets/cg1.webp", "/presets/ic.webp"],
    beforeUrl:      "/presets/tropical_before.webp",
    afterUrl:       "/presets/tropical_after.webp",
    downloadFileName: "PXL_Golden_Lifestyle_Bundle_v1.zip",

    features: [
      "45 warm lifestyle & portrait presets",
      "Honey-amber golden hour palette",
      "Skin-safe — no orange cast on any skin tone",
      "Optimised for Reels & Instagram vertical formats",
      "Works on mobile Lightroom CC",
      "Consistent across portrait, landscape & flat-lay",
    ],
    compatibility:  ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
    aiTags:         ["golden", "warm", "lifestyle", "amber", "instagram", "reels", "influencer", "travel", "soft", "honey", "glow"],

    bundleBadge:         "TRENDING",
    individualValueUsd:  84,
    targetAudience: ["Instagram Influencers", "Lifestyle Creators", "Travel Bloggers", "Fashion Photographers", "Content Creators"],
    useCases: ["Instagram", "Reels", "Lifestyle", "Travel", "Fashion", "Content Creation"],
    includedPacks: [
      { name: "Desert Gold Pack",      presetCount: 15, category: "Cinematic", icon: "🌅", description: "Rich warm amber & sunset grades" },
      { name: "Sunset Portrait Pack",  presetCount: 10, category: "Portrait",  icon: "🌇", description: "Warm skin with golden diffusion" },
      { name: "Golden Hour Portrait",  presetCount: 10, category: "Portrait",  icon: "✨", description: "Luminous magenta & amber" },
      { name: "Warm Travel Series",    presetCount: 10, category: "Landscape", icon: "✈️", description: "Warm tones for any travel location" },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     BUNDLE 6 — Nature & Travel Kit
     Target: Travel photographers, outdoor creators, drone pilots
     Individual value: $63 → Bundle: $24 (save 62%)
  ───────────────────────────────────────────────────────── */
  {
    id:            "bundle-007",
    slug:          "nature-travel-kit",
    name:          "Nature & Travel Kit",
    tagline:       "From arctic tundra to tropical forests.",
    description:   "Travel and nature photography demands a toolkit that handles every environment on the planet — the blue-white tones of Iceland's coast, the deep emerald greens of tropical forests, the warm terracotta of Rajasthan, the muted film character of an overcast Scottish morning. The Nature & Travel Kit is that toolkit. 54 presets spanning cool editorial landscapes, atmospheric forest work, and analogue travel film looks, built to cover every destination a creator might visit.",
    whyCreatorsLoveIt: "Travel photographers tell us this bundle solves their biggest location challenge: colour inconsistency. Shooting across five countries in a week means wildly different light conditions — this kit handles all of them cohesively, so your travel series looks intentionally edited rather than colour-random. Drone pilots especially love the Arctic Blue Pack's aerial compatibility.",

    price:          24,
    originalPrice:  63,
    category:       "Bundle",
    isFeatured:     false,
    isFree:         false,
    includeCount:   54,
    thumbnailUrl:   "/presets/dark_blue.webp",
    images:         ["/presets/timber.webp", "/presets/hdrbw1.webp", "/presets/documentary1.webp"],
    beforeUrl:      "/presets/hdrbw_before.webp",
    afterUrl:       "/presets/hdrbw_after.webp",
    downloadFileName: "PXL_Nature_Travel_Kit_v1.zip",

    features: [
      "54 landscape, nature & travel presets",
      "Covers arctic, tropical, desert & forest environments",
      "Compatible with drone-shot RAW files",
      "Film-inspired travel looks for authentic feel",
      "Cool editorial & warm earthy variants",
      "Wide dynamic range handling for golden & blue hours",
    ],
    compatibility:  ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
    aiTags:         ["travel", "landscape", "nature", "outdoor", "drone", "forest", "arctic", "cool", "editorial", "adventure", "exploration"],

    bundleBadge:         "PRO LEVEL",
    individualValueUsd:  63,
    targetAudience: ["Travel Photographers", "Drone Pilots", "Nature Photographers", "Outdoor Content Creators", "Adventure Bloggers"],
    useCases: ["Travel", "Landscapes", "Drone", "Film Look", "Content Creation", "YouTube"],
    includedPacks: [
      { name: "Moody Forest Pack",      presetCount: 12, category: "Landscape",      icon: "🌲", description: "Deep atmospheric forest & woodland" },
      { name: "Arctic Blue Pack",       presetCount: 12, category: "Landscape",      icon: "❄️",  description: "Cool editorial — aerial & seascape" },
      { name: "Film Emulation Bundle",  presetCount: 30, category: "Film Emulation", icon: "📷",  description: "Analogue film looks for travel stories" },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     BUNDLE 7 — Complete PXL Library  ← ANCHOR / FLAGSHIP
     Target: Serious creators who want the full toolkit
     Individual value: $249 → Bundle: $79 (save 68%)
     Price anchor: makes all other bundles look like bargains
  ───────────────────────────────────────────────────────── */
  {
    id:            "bundle-008",
    slug:          "complete-pxl-library",
    name:          "Complete PXL Library",
    tagline:       "Every preset we've ever made. One price.",
    description:   "The Complete PXL Library is everything. All 110+ presets from every pack we've produced — cinematic, film emulation, portrait, street, landscape, lifestyle, and more — in a single download. This is the ultimate creator investment: a complete editing system that grows with you. Used by photographers who take their craft seriously and want a comprehensive toolkit ready for any commission, project, or personal series. Once you have the Complete Library, you'll never need to buy another preset pack.",
    whyCreatorsLoveIt: "Professional photographers who commission commercial work use this bundle because it gives them the confidence that whatever a client wants — warm and lifestyle, dark and editorial, film and nostalgic, clean and architectural — they have the exact look available without hunting through 50 different Lightroom folders. It's a complete professional editing system, not just a preset pack.",

    price:          79,
    originalPrice:  249,
    category:       "Bundle",
    isFeatured:     true,
    isFree:         false,
    includeCount:   110,
    thumbnailUrl:   "/presets/cinematic2.webp",
    images:         ["/presets/cg.webp", "/presets/documentary1.webp", "/presets/magical_sunset.webp", "/presets/dark_blue.webp"],
    beforeUrl:      "/presets/fr_before.webp",
    afterUrl:       "/presets/fr_after.webp",
    downloadFileName: "PXL_Complete_Library_v1.zip",

    features: [
      "110+ presets — our complete catalogue",
      "Cinematic, film, portrait, street & landscape",
      "Complete editing system for any shooting scenario",
      "Priority support included",
      "Lifetime updates — all future packs included FREE",
      "Commercial licence — use on client work",
    ],
    compatibility:  ["Lightroom Classic", "Lightroom CC", "Camera Raw", "DaVinci Resolve (LUT)"],
    aiTags:         ["complete", "all", "professional", "commercial", "everything", "ultimate", "library", "comprehensive", "system"],

    bundleBadge:         "BEST VALUE",
    individualValueUsd:  249,
    targetAudience: ["Professional Photographers", "Commercial Creators", "Agencies", "Full-Time Content Creators"],
    useCases: ["Instagram", "YouTube", "Reels", "Portraits", "Travel", "Weddings", "Film Look", "Lifestyle", "Content Creation"],
    includedPacks: [
      { name: "All Cinematic Packs",      presetCount: 40, category: "Cinematic",      icon: "🎬", description: "Every cinematic & golden-hour look" },
      { name: "All Film Emulation Packs", presetCount: 30, category: "Film Emulation", icon: "📷", description: "Complete analogue film collection" },
      { name: "All Portrait Packs",       presetCount: 20, category: "Portrait",       icon: "🌇", description: "Full skin-tone portrait system" },
      { name: "All Landscape Packs",      presetCount: 12, category: "Landscape",      icon: "🌲", description: "Every outdoor & travel look" },
      { name: "All Street Packs",         presetCount:  8, category: "Street",         icon: "🌆", description: "Urban noir & architectural grades" },
    ],
  },

]

export const FEATURED_BUNDLES = ALL_BUNDLES.filter((b) => b.isFeatured)
