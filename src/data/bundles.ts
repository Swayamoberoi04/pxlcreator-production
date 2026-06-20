/**
 * src/data/bundles.ts
 *
 * PXL Creator — Premium Bundle Catalogue (7 distinct bundles)
 *
 * Bundle strategy:
 *   Each bundle targets a specific creator persona and shooting scenario.
 *   No two bundles overlap excessively — they serve clearly different audiences.
 *
 * Pricing rules:
 *   - individualValueUsd = sum of includedPacks[].priceUsd (real preset prices only)
 *   - Bundle discount: 37–62% off individual value
 *   - Every includedPack MUST reference a real preset slug from src/data/presets.ts
 *   - No fictional packs, no placeholder names
 *
 * Bundle identity:
 *   1. Cinema Director   — cinematic YouTubers & filmmakers
 *   2. Film Lab          — film emulation & analogue aesthetics
 *   3. Portrait Master   — portrait & wedding photographers
 *   4. Creator Starter   — beginners & newcomers (entry bundle)
 *   5. Golden Lifestyle  — Instagram & lifestyle influencers
 *   6. Nature & Travel   — travel & outdoor photographers
 *   7. Complete Library  — serious creators who want everything
 */

import type { Bundle } from "@/types/bundle"

export const ALL_BUNDLES: Bundle[] = [

  /* ─────────────────────────────────────────────────────────
     BUNDLE 1 — Cinema Director Bundle
     Target: YouTubers, filmmakers, cinematic content creators
     Real individual value: $24.99 + $24.99 + $11.99 = $61.97
     Bundle price: $39 → save $22.97 (37%)
  ───────────────────────────────────────────────────────── */
  {
    id:            "bundle-001",
    slug:          "cinema-director-bundle",
    name:          "Cinema Director Bundle",
    tagline:       "50 presets. One cinematic signature.",
    description:   "The Cinema Director Bundle is the definitive collection for creators who want their work to look like it came out of a production house. We combined our most powerful cinematic looks — warm amber grades, rich shadow science, and luminous golden skin tones — into one cohesive 50-preset system. Whether you're shooting YouTube vlogs, short films, brand campaigns, or travel content, this bundle gives you a professional cinematic signature that's instantly recognisable.",
    whyCreatorsLoveIt: "Creators love this bundle because it solves the biggest editing problem: consistency. Every preset shares the same colour science and light response, so switching between looks feels intentional, not random. The tonal range is wide enough to cover golden-hour magic and overcast drama, but cohesive enough that your entire feed looks like one cinematic universe.",

    price:          39,
    originalPrice:  62,
    category:       "Bundle",
    isFeatured:     true,
    isFree:         false,
    includeCount:   50,
    thumbnailUrl:   "/presets/cinematic.webp",
    images:         ["/presets/cinematic1.webp", "/presets/cinematic2.webp", "/presets/cinematic3.webp"],
    beforeUrl:      "/presets/fr_before.webp",
    afterUrl:       "/presets/fr_after.webp",
    downloadFileName: "PXL_Cinema_Director_Bundle_v1.zip",

    features: [
      "50 hand-crafted cinematic presets",
      "Warm amber & golden-hour grade system",
      "Works on golden hour, overcast, and harsh light",
      "Luminous skin-safe portrait looks included",
      "Tested on Sony A7IV, Canon R5, Nikon Z8 RAW",
      "Lifetime access — free updates included",
    ],
    compatibility:  ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
    aiTags:         ["cinematic", "warm", "golden", "amber", "dramatic", "rich", "film", "video", "youtube"],

    bundleBadge:         "BESTSELLER",
    individualValueUsd:  61.97,
    targetAudience: ["YouTubers", "Filmmakers", "Travel Creators", "Brand Photographers", "Content Creators"],
    useCases: ["YouTube", "Reels", "Travel", "Portraits", "Content Creation"],
    includedPacks: [
      {
        name:        "Desert Gold Pack",
        slug:        "desert-gold-pack",
        priceUsd:    24.99,
        presetCount: 15,
        category:    "Cinematic",
        icon:        "🌅",
        description: "Warm amber & golden-hour cinematic grades",
      },
      {
        name:        "Cinematic Starter Bundle",
        slug:        "cinematic-starter-bundle",
        priceUsd:    24.99,
        presetCount: 25,
        category:    "Cinematic",
        icon:        "🎬",
        description: "25 versatile cinematic looks for any genre",
      },
      {
        name:        "Golden Hour Portrait",
        slug:        "golden-hour-portrait",
        priceUsd:    11.99,
        presetCount: 10,
        category:    "Portrait",
        icon:        "✨",
        description: "Luminous golden skin-tone enhancement",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     BUNDLE 2 — Film Lab Collection
     Target: Fine art photographers, vintage aesthetic creators
     Real individual value: $29.99 + $19.99 = $49.98
     Bundle price: $29 → save $20.98 (42%)
  ───────────────────────────────────────────────────────── */
  {
    id:            "bundle-002",
    slug:          "film-lab-collection",
    name:          "Film Lab Collection",
    tagline:       "Five decades of film. One digital library.",
    description:   "The Film Lab Collection brings together the finest film emulation presets we've ever made — 45 individual looks spanning Kodachrome slide film, Kodak Portra portraiture, Fuji Velvia landscapes, and classic Ilford black-and-white. Each preset is built from scratch to recreate authentic grain structures, halation, and the characteristic colour science of each film stock. If you've always wanted your digital photos to feel like they were shot on real film, this is the only bundle you need.",
    whyCreatorsLoveIt: "Film emulation is having a major moment — and for good reason. These presets don't just add grain, they recreate the full optical character of each film stock. Photographers use this bundle to create editorial series with narrative depth, build consistent Instagram feeds with a retro-analogue identity, and produce wedding galleries that feel timeless rather than trend-dependent.",

    price:          29,
    originalPrice:  50,
    category:       "Bundle",
    isFeatured:     true,
    isFree:         false,
    includeCount:   45,
    thumbnailUrl:   "/presets/documentary1.webp",
    images:         ["/presets/documentary2.webp", "/presets/documentary3.webp", "/presets/fr1.webp"],
    beforeUrl:      "/presets/documentary_before.webp",
    afterUrl:       "/presets/documentary_after.webp",
    downloadFileName: "PXL_Film_Lab_Collection_v1.zip",

    features: [
      "45 film emulation presets across 8 stocks",
      "Authentic grain — not digital noise simulation",
      "Halation & bloom effects on highlights",
      "Kodachrome, Portra, Velvia, HP5 & more",
      "B&W and colour variants for each stock",
      "Mobile-optimised for Lightroom CC",
    ],
    compatibility:  ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
    aiTags:         ["film", "grain", "vintage", "analogue", "kodak", "fuji", "ilford", "retro", "fade", "nostalgic", "editorial"],

    bundleBadge:         "MOST POPULAR",
    individualValueUsd:  49.98,
    targetAudience: ["Fine Art Photographers", "Wedding Photographers", "Editorial Creators", "Instagram Aesthetic Builders"],
    useCases: ["Instagram", "Film Look", "Portraits", "Weddings", "Fashion"],
    includedPacks: [
      {
        name:        "Film Emulation Bundle",
        slug:        "film-emulation-bundle",
        priceUsd:    29.99,
        presetCount: 30,
        category:    "Film Emulation",
        icon:        "📷",
        description: "6 complete film stock emulations",
      },
      {
        name:        "Kodak Chrome Pack",
        slug:        "kodak-chrome-pack",
        priceUsd:    19.99,
        presetCount: 15,
        category:    "Film Emulation",
        icon:        "🎞️",
        description: "Kodachrome-inspired punchy slide look",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     BUNDLE 3 — Portrait Master Bundle
     Target: Portrait photographers, lifestyle influencers
     Real individual value: $12.99 + $11.99 + $7.99 = $32.97
     Bundle price: $18 → save $14.97 (45%)
  ───────────────────────────────────────────────────────── */
  {
    id:            "bundle-003",
    slug:          "portrait-master-bundle",
    name:          "Portrait Master Bundle",
    tagline:       "Every skin tone. Every light. Every time.",
    description:   "Portrait editing is where most presets fail — skin tones break, shadows go muddy, and the warmth looks fake. The Portrait Master Bundle was built differently. Every single look was developed and tested across 200+ real portrait sessions on diverse skin tones. You get 28 presets that handle golden hour, studio strobe, window light, and harsh outdoor sun with equal grace. The shadows lift softly, the skin glows naturally, and the overall tone feels intentionally crafted — not filtered.",
    whyCreatorsLoveIt: "Skin-safe colour science is the difference between looking professional and looking amateur. This bundle uses a proprietary shadow-lift system that opens shadows without adding unwanted colour casts — something most presets get completely wrong. Portrait photographers report cutting their editing time in half after switching to these presets.",

    price:          18,
    originalPrice:  33,
    category:       "Bundle",
    isFeatured:     true,
    isFree:         false,
    includeCount:   28,
    thumbnailUrl:   "/presets/magical_sunset.webp",
    images:         ["/presets/ic1.webp", "/presets/ic2.webp", "/presets/ic3.webp"],
    beforeUrl:      "/presets/tropical_before.webp",
    afterUrl:       "/presets/tropical_after.webp",
    downloadFileName: "PXL_Portrait_Master_Bundle_v1.zip",

    features: [
      "28 portrait-specific presets across 3 packs",
      "Skin-safe tone mapping across all skin tones",
      "Tested across 200+ real portrait sessions",
      "Soft shadow lift with zero muddy casts",
      "Golden hour, studio, window & outdoor variants",
      "Works beautifully on couples, families & solo portraits",
    ],
    compatibility:  ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
    aiTags:         ["portrait", "skin", "warm", "golden", "soft", "natural", "lifestyle", "flattering", "couple", "glow"],

    bundleBadge:         "CREATOR FAVORITE",
    individualValueUsd:  32.97,
    targetAudience: ["Portrait Photographers", "Wedding Photographers", "Lifestyle Influencers", "Family Photographers"],
    useCases: ["Portraits", "Weddings", "Instagram", "Lifestyle", "Fashion"],
    includedPacks: [
      {
        name:        "Sunset Portrait Pack",
        slug:        "sunset-portrait-pack",
        priceUsd:    12.99,
        presetCount: 10,
        category:    "Portrait",
        icon:        "🌇",
        description: "Warm skin with golden diffusion",
      },
      {
        name:        "Golden Hour Portrait",
        slug:        "golden-hour-portrait",
        priceUsd:    11.99,
        presetCount: 10,
        category:    "Portrait",
        icon:        "✨",
        description: "Magenta & amber luminosity",
      },
      {
        name:        "Studio Glow Starter",
        slug:        "studio-glow-starter",
        priceUsd:    7.99,
        presetCount: 8,
        category:    "Portrait",
        icon:        "💡",
        description: "Clean, professional studio look",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     BUNDLE 4 — Creator Starter Kit  ← ENTRY BUNDLE
     Target: Beginners, photographers just starting with presets
     Real individual value: $24.99 + $24.99 + $0 (free) = $49.98
     Bundle price: $19 → save $30.98 (62%)
  ───────────────────────────────────────────────────────── */
  {
    id:            "bundle-005",
    slug:          "creator-starter-kit",
    name:          "Creator Starter Kit",
    tagline:       "The best first preset purchase you'll ever make.",
    description:   "New to Lightroom presets? The Creator Starter Kit is where to begin. We selected our most versatile, forgiving, and widely-loved looks — presets that work on portraits, landscapes, and travel photography without needing manual adjustment. 52 total presets, including the acclaimed Desert Gold Pack and Cinematic Starter Bundle, plus the Arctic Blue Pack as a free bonus. This bundle converts 'I'll fix it in post' photographers into 'I can't believe how fast I edit now' creators.",
    whyCreatorsLoveIt: "Most beginners make the mistake of buying highly stylised presets that only work in very specific conditions. The Creator Starter Kit is built for the opposite — broad compatibility and forgiving colour science that works across a huge range of shooting scenarios. You get the same cinematic quality as our advanced packs, just without the steep learning curve.",

    price:          19,
    originalPrice:  50,
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
      "Arctic Blue Pack included as FREE bonus (12 presets)",
      "Lightroom mobile-optimised for shooting on the go",
      "Best value entry point to PXL presets",
    ],
    compatibility:  ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
    aiTags:         ["beginner", "versatile", "balanced", "warm", "cinematic", "clean", "natural", "starter", "easy", "workflow"],

    bundleBadge:         "BEST VALUE",
    individualValueUsd:  49.98,
    targetAudience: ["Photography Beginners", "Hobbyist Creators", "Social Media Starters", "Lightroom Newcomers"],
    useCases: ["Instagram", "Reels", "Travel", "Portraits", "Content Creation"],
    includedPacks: [
      {
        name:        "Cinematic Starter Bundle",
        slug:        "cinematic-starter-bundle",
        priceUsd:    24.99,
        presetCount: 25,
        category:    "Cinematic",
        icon:        "🎬",
        description: "25 versatile cinematic looks for beginners",
      },
      {
        name:        "Desert Gold Pack",
        slug:        "desert-gold-pack",
        priceUsd:    24.99,
        presetCount: 15,
        category:    "Cinematic",
        icon:        "🌅",
        description: "Warm amber grades for any shooting condition",
      },
      {
        name:        "Arctic Blue Pack",
        slug:        "arctic-blue-pack",
        priceUsd:    0,
        presetCount: 12,
        category:    "Landscape",
        icon:        "❄️",
        description: "Free bonus — editorial cool landscapes",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     BUNDLE 5 — Golden Lifestyle Bundle
     Target: Lifestyle creators, travel bloggers, Instagram influencers
     Real individual value: $24.99 + $12.99 + $11.99 = $49.97
     Bundle price: $29 → save $20.97 (42%)
  ───────────────────────────────────────────────────────── */
  {
    id:            "bundle-006",
    slug:          "golden-lifestyle-bundle",
    name:          "Golden Lifestyle Bundle",
    tagline:       "Sun-drenched. Instagram-ready. Scroll-stopping.",
    description:   "The Golden Lifestyle Bundle is built for the creators who understand that warmth sells. Warm skin, warm light, warm atmosphere — the kind of images that make people stop scrolling and wish they were there. 35 presets across portrait and golden-hour categories, all tuned to that specific honey-and-amber colour palette that consistently outperforms cooler tones on Instagram and Reels engagement metrics. If your brand is lifestyle, travel, fashion, or content creation, this is your signature pack.",
    whyCreatorsLoveIt: "Lifestyle photographers and Instagram influencers return to this bundle repeatedly because it produces consistent, on-brand results regardless of the shooting condition. The warmth feels natural — not orange — which is notoriously hard to achieve. Several of our users have built audiences of 100k+ using the Golden Lifestyle Bundle as their sole editing system.",

    price:          29,
    originalPrice:  50,
    category:       "Bundle",
    isFeatured:     true,
    isFree:         false,
    includeCount:   35,
    thumbnailUrl:   "/presets/campfire.webp",
    images:         ["/presets/magical_sunset.webp", "/presets/cg1.webp", "/presets/ic.webp"],
    beforeUrl:      "/presets/tropical_before.webp",
    afterUrl:       "/presets/tropical_after.webp",
    downloadFileName: "PXL_Golden_Lifestyle_Bundle_v1.zip",

    features: [
      "35 warm lifestyle & portrait presets",
      "Honey-amber golden hour palette",
      "Skin-safe — no orange cast on any skin tone",
      "Optimised for Reels & Instagram vertical formats",
      "Works on mobile Lightroom CC",
      "Consistent across portrait, landscape & flat-lay",
    ],
    compatibility:  ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
    aiTags:         ["golden", "warm", "lifestyle", "amber", "instagram", "reels", "influencer", "travel", "soft", "honey", "glow"],

    bundleBadge:         "TRENDING",
    individualValueUsd:  49.97,
    targetAudience: ["Instagram Influencers", "Lifestyle Creators", "Travel Bloggers", "Fashion Photographers", "Content Creators"],
    useCases: ["Instagram", "Reels", "Lifestyle", "Travel", "Fashion", "Content Creation"],
    includedPacks: [
      {
        name:        "Desert Gold Pack",
        slug:        "desert-gold-pack",
        priceUsd:    24.99,
        presetCount: 15,
        category:    "Cinematic",
        icon:        "🌅",
        description: "Rich warm amber & sunset grades",
      },
      {
        name:        "Sunset Portrait Pack",
        slug:        "sunset-portrait-pack",
        priceUsd:    12.99,
        presetCount: 10,
        category:    "Portrait",
        icon:        "🌇",
        description: "Warm skin with golden diffusion",
      },
      {
        name:        "Golden Hour Portrait",
        slug:        "golden-hour-portrait",
        priceUsd:    11.99,
        presetCount: 10,
        category:    "Portrait",
        icon:        "✨",
        description: "Luminous magenta & amber",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     BUNDLE 6 — Nature & Travel Kit
     Target: Travel photographers, outdoor creators, drone pilots
     Real individual value: $11.99 + $0 + $29.99 = $41.98
     Bundle price: $24 → save $17.98 (43%)
  ───────────────────────────────────────────────────────── */
  {
    id:            "bundle-007",
    slug:          "nature-travel-kit",
    name:          "Nature & Travel Kit",
    tagline:       "From arctic tundra to tropical forests.",
    description:   "Travel and nature photography demands a toolkit that handles every environment on the planet — the blue-white tones of Iceland's coast, the deep emerald greens of tropical forests, the warm terracotta of Rajasthan, the muted film character of an overcast Scottish morning. The Nature & Travel Kit is that toolkit. 54 presets spanning cool editorial landscapes, atmospheric forest work, and analogue travel film looks, built to cover every destination a creator might visit.",
    whyCreatorsLoveIt: "Travel photographers tell us this bundle solves their biggest location challenge: colour inconsistency. Shooting across five countries in a week means wildly different light conditions — this kit handles all of them cohesively, so your travel series looks intentionally edited rather than colour-random. Drone pilots especially love the Arctic Blue Pack's aerial compatibility.",

    price:          24,
    originalPrice:  42,
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
      "Arctic Blue Pack included as FREE bonus",
    ],
    compatibility:  ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
    aiTags:         ["travel", "landscape", "nature", "outdoor", "drone", "forest", "arctic", "cool", "editorial", "adventure", "exploration"],

    bundleBadge:         "PRO LEVEL",
    individualValueUsd:  41.98,
    targetAudience: ["Travel Photographers", "Drone Pilots", "Nature Photographers", "Outdoor Content Creators", "Adventure Bloggers"],
    useCases: ["Travel", "Landscapes", "Drone", "Film Look", "Content Creation", "YouTube"],
    includedPacks: [
      {
        name:        "Moody Forest Pack",
        slug:        "moody-forest-pack",
        priceUsd:    11.99,
        presetCount: 12,
        category:    "Landscape",
        icon:        "🌲",
        description: "Deep atmospheric forest & woodland",
      },
      {
        name:        "Arctic Blue Pack",
        slug:        "arctic-blue-pack",
        priceUsd:    0,
        presetCount: 12,
        category:    "Landscape",
        icon:        "❄️",
        description: "Free bonus — cool editorial aerial & seascape",
      },
      {
        name:        "Film Emulation Bundle",
        slug:        "film-emulation-bundle",
        priceUsd:    29.99,
        presetCount: 30,
        category:    "Film Emulation",
        icon:        "📷",
        description: "Analogue film looks for travel stories",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     BUNDLE 7 — Complete PXL Library  ← ANCHOR / FLAGSHIP
     Target: Serious creators who want the full toolkit
     Real individual value: sum of all 10 paid presets = $167.90
     Bundle price: $79 → save $88.90 (53%)
  ───────────────────────────────────────────────────────── */
  {
    id:            "bundle-008",
    slug:          "complete-pxl-library",
    name:          "Complete PXL Library",
    tagline:       "Every preset we've ever made. One price.",
    description:   "The Complete PXL Library is everything. All 110+ presets from every pack we've produced — cinematic, film emulation, portrait, street, landscape, lifestyle, and more — in a single download. This is the ultimate creator investment: a complete editing system that grows with you. Used by photographers who take their craft seriously and want a comprehensive toolkit ready for any commission, project, or personal series. Once you have the Complete Library, you'll never need to buy another preset pack.",
    whyCreatorsLoveIt: "Professional photographers who commission commercial work use this bundle because it gives them the confidence that whatever a client wants — warm and lifestyle, dark and editorial, film and nostalgic, clean and architectural — they have the exact look available without hunting through 50 different Lightroom folders. It's a complete professional editing system, not just a preset pack.",

    price:          79,
    originalPrice:  168,
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
    compatibility:  ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
    aiTags:         ["complete", "all", "professional", "commercial", "everything", "ultimate", "library", "comprehensive", "system"],

    bundleBadge:         "BEST VALUE",
    individualValueUsd:  167.90,
    targetAudience: ["Professional Photographers", "Commercial Creators", "Agencies", "Full-Time Content Creators"],
    useCases: ["Instagram", "YouTube", "Reels", "Portraits", "Travel", "Weddings", "Film Look", "Lifestyle", "Content Creation"],
    includedPacks: [
      {
        name:        "Desert Gold Pack",
        slug:        "desert-gold-pack",
        priceUsd:    24.99,
        presetCount: 15,
        category:    "Cinematic",
        icon:        "🌅",
        description: "Warm amber & golden-hour cinematic grades",
      },
      {
        name:        "Cinematic Starter Bundle",
        slug:        "cinematic-starter-bundle",
        priceUsd:    24.99,
        presetCount: 25,
        category:    "Cinematic",
        icon:        "🎬",
        description: "25 versatile cinematic looks for every genre",
      },
      {
        name:        "Film Emulation Bundle",
        slug:        "film-emulation-bundle",
        priceUsd:    29.99,
        presetCount: 30,
        category:    "Film Emulation",
        icon:        "📷",
        description: "Complete analogue film collection",
      },
      {
        name:        "Kodak Chrome Pack",
        slug:        "kodak-chrome-pack",
        priceUsd:    19.99,
        presetCount: 15,
        category:    "Film Emulation",
        icon:        "🎞️",
        description: "Kodachrome-inspired punchy slide look",
      },
      {
        name:        "Sunset Portrait Pack",
        slug:        "sunset-portrait-pack",
        priceUsd:    12.99,
        presetCount: 10,
        category:    "Portrait",
        icon:        "🌇",
        description: "Full skin-tone portrait system",
      },
      {
        name:        "Golden Hour Portrait",
        slug:        "golden-hour-portrait",
        priceUsd:    11.99,
        presetCount: 10,
        category:    "Portrait",
        icon:        "✨",
        description: "Luminous magenta & amber portrait looks",
      },
      {
        name:        "Studio Glow Starter",
        slug:        "studio-glow-starter",
        priceUsd:    7.99,
        presetCount: 8,
        category:    "Portrait",
        icon:        "💡",
        description: "Professional studio lighting look",
      },
      {
        name:        "Moody Forest Pack",
        slug:        "moody-forest-pack",
        priceUsd:    11.99,
        presetCount: 12,
        category:    "Landscape",
        icon:        "🌲",
        description: "Every outdoor & forest look",
      },
      {
        name:        "Urban Noir Pack",
        slug:        "urban-noir-pack",
        priceUsd:    14.99,
        presetCount: 12,
        category:    "Street",
        icon:        "🌆",
        description: "Urban noir & architectural grades",
      },
      {
        name:        "Urban Daylight Pack",
        slug:        "urban-daylight-pack",
        priceUsd:    7.99,
        presetCount: 8,
        category:    "Street",
        icon:        "🏙️",
        description: "Bold street photography for harsh daylight",
      },
    ],
  },

]

export const FEATURED_BUNDLES = ALL_BUNDLES.filter((b) => b.isFeatured)
