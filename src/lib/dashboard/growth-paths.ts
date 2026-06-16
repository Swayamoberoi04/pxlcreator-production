/**
 * src/lib/dashboard/growth-paths.ts
 *
 * Growth path content library. Each path is a structured 6-stage roadmap
 * with real, actionable tasks. Paths are matched to users via affinity scoring
 * (same dot-product system as the recommendation engine).
 *
 * Paths are defined here as constants — no DB rows needed.
 * Only user progress (stage/task completion) is stored in DB.
 */

import type { CategoryAffinities } from "@/types/onboarding"

export type TaskType = "read" | "watch" | "practice" | "create" | "share" | "connect"

export interface GrowthPathTask {
  id:                string
  title:             string
  description:       string
  estimatedMinutes:  number
  type:              TaskType
  resource?:         { title: string; url: string }
  presetRecommended?: string  // preset slug to use for this task
}

export interface GrowthPathStage {
  index:       number   // 0-based
  title:       string
  description: string
  tasks:       GrowthPathTask[]
  badge?:      string   // unlocked on stage completion
  skillsGained: string[]
}

export interface GrowthPath {
  id:              string
  title:           string
  tagline:         string
  description:     string
  difficulty:      "beginner" | "intermediate" | "advanced"
  estimatedWeeks:  number
  badge:           string
  color:           string
  icon:            string
  totalStages:     number
  affinities:      Partial<CategoryAffinities>  // for dot-product matching
  stages:          GrowthPathStage[]
}

/* ── Cinematic Filmmaker Path ────────────────────────────────── */
const cinematicFilmmakerPath: GrowthPath = {
  id:             "cinematic-filmmaker",
  title:          "Cinematic Filmmaker Path",
  tagline:        "From preset to production — build your visual brand as a filmmaker.",
  description:    "A complete 6-stage journey taking you from Lightroom basics to booking paid color grading clients. Built for videographers, filmmakers, and cinematic editors who want to turn their aesthetic eye into a career.",
  difficulty:     "intermediate",
  estimatedWeeks: 8,
  badge:          "Certified Colorist",
  color:          "#c2855a",
  icon:           "🎬",
  totalStages:    6,
  affinities:     { cinematic: 0.9, film: 0.8, dark_luxury: 0.6, commercial: 0.4 },
  stages: [
    {
      index:       0,
      title:       "Color Foundation",
      description: "Build the theoretical and practical foundation every colorist needs. Understand the tools before you master them.",
      skillsGained: ["Color theory", "Histogram reading", "Preset workflow"],
      tasks: [
        {
          id:               "cf-t1",
          title:            "Read: Color Theory for Filmmakers",
          description:      "Study the color wheel, complementary pairings, and how mood connects to hue. Focus on how Hollywood cinematographers use color intentionally — teal-orange, split-toning, and desaturation for drama.",
          estimatedMinutes: 30,
          type:             "read",
          resource:         { title: "Film Color Theory Guide", url: "/blog/color-theory-filmmakers" },
        },
        {
          id:               "cf-t2",
          title:            "Watch: DaVinci Resolve Interface Tour",
          description:      "Learn the Color page layout in Resolve: the node tree, the color wheels, the curves, and how they connect. Even if you use Lightroom/Premiere, understanding Resolve's logic makes you a better editor everywhere.",
          estimatedMinutes: 45,
          type:             "watch",
          resource:         { title: "Resolve Color Page Tour", url: "/courses/color-grading" },
        },
        {
          id:               "cf-t3",
          title:            "Practice: Install Your Moody Cinematic Preset Pack",
          description:      "Download and install the Moody Cinematic Bundle. Apply each preset to a test photo and write down what you notice: where are the shadows pushed? What colour sits in the highlights? What's the contrast curve shape?",
          estimatedMinutes: 20,
          type:             "practice",
          presetRecommended: "moody-cinematic-bundle",
        },
        {
          id:               "cf-t4",
          title:            "Create: Grade Your First Cinematic Still",
          description:      "Take any photo and grade it using what you've learned. Apply a cinematic preset as a starting point, then manually adjust the tone curve and HSL sliders to push the grade further. Compare before/after and save it.",
          estimatedMinutes: 35,
          type:             "create",
        },
      ],
    },
    {
      index:       1,
      title:       "Cinematic Color Science",
      description: "Go deep into the technical mechanics of cinematic colour. Log footage, LUTs, and the science behind the teal-orange look.",
      skillsGained: ["Log footage handling", "LUT application", "HSL masking", "Secondary corrections"],
      badge:       "Color Scientist",
      tasks: [
        {
          id:               "cf-t5",
          title:            "Read: Log Footage, Gamma, and Why LUTs Exist",
          description:      "Understand why cameras shoot in Log/S-Log and why that footage looks flat and washed out. Learn how a Technical LUT converts to a viewing space, and how a Creative LUT adds the look on top.",
          estimatedMinutes: 35,
          type:             "read",
          resource:         { title: "Log Footage Explained", url: "/blog/log-footage-luts" },
        },
        {
          id:               "cf-t6",
          title:            "Practice: Apply the Cinema Grade LUT Pack to 3 Different Scenes",
          description:      "Take 3 different pieces of footage (or photos) with different lighting — bright day exterior, indoor tungsten, and golden hour. Apply the same cinema LUT to all three and observe how it shifts differently in each condition. Adjust intensity.",
          estimatedMinutes: 40,
          type:             "practice",
          presetRecommended: "cinema-lut-pack",
        },
        {
          id:               "cf-t7",
          title:            "Watch: Advanced HSL Masking for Skin and Sky",
          description:      "Learn to use Lightroom or Resolve's HSL panel to target specific colour ranges for secondary correction. The technique: isolate sky blues to control saturation independently of skin, then use Luminance masking to dodge highlights without blowing them out.",
          estimatedMinutes: 40,
          type:             "watch",
          resource:         { title: "HSL Masking Masterclass", url: "/courses/color-grading" },
        },
        {
          id:               "cf-t8",
          title:            "Create: Build Your Signature Cinematic Look",
          description:      "Using everything you've learned, create a custom Lightroom preset or Resolve PowerGrade that represents YOUR cinematic vision. Name it, save it, and export it. This will be the foundation of your visual brand.",
          estimatedMinutes: 60,
          type:             "create",
        },
      ],
    },
    {
      index:       2,
      title:       "First Cinematic Edit",
      description: "Take a real piece of footage through a complete cinematic grade from start to final export. Your first portfolio-ready piece.",
      skillsGained: ["End-to-end grading workflow", "Noise reduction", "Export mastery", "Client-ready delivery"],
      tasks: [
        {
          id:               "cf-t9",
          title:            "Select and Prepare Your Footage",
          description:      "Choose a 60–90 second clip — ideally footage from a meaningful moment, travel trip, or short narrative sequence. Import it into Resolve or Premiere, cut the best moments together into a rough assembly.",
          estimatedMinutes: 20,
          type:             "practice",
        },
        {
          id:               "cf-t10",
          title:            "Apply Primary Grade",
          description:      "Work with your custom look or the Cinema LUT Pack as a primary foundation. Balance exposure, correct white balance, and apply your creative look. Work on nodes in Resolve (Node 1: balance, Node 2: look, Node 3: final polish).",
          estimatedMinutes: 30,
          type:             "create",
          presetRecommended: "cinema-lut-pack",
        },
        {
          id:               "cf-t11",
          title:            "Secondary Corrections and Polish",
          description:      "Use qualifier tools to isolate and refine skin tones if people are in the shot. Use power windows (masks) to darken edges for a cinematic vignette. Add film grain via the effects panel for texture. Final check: skin, shadows, highlights.",
          estimatedMinutes: 35,
          type:             "practice",
        },
        {
          id:               "cf-t12",
          title:            "Export, Review, and Upload to Showcase",
          description:      "Export at H.264 4K or 1080p for web. Watch on a calibrated or well-lit screen. Then upload a still frame from the grade to your PXL Creator Showcase with a description of your creative intent and tools used.",
          estimatedMinutes: 25,
          type:             "share",
          resource:         { title: "Export Settings Guide", url: "/blog/export-settings" },
        },
      ],
    },
    {
      index:       3,
      title:       "Portfolio of 3",
      description: "Build a portfolio of 3 complete, showcase-quality cinematic edits across different scenarios. Prove your range.",
      skillsGained: ["Style consistency", "Portfolio curation", "Creative brief execution", "Self-direction"],
      badge:       "Portfolio Builder",
      tasks: [
        {
          id:               "cf-t13",
          title:            "Edit 1: Urban/Street Cinematic",
          description:      "Grade a street or urban scene. Target: high contrast, desaturated background with one colour pop (neon sign, red jacket). Think Blade Runner or Drive for reference. 60–90 seconds of finished video.",
          estimatedMinutes: 75,
          type:             "create",
          presetRecommended: "street-urban-grit",
        },
        {
          id:               "cf-t14",
          title:            "Edit 2: Nature/Landscape Cinematic",
          description:      "Grade a landscape or nature sequence. Target: golden, warm, film-emulation aesthetic. Reference: any National Geographic documentary. Focus on matching the grade to the golden hour or blue hour light.",
          estimatedMinutes: 75,
          type:             "create",
          presetRecommended: "travel-documentary-luts",
        },
        {
          id:               "cf-t15",
          title:            "Edit 3: Narrative/Documentary Scene",
          description:      "Grade a scene with a person or a story element. This could be a short documentary moment, a monologue, or a day-in-the-life sequence. The grade should support the emotional tone of what's being communicated.",
          estimatedMinutes: 75,
          type:             "create",
          presetRecommended: "moody-cinematic-bundle",
        },
        {
          id:               "cf-t16",
          title:            "Build Your Portfolio Page",
          description:      "Compile your 3 edits into a single portfolio page — whether on your personal website, Behance, or PXL Showcase. Write a brief creative statement (3–4 sentences) about your colour philosophy. This is what you'll send to clients.",
          estimatedMinutes: 60,
          type:             "share",
        },
      ],
    },
    {
      index:       4,
      title:       "Collaborate",
      description: "Take your skills into the creative community. Connect with other filmmakers, offer free grades to build relationships, and get your first client feedback.",
      skillsGained: ["Client communication", "Creative briefing", "Collaboration", "Feedback integration"],
      tasks: [
        {
          id:               "cf-t17",
          title:            "Join the Cinematography Space on PXL Community",
          description:      "Introduce yourself in the PXL Creator Cinematography space. Post your portfolio link and say what kind of projects you're looking to collaborate on. Read through recent posts and comment on at least 3 other creators' work.",
          estimatedMinutes: 20,
          type:             "connect",
          resource:         { title: "Community Hub", url: "/community" },
        },
        {
          id:               "cf-t18",
          title:            "Offer 1 Free Grade to a Local Creator",
          description:      "Find a videographer or filmmaker in your area (Instagram, local Facebook groups, film schools) who is posting work you like. Offer a free colour grade of one of their projects in exchange for feedback and a testimonial. This is not about money — it's about experience and relationships.",
          estimatedMinutes: 60,
          type:             "connect",
        },
        {
          id:               "cf-t19",
          title:            "Apply to 1 Short Film Project",
          description:      "Search the PXL Creator Projects section or a local film forum for a short film seeking a colorist. Apply with your portfolio page and a brief 3-sentence message about why you're right for their project.",
          estimatedMinutes: 30,
          type:             "connect",
          resource:         { title: "Projects Marketplace", url: "/community/projects" },
        },
      ],
    },
    {
      index:       5,
      title:       "Monetize Your Craft",
      description: "Convert your skills into a service business. Set rates, build a client pipeline, and deliver professional results that get repeat bookings.",
      skillsGained: ["Pricing strategy", "Client management", "Service packaging", "Business fundamentals"],
      badge:       "Pro Colorist",
      tasks: [
        {
          id:               "cf-t20",
          title:            "Research and Set Your Color Grading Rates",
          description:      "Research what colorists charge in your market: beginner colorists typically charge $50–150/min of finished video; experienced colorists charge $200–500/min. Set your starting rates at the lower end and build toward market rate with each testimonial you earn.",
          estimatedMinutes: 30,
          type:             "read",
          resource:         { title: "Pricing Guide for Colorists", url: "/blog/color-grading-pricing" },
        },
        {
          id:               "cf-t21",
          title:            "Create a Professional Service Page",
          description:      "Build a single page (on your site or as a PDF) listing: your services (per-minute, per-project, or day rate), your turnaround time, your deliverables, your reference looks, and your contact info. Include 2–3 before/after examples.",
          estimatedMinutes: 90,
          type:             "create",
        },
        {
          id:               "cf-t22",
          title:            "Pitch 3 Local Video Production Companies",
          description:      "Find 3 local video production companies on LinkedIn, Instagram, or Google. Send a personalised email (not a template) referencing their specific work and explaining how your colour grading could elevate their output. Attach your service page.",
          estimatedMinutes: 60,
          type:             "connect",
        },
        {
          id:               "cf-t23",
          title:            "List on Creative Freelance Platforms",
          description:      "Create profiles on Contra, Fiverr Pro, or Upwork for colour grading services. Use your portfolio visuals, set competitive rates, and write a profile that speaks specifically to the clients you want (wedding films, brand video, documentary).",
          estimatedMinutes: 60,
          type:             "share",
          resource:         { title: "Freelance Platform Guide", url: "/blog/photography-business" },
        },
      ],
    },
  ],
}

/* ── Portrait Master Path ────────────────────────────────────── */
const portraitMasterPath: GrowthPath = {
  id:             "portrait-master",
  title:          "Portrait Master Path",
  tagline:        "From natural-light amateur to client-booking portrait professional.",
  description:    "A 6-stage journey from understanding camera basics for portraits to running a booked-out portrait photography business. Designed for photographers who want to shoot beautiful people and build a brand around it.",
  difficulty:     "beginner",
  estimatedWeeks: 10,
  badge:          "Portrait Professional",
  color:          "#e8a87c",
  icon:           "📸",
  totalStages:    6,
  affinities:     { portrait: 0.9, fashion: 0.6, editorial: 0.5, minimal: 0.4 },
  stages: [
    {
      index:       0,
      title:       "Portrait Foundations",
      description: "Master the technical fundamentals: camera settings, prime lens selection, and basic natural light positioning that creates flattering portraits every time.",
      skillsGained: ["Aperture and depth of field", "Prime lens selection", "Subject direction basics"],
      tasks: [
        {
          id:               "pm-t1",
          title:            "Read: Camera Settings for Flattering Portraits",
          description:      "Learn the portrait triangle: aperture f/1.4–f/2.8 for background separation, shutter speed 1/200s minimum to freeze motion, ISO as low as possible. Understand why a 50mm–85mm lens flatters faces and why wide angles distort them.",
          estimatedMinutes: 25,
          type:             "read",
        },
        {
          id:               "pm-t2",
          title:            "Practice: 20 Test Portraits in 3 Different Lighting Conditions",
          description:      "Shoot 20 portraits across: open shade (overcast), direct window light, and golden hour sun. No editing yet. The goal is to see how light alone transforms a portrait. Study your results: which light made your subject look most alive?",
          estimatedMinutes: 75,
          type:             "practice",
        },
        {
          id:               "pm-t3",
          title:            "Install and Apply the Portrait Skin Luxury Preset Pack",
          description:      "Apply the Portrait Skin Luxury presets to your 20 test shots. Notice how the presets handle each lighting condition differently. Skin tones under open shade vs. golden hour will render differently — experiment with the Skin Tone slider.",
          estimatedMinutes: 30,
          type:             "practice",
          presetRecommended: "portrait-skin-luxury",
        },
        {
          id:               "pm-t4",
          title:            "Select Your 5 Best Portraits and Understand Why",
          description:      "From your 20 test shots, select your 5 favourite. For each one, write one sentence explaining what makes it work: Is it the light? The expression? The composition? This reflection builds your visual taste deliberately.",
          estimatedMinutes: 20,
          type:             "read",
        },
      ],
    },
    {
      index:       1,
      title:       "Light Mastery",
      description: "Understand and control light. From reflectors to strobes to the golden hour — become a photographer who can create the right light in any situation.",
      skillsGained: ["Reflector technique", "Window light control", "Bounce flash basics", "Golden hour timing"],
      badge:       "Light Artist",
      tasks: [
        {
          id:               "pm-t5",
          title:            "Study the 5 Portrait Lighting Patterns",
          description:      "Learn Rembrandt, loop, butterfly (Paramount), split, and broad lighting. These are the 5 patterns every portrait photographer must recognise and recreate. Practise identifying them in magazine covers and film stills.",
          estimatedMinutes: 30,
          type:             "read",
        },
        {
          id:               "pm-t6",
          title:            "Practice: Recreate All 5 Lighting Patterns With One Window",
          description:      "Using only a single window and a white foam board as a reflector, recreate all 5 lighting patterns on a willing subject (or yourself with a tripod and self-timer). Compare your results side-by-side.",
          estimatedMinutes: 60,
          type:             "practice",
        },
        {
          id:               "pm-t7",
          title:            "Shoot a 30-Minute Golden Hour Portrait Session",
          description:      "Plan around sunset. Arrive 45 minutes early. In the last 30 minutes of sunlight, shoot minimum 50 frames using the warm backlight and side-light positions you've learned. Aim for lens flare control and rim light separation.",
          estimatedMinutes: 75,
          type:             "practice",
        },
        {
          id:               "pm-t8",
          title:            "Edit Your Golden Hour Session Using Warm Portrait Presets",
          description:      "Take your 10 best golden hour shots through the Portrait Skin Luxury workflow. Aim for consistency across the set: same white balance direction, same skin tone warmth, same shadow depth. This edit should look cohesive enough to be a published editorial.",
          estimatedMinutes: 45,
          type:             "create",
          presetRecommended: "portrait-skin-luxury",
        },
      ],
    },
    {
      index:       2,
      title:       "Skin Tone Editing Mastery",
      description: "Professional skin tone editing is what separates amateur portraits from published work. Learn the exact retouching workflow used in fashion and editorial photography.",
      skillsGained: ["Frequency separation", "HSL skin targeting", "Dodge & burn", "Color calibration"],
      tasks: [
        {
          id:               "pm-t9",
          title:            "Study: The Skin Tone Targeting Workflow in Lightroom",
          description:      "Learn to use the HSL panel's Hue/Saturation/Luminance sliders specifically for skin — Orange and Red ranges. Understand how to shift skin tones warmer or cooler, pull red from cheeks without killing the overall palette, and lift luminance for a glow.",
          estimatedMinutes: 35,
          type:             "watch",
          resource:         { title: "Skin Tone Lightroom Workflow", url: "/courses/lightroom-mastery" },
        },
        {
          id:               "pm-t10",
          title:            "Practice: Edit 5 Portraits With 5 Different Skin Tones",
          description:      "Challenge yourself by editing portraits with fair, olive, medium-brown, dark-brown, and deep skin tones. Each requires a different HSL approach. The goal is accuracy — making skin look healthy and natural, not orange, not grey.",
          estimatedMinutes: 60,
          type:             "practice",
        },
        {
          id:               "pm-t11",
          title:            "Learn Frequency Separation for Texture vs. Tone",
          description:      "Frequency separation is a Photoshop technique that separates skin texture (high frequency) from skin tone (low frequency) into two layers. This allows you to smooth tone without destroying texture. Follow a step-by-step tutorial to build the action.",
          estimatedMinutes: 45,
          type:             "watch",
        },
        {
          id:               "pm-t12",
          title:            "Create a Retouch Reference Sheet",
          description:      "Edit one portrait through your full workflow: Lightroom global adjustments → HSL skin targeting → Photoshop frequency separation → dodge and burn. Document each step with a screenshot. This becomes your repeatable workflow reference.",
          estimatedMinutes: 60,
          type:             "create",
        },
      ],
    },
    {
      index:       3,
      title:       "Build Your Portfolio",
      description: "Curate 10 portfolio-worthy portraits that demonstrate your lighting mastery, editing consistency, and creative vision.",
      skillsGained: ["Portfolio curation", "Creative consistency", "Self-direction", "Photographer statement"],
      badge:       "Portfolio Complete",
      tasks: [
        {
          id:               "pm-t13",
          title:            "Shoot a Dedicated Portfolio Session",
          description:      "Plan and execute a portrait session specifically for portfolio purpose. Choose a location with great natural light, brief your subject on wardrobe and expression direction. Shoot minimum 100 frames across 2–3 setups. Quality over quantity in selection.",
          estimatedMinutes: 120,
          type:             "create",
        },
        {
          id:               "pm-t14",
          title:            "Select and Edit Your 10 Portfolio Images",
          description:      "Apply your complete editing workflow to your top 10 selections. Aim for a cohesive set: consistent colour temperature, consistent exposure, consistent mood. These 10 images must work together as a series, not just as individual shots.",
          estimatedMinutes: 90,
          type:             "create",
          presetRecommended: "portrait-skin-luxury",
        },
        {
          id:               "pm-t15",
          title:            "Write Your Photographer Statement",
          description:      "Write 3–4 sentences describing your portrait style and who you want to photograph. Avoid clichés ('I love capturing emotions'). Be specific: your lighting approach, your editing aesthetic, your ideal subject or context. This will go on your website and social.",
          estimatedMinutes: 30,
          type:             "create",
        },
        {
          id:               "pm-t16",
          title:            "Publish to PXL Showcase and Build Your Portfolio Site",
          description:      "Upload your 10 portfolio images to PXL Creator Showcase. Then compile them on a personal portfolio site (Squarespace, Format, or your own). Include your photographer statement, contact form, and pricing page.",
          estimatedMinutes: 90,
          type:             "share",
          resource:         { title: "Creator Showcase", url: "/community/showcase" },
        },
      ],
    },
    {
      index:       4,
      title:       "First Paid Client",
      description: "Navigate the business side of portrait photography: pricing, client communication, delivery, and building repeat bookings.",
      skillsGained: ["Pricing psychology", "Client onboarding", "Gallery delivery", "Testimonial collection"],
      tasks: [
        {
          id:               "pm-t17",
          title:            "Set Your Portrait Photography Pricing Structure",
          description:      "Research local photographer rates. Structure your pricing in tiers: a Starter Session (60 min, 10 edited images), a Standard Session (2 hrs, 25 images), and a Premium Session (full day, 50 images + prints). Beginner rates: $150–400 per session.",
          estimatedMinutes: 30,
          type:             "read",
        },
        {
          id:               "pm-t18",
          title:            "Book and Shoot Your First Model Call (Free Session)",
          description:      "Post a 'model call' on Instagram or local groups — offer a free session for your portfolio in exchange for usage rights. This gives you a real client experience with zero financial pressure. Practice posing direction, communication, and delivery.",
          estimatedMinutes: 180,
          type:             "connect",
        },
        {
          id:               "pm-t19",
          title:            "Deliver a Professional Gallery and Request a Testimonial",
          description:      "Deliver your edited gallery via a professional platform (Pixieset, ShootProof, or Google Drive with clean labelling). Send a short follow-up asking for a 2–3 sentence testimonial. Testimonials are your most valuable marketing asset.",
          estimatedMinutes: 45,
          type:             "share",
        },
      ],
    },
    {
      index:       5,
      title:       "Build Your Portrait Brand",
      description: "Create a recognisable visual brand, grow your Instagram following, and establish a sustainable portrait photography business.",
      skillsGained: ["Instagram strategy", "Brand identity", "Marketing", "Business sustainability"],
      badge:       "Portrait Professional",
      tasks: [
        {
          id:               "pm-t20",
          title:            "Define Your Portrait Niche",
          description:      "Great portrait photographers own a niche. Pick yours: maternity, newborn, families, headshots, wedding, fashion editorial, lifestyle. Your niche determines your pricing, your audience, and your marketing. The more specific, the more bookable.",
          estimatedMinutes: 20,
          type:             "read",
        },
        {
          id:               "pm-t21",
          title:            "Build a Consistent Instagram Aesthetic Strategy",
          description:      "Plan your Instagram grid as if it were a magazine layout. Choose a consistent warm/cool direction, a consistent crop style, and a consistent caption voice. Use a tool like Planoly or Preview to visualise the grid before posting. Post 3× per week minimum.",
          estimatedMinutes: 60,
          type:             "create",
        },
        {
          id:               "pm-t22",
          title:            "Create Your Brand Kit",
          description:      "Build a simple brand kit: logo or wordmark, 2–3 brand colours (based on your editing aesthetic), font pairing. Use Canva Pro or Adobe Express. Apply it to your website, Instagram bio, inquiry form, and gallery delivery emails.",
          estimatedMinutes: 90,
          type:             "create",
        },
        {
          id:               "pm-t23",
          title:            "Launch and Promote With a Mini Campaign",
          description:      "Run a 2-week Instagram campaign announcing your portrait services. Post 3 portfolio images with your rates visible in Stories (not feed). DM 5 people who engaged with your content with a personalised offer. Track how many inquiries convert.",
          estimatedMinutes: 60,
          type:             "share",
        },
      ],
    },
  ],
}

/* ── Travel Creator Path ─────────────────────────────────────── */
const travelCreatorPath: GrowthPath = {
  id:             "travel-creator",
  title:          "Travel Creator Path",
  tagline:        "Tell the world's stories through light, colour, and movement.",
  description:    "A 6-stage journey from shooting better travel content to building a sustainable income as a travel creator and visual storyteller. For photographers and videographers who want to make the world their studio.",
  difficulty:     "beginner",
  estimatedWeeks: 9,
  badge:          "Travel Storyteller",
  color:          "#6fba8a",
  icon:           "🌍",
  totalStages:    6,
  affinities:     { travel: 0.9, nature: 0.8, cinematic: 0.6, film: 0.3 },
  stages: [
    {
      index:       0,
      title:       "Travel Photography Fundamentals",
      description: "Master the capture skills that make travel photography compelling: composition, timing, camera settings, and the art of finding extraordinary moments in ordinary places.",
      skillsGained: ["Travel composition", "Golden hour timing", "Camera settings for travel", "Street instinct"],
      tasks: [
        {
          id:               "tc-t1",
          title:            "Read: The 10 Travel Photography Compositions That Always Work",
          description:      "Study: leading lines (roads, rivers, stairwells), rule of thirds with context, foreground-midground-background layering, environmental portraiture (person in landscape scale), and the decisive moment street approach. Apply each at home before you travel.",
          estimatedMinutes: 25,
          type:             "read",
        },
        {
          id:               "tc-t2",
          title:            "Shoot a Travel-Style Series in Your Own City",
          description:      "Treat your city like a tourist destination for one day. Shoot 40 frames with the mindset of a travel photographer: look for patterns, texture, human connection with place, and iconic shots of the overlooked. Review what worked and why.",
          estimatedMinutes: 90,
          type:             "practice",
        },
        {
          id:               "tc-t3",
          title:            "Install the Golden Travel Pack and Understand Warm vs. Cool Toning",
          description:      "Apply the Golden Travel Pack to your city series. Notice how warmth in shadows creates comfort and safety — the feeling of belonging in a place. Experiment with the Temperature and Tint sliders to push the warm travel aesthetic you want to own.",
          estimatedMinutes: 30,
          type:             "practice",
          presetRecommended: "golden-travel-pack",
        },
        {
          id:               "tc-t4",
          title:            "Identify Your Top 5 Shots and Write Mini Captions",
          description:      "From your city session, select your 5 strongest travel-style shots. For each one, write a 2-sentence caption that gives context: where, what you noticed, why you pressed the shutter. Good travel photography always has a story.",
          estimatedMinutes: 20,
          type:             "create",
        },
      ],
    },
    {
      index:       1,
      title:       "Visual Storytelling",
      description: "Travel photography at its best tells stories, not just records locations. Learn the narrative structures that make content resonate and get shared.",
      skillsGained: ["3-act photo story", "Documentary vs. cinematic storytelling", "Emotional narrative", "Series cohesion"],
      badge:       "Storyteller",
      tasks: [
        {
          id:               "tc-t5",
          title:            "Read: How to Build a Photo Story (3-Image Narrative)",
          description:      "Every compelling travel story needs: an establishing shot (setting), an action/moment shot (the story), and a detail/intimate shot (the texture). This 3-shot structure works for Instagram, editorial, and short-form video equally well.",
          estimatedMinutes: 20,
          type:             "read",
        },
        {
          id:               "tc-t6",
          title:            "Create a 5-Image Travel Story From Your City Session",
          description:      "Go back to your city photos. Now arrange them as a 5-image story: opening (context), rising action (discovery), climax (the moment), falling action (reflection), resolution (closure). Each image must earn its place in the sequence.",
          estimatedMinutes: 30,
          type:             "create",
        },
        {
          id:               "tc-t7",
          title:            "Study Color Narrative: What Warm vs. Cool Communicates",
          description:      "In film and photography, warm tones signal safety, belonging, comfort. Cool tones signal isolation, adventure, the unknown. Travel documentaries use this intentionally. Study 3 travel films or National Geographic essays and map the colour narrative.",
          estimatedMinutes: 35,
          type:             "watch",
        },
        {
          id:               "tc-t8",
          title:            "Produce a 10-Image Travel Essay",
          description:      "Plan and execute a 10-image photo essay from any location. This could be a local market, a nearby town, or any environment with human activity. The essay must have a clear narrative arc — beginning, middle, end — with colour consistency throughout.",
          estimatedMinutes: 120,
          type:             "create",
          presetRecommended: "golden-travel-pack",
        },
      ],
    },
    {
      index:       2,
      title:       "Signature Travel Colour Grade",
      description: "Develop and codify your signature travel editing style. Consistency in colour is what makes your feed recognisable and what brings followers back.",
      skillsGained: ["Signature colour development", "Consistency across lighting", "LUT workflow", "Batch editing"],
      tasks: [
        {
          id:               "tc-t9",
          title:            "Study the Warm Travel Preset Workflow",
          description:      "Warm travel aesthetics are built in layers: Temperature slightly warm (+15–25), highlight reduction, shadow lift (lifted blacks for open, airy feel), slight desaturation of blues to keep sky from competing with warmth, subtle HSL orange bump for golden skin/earth tones.",
          estimatedMinutes: 30,
          type:             "watch",
          resource:         { title: "Warm Travel Editing Tutorial", url: "/courses/lightroom-mastery" },
        },
        {
          id:               "tc-t10",
          title:            "Apply Travel Documentary LUTs to Video Footage",
          description:      "If you shoot video, apply the Travel Documentary LUTs to 3 different lighting scenarios. The goal is to see how the LUT adapts and where you need to use the intensity slider vs. custom adjustments on top to maintain your look.",
          estimatedMinutes: 40,
          type:             "practice",
          presetRecommended: "travel-documentary-luts",
        },
        {
          id:               "tc-t11",
          title:            "Build Your Custom Travel Preset",
          description:      "Combine everything you've learned into one Lightroom preset that is uniquely yours. Save it as your master preset. Then create 3 variations: a brighter/airier version, a moodier/richer version, and a cooler/adventure version.",
          estimatedMinutes: 60,
          type:             "create",
        },
        {
          id:               "tc-t12",
          title:            "Batch Edit a 20-Image Travel Set to Prove Consistency",
          description:      "Take 20 photos from a single trip or outing — different lighting, different subjects. Sync your master preset across all, then adjust each individually for exposure. The result must look like it came from one cohesive shoot, not 20 unrelated edits.",
          estimatedMinutes: 45,
          type:             "practice",
        },
      ],
    },
    {
      index:       3,
      title:       "Social Media Growth",
      description: "Build an audience for your travel content on the platforms that matter. Learn algorithm-aware posting strategies without losing your artistic integrity.",
      skillsGained: ["Instagram growth strategy", "Caption writing", "Hashtag research", "Posting consistency"],
      badge:       "Audience Builder",
      tasks: [
        {
          id:               "tc-t13",
          title:            "Audit and Redesign Your Instagram Profile",
          description:      "Your grid is your portfolio. Audit your current profile: is the bio specific? Do the first 9 images tell someone immediately what you shoot? Is there a clear colour palette? Redesign your bio, switch your feed direction, and plan your next 9 posts before publishing.",
          estimatedMinutes: 45,
          type:             "create",
        },
        {
          id:               "tc-t14",
          title:            "Write Captions That Drive Engagement (Not Just Compliments)",
          description:      "The accounts with massive engagement write captions that ask genuine questions, share a specific observation, or tell a brief story with an emotional hook. Study 5 travel accounts with 100k+ followers and analyse their caption structure. Then rewrite 3 of your past captions using what you learned.",
          estimatedMinutes: 35,
          type:             "read",
        },
        {
          id:               "tc-t15",
          title:            "Schedule 2 Weeks of Content in Advance",
          description:      "Use Later, Buffer, or Instagram's native scheduler to queue 14 posts. Each post should have: a strong hero image, a caption with a story hook, a question at the end, and a set of 10–15 relevant hashtags. Batch creation prevents posting anxiety.",
          estimatedMinutes: 90,
          type:             "create",
        },
        {
          id:               "tc-t16",
          title:            "Engage Authentically With 10 Accounts in Your Niche for 7 Days",
          description:      "For 7 consecutive days, leave 10 meaningful comments (not 'Great shot!') on travel photography accounts you genuinely admire. Reply to everyone who comments on your posts within the first hour. Algorithmic growth starts with human connection.",
          estimatedMinutes: 30,
          type:             "connect",
        },
      ],
    },
    {
      index:       4,
      title:       "Brand Collaboration",
      description: "Turn your audience and aesthetic into brand partnership opportunities. Learn how to pitch brands, what they look for, and how to deliver content that gets you rehired.",
      skillsGained: ["Media kit creation", "Brand pitching", "Usage rights", "Collaboration delivery"],
      tasks: [
        {
          id:               "tc-t17",
          title:            "Create Your Travel Creator Media Kit",
          description:      "Your media kit is your business card to brands. It should include: your bio (3 sentences), your best 6 photos, your platform stats (followers, engagement rate, reach), your audience demographics, your collaboration types and rates, and your contact info. Keep it to 2 pages max.",
          estimatedMinutes: 90,
          type:             "create",
        },
        {
          id:               "tc-t18",
          title:            "Identify 10 Travel and Gear Brands That Fit Your Aesthetic",
          description:      "Study travel brands that work with creators: gear brands (Peak Design, F-Stop, Gitzo), clothing brands (Patagonia, North Face), luggage brands (Away, Rimowa), tourism boards. Find the ones whose visual language matches yours. Follow them. Engage before pitching.",
          estimatedMinutes: 30,
          type:             "read",
        },
        {
          id:               "tc-t19",
          title:            "Send 3 Brand Pitch Emails",
          description:      "Write personalised outreach to 3 brands. Reference their recent campaign, explain what you bring specifically to their audience (not generic 'I love your brand'), attach your media kit, and propose a specific collaboration format. Expect a 5–15% response rate — persistence matters.",
          estimatedMinutes: 60,
          type:             "connect",
        },
      ],
    },
    {
      index:       5,
      title:       "Monetize as a Travel Creator",
      description: "Build multiple income streams as a travel creator — from affiliate commissions to workshops to brand retainers.",
      skillsGained: ["Affiliate marketing", "Workshop creation", "Brand retainers", "Licensing"],
      badge:       "Travel Storyteller",
      tasks: [
        {
          id:               "tc-t20",
          title:            "Join 3 Affiliate Programs for Your Gear and Tools",
          description:      "Affiliate marketing is the easiest first income stream: you recommend gear you already use and earn 5–15% commission. Join: Amazon Associates, B&H Photo affiliate, Adobe affiliate, and any brand programs relevant to your kit. Start linking in bio and caption.",
          estimatedMinutes: 45,
          type:             "share",
        },
        {
          id:               "tc-t21",
          title:            "Create a 1-Hour Travel Editing Workshop",
          description:      "Package your editing knowledge into a paid workshop: 'My Complete Travel Photo Editing Workflow.' Record a screen capture walking through your complete Lightroom process on 5 images. Sell via Gumroad, Teachable, or PXL Creator. Price at $15–40.",
          estimatedMinutes: 180,
          type:             "create",
        },
        {
          id:               "tc-t22",
          title:            "Pitch a Tourism Board for a Destination Campaign",
          description:      "National and regional tourism boards are major budget holders for creator content. Research 3 tourism boards that align with places you want to visit. Send a project proposal outlining what you'd shoot, how you'd distribute it, and your rates.",
          estimatedMinutes: 60,
          type:             "connect",
        },
        {
          id:               "tc-t23",
          title:            "Package and Launch Your Travel Preset Pack",
          description:      "Combine your signature preset and its 3 variations into a downloadable preset pack. Write a sales page that explains the look, shows before/afters, and explains who it is for. Launch with an Instagram Story series. Price at $15–25.",
          estimatedMinutes: 120,
          type:             "create",
          resource:         { title: "Sell Your Own Presets Guide", url: "/blog/sell-presets-guide" },
        },
      ],
    },
  ],
}

/* ── Street Photography Path ─────────────────────────────────── */
const streetPhotographyPath: GrowthPath = {
  id:             "street-photographer",
  title:          "Street Photography Path",
  tagline:        "Find extraordinary moments in ordinary places.",
  description:    "A 6-stage path from hesitant beginner to bold street photographer with a published portfolio. Build the instinct, the eye, and the editing style that makes street photography timeless.",
  difficulty:     "beginner",
  estimatedWeeks: 8,
  badge:          "Street Documentarian",
  color:          "#8ba3bf",
  icon:           "🏙️",
  totalStages:    6,
  affinities:     { street: 0.9, urban: 0.8, film: 0.6, cinematic: 0.3 },
  stages: [
    {
      index: 0, title: "The Street Mindset", description: "Street photography is as much philosophy as technique. Learn how the masters thought, how to overcome shyness, and how to develop the decisive eye.",
      skillsGained: ["Zone focus technique", "Ethical considerations", "Decisive moment", "Hyperfocal distance"],
      tasks: [
        { id: "sp-t1", title: "Study 5 Master Street Photographers", description: "Study the body of work of Cartier-Bresson (the decisive moment), Vivian Maier (personal vision), Garry Winogrand (American energy), Lee Friedlander (urban complexity), and Daido Moriyama (raw grain). Write one sentence about what each of them was after.", estimatedMinutes: 45, type: "read" },
        { id: "sp-t2", title: "Shoot 50 Frames in 1 Hour Without Looking at Results", description: "Go to a busy public space. Shoot 50 frames purely on instinct — no reviewing on the back of camera. The goal is to suppress judgment and trust your eye. Review everything at home. Notice what your gut was drawn to.", estimatedMinutes: 60, type: "practice" },
        { id: "sp-t3", title: "Install the Street Urban Grit Presets", description: "Apply the Street Urban Grit preset pack to your 50 frames. The gritty, desaturated aesthetic of street photography is part of its emotional language. Study how the lifted blacks and reduced saturation affect mood vs. a straight contrasty conversion.", estimatedMinutes: 25, type: "practice", presetRecommended: "street-urban-grit" },
        { id: "sp-t4", title: "Select Your 3 Best Frames and Explain Each", description: "From 50 frames, pick 3. For each, write: the decisive moment you were after, whether you got it or missed it, and what you'd do differently. This critical self-analysis is how great photographers improve faster than everyone else.", estimatedMinutes: 20, type: "read" },
      ],
    },
    { index: 1, title: "Technical Precision", description: "Master zone focus, hyperfocal distance, and exposure for the unpredictable street environment.", skillsGained: ["Zone focus mastery", "Exposure triangle in dynamic light", "Pre-focus technique", "B&W conversion"],
      badge: "Zone Focuser",
      tasks: [
        { id: "sp-t5", title: "Master Zone Focus: The Street Photographer's Superpower", description: "Zone focus lets you shoot without looking through the viewfinder. Set lens to f/8, focus to 2–4m, and use hyperfocal distance to keep everything from 1.5m to infinity sharp. Practice walking and shooting without raising the camera to your eye.", estimatedMinutes: 30, type: "practice" },
        { id: "sp-t6", title: "Shoot a 1-Hour Session Using Zone Focus Only", description: "Put your camera in zone focus mode for an entire hour. No autofocus. This constraint forces you to be in the moment rather than behind the mechanics. You'll miss shots. That's the point. Note what percentage of zone-focused frames are in focus.", estimatedMinutes: 60, type: "practice" },
        { id: "sp-t7", title: "Black & White Conversion Workflow", description: "B&W street photography lives or dies by tonal contrast and grain. Learn the professional approach: use the B&W mix panel to control how colours convert (red becomes bright, blue goes dark), then add structure and graduated film grain. Study how this differs from just desaturating.", estimatedMinutes: 35, type: "watch" },
        { id: "sp-t8", title: "Edit 10 Frames in Consistent B&W Street Style", description: "Edit 10 street frames with a consistent B&W workflow: strong blacks, high structure, film grain. The set should look like frames from one photographer, not ten different edits.", estimatedMinutes: 45, type: "create", presetRecommended: "street-urban-grit" },
      ],
    },
    { index: 2, title: "Finding Your Voice", description: "Move beyond copying masters to developing your own thematic obsessions and visual vocabulary.", skillsGained: ["Thematic consistency", "Personal narrative", "Serialised photography", "Project development"],
      tasks: [
        { id: "sp-t9", title: "Define Your Street Photography Obsession", description: "The best street photographers are obsessed with something specific: shadows, reflections, solitude in crowds, juxtapositions, signage against human scale. Name your obsession in one sentence. This is your visual territory.", estimatedMinutes: 20, type: "read" },
        { id: "sp-t10", title: "Shoot a 1-Week Project Around Your Obsession", description: "For 7 days, shoot exclusively frames related to your named obsession. Minimum 30 frames per day. At the end of the week, edit your 20 strongest frames. Is there a consistent visual thread? This is the beginning of your style.", estimatedMinutes: 210, type: "create" },
        { id: "sp-t11", title: "Build a 20-Image Street Photography Series", description: "From your week of shooting, curate and edit a 20-image series that communicates a coherent thematic statement. Order the images as a visual sequence — like a story without words. Each image must justify its presence in the set.", estimatedMinutes: 90, type: "create" },
      ],
    },
    { index: 3, title: "Portfolio", description: "Build and publish a definitive street photography portfolio.", skillsGained: ["Portfolio curation", "Artist statement", "Exhibition thinking", "Online presence"],
      badge: "Published Photographer",
      tasks: [
        { id: "sp-t12", title: "Curate Your 15 Strongest Street Images", description: "From all your shooting to date, select 15 images that best represent your emerging voice. Apply strict criteria: technical quality, decisive moment, thematic relevance, emotional impact. These 15 must survive scrutiny from a stranger.", estimatedMinutes: 45, type: "create" },
        { id: "sp-t13", title: "Write Your Artist Statement", description: "Write 2–3 sentences that answer: What are you trying to capture in street photography? What does it tell you about the world? Why does it matter? Avoid clichés. Be direct, specific, and honest.", estimatedMinutes: 30, type: "create" },
        { id: "sp-t14", title: "Publish Your Portfolio on PXL Showcase and a Personal Site", description: "Upload your 15 street photos to PXL Showcase with your artist statement as the description. Then create a dedicated page on a portfolio site. Submit the portfolio to 2 online street photography communities for critique.", estimatedMinutes: 60, type: "share", resource: { title: "Community Showcase", url: "/community/showcase" } },
      ],
    },
    { index: 4, title: "Community and Critique", description: "Enter the street photography community, receive honest feedback, and grow through dialogue with other photographers.", skillsGained: ["Constructive critique", "Community engagement", "Film photography fundamentals", "Collaboration"],
      tasks: [
        { id: "sp-t15", title: "Join 2 Street Photography Communities and Submit Your Work", description: "Submit your portfolio to 2 active street photography communities online (r/streetphotography, Burn Magazine, or local photo clubs). The goal is not validation — it's critique. Specifically ask: 'What's not working and why?'", estimatedMinutes: 30, type: "connect" },
        { id: "sp-t16", title: "Shoot With Another Photographer for a Day", description: "Find a street photographer through PXL Community or a local club and spend a day shooting together. Seeing how someone else sees transforms your own vision faster than anything else. Swap edits at the end and discuss your differences.", estimatedMinutes: 300, type: "connect", resource: { title: "PXL Community", url: "/community" } },
      ],
    },
    { index: 5, title: "Monetize and Exhibit", description: "Turn your street photography into income through print sales, editorial licensing, and exhibitions.", skillsGained: ["Fine art print sales", "Editorial licensing", "Gallery submission", "Photo book planning"],
      badge: "Street Documentarian",
      tasks: [
        { id: "sp-t17", title: "Launch a Fine Art Print Store", description: "Street photography sells as fine art prints. Set up a print-on-demand store (Printful + Shopify, or Fine Art America). Price 8×10 prints at $35–60, 16×20 at $80–150. Start with your 5 strongest images.", estimatedMinutes: 120, type: "create" },
        { id: "sp-t18", title: "License 3 Images to Editorial Publications", description: "Submit your best street images to editorial stock agencies (Getty Editorial, Shutterstock Editorial) or directly to magazines that publish street photography. Editorial licensing typically pays $50–500 per use.", estimatedMinutes: 60, type: "connect" },
        { id: "sp-t19", title: "Begin Planning a Photo Book or Zine", description: "The highest-form presentation of a street photography project is a book. Plan your first zine: 24–32 pages, your 20-image series, your artist statement, and a brief about your process. Self-publish via Blurb or Newspaper Club.", estimatedMinutes: 90, type: "create" },
      ],
    },
  ],
}

/* ── Mobile Creator Path ─────────────────────────────────────── */
const mobileCreatorPath: GrowthPath = {
  id:             "mobile-creator",
  title:          "Mobile Creator Path",
  tagline:        "Turn your phone into a professional creative studio.",
  description:    "A complete path for mobile-first creators who want to shoot, edit, and build an audience using nothing but their phone. Built for Instagram and TikTok creators who want premium-quality content.",
  difficulty:     "beginner",
  estimatedWeeks: 6,
  badge:          "Mobile Pro",
  color:          "#7cb5e0",
  icon:           "📱",
  totalStages:    6,
  affinities:     { mobile: 0.9, minimal: 0.6, portrait: 0.4, fashion: 0.3 },
  stages: [
    { index: 0, title: "Mobile Camera Mastery", description: "Learn to extract the maximum from your phone camera.", skillsGained: ["ProRAW/ProRes", "Manual focus", "Portrait mode control", "Composition on small screen"],
      tasks: [
        { id: "mc-t1", title: "Enable ProRAW/RAW on Your Phone Camera", description: "If you have iPhone 12 Pro+ or a Google Pixel, enable ProRAW. On Samsung, enable Expert RAW. RAW files give you 4–5× more editing range than JPEG. Learn how to shoot in RAW and why the JPEG preview looks flat — you're seeing raw sensor data before processing.", estimatedMinutes: 20, type: "practice" },
        { id: "mc-t2", title: "Master the Lightroom Mobile App Interface", description: "Lightroom Mobile is the best editing app for creators. Learn: the histogram, the light panel, the colour mixer, and presets. It's 90% of the desktop version in your pocket. Install it and go through all panels before shooting anything.", estimatedMinutes: 30, type: "watch", resource: { title: "Mobile Editing Pro Course", url: "/courses/mobile-editing" } },
        { id: "mc-t3", title: "Shoot 30 Frames Using These 5 Mobile Composition Rules", description: "Mobile composition rules: (1) tap to focus AND expose separately, (2) use grid lines for rule of thirds, (3) change shooting height (low angles are underused), (4) use the built-in portrait mode for separation, (5) look for leading lines that work at 4:5 crop.", estimatedMinutes: 45, type: "practice" },
        { id: "mc-t4", title: "Install the Mobile Creator Pack Presets", description: "Apply the Mobile Creator Pack presets to your 30 frames. These presets are calibrated specifically for the colour science of iPhone and Android sensors. Notice how the presets shift the blue channel (which mobile sensors over-saturate) to create a more natural result.", estimatedMinutes: 20, type: "practice", presetRecommended: "mobile-creator-pack" },
      ],
    },
    { index: 1, title: "Editing for Social", description: "Build an editing workflow that's fast, consistent, and social-platform-ready.", skillsGained: ["Speed editing workflow", "Export settings for Instagram", "Batch editing mobile", "Preset creation on mobile"],
      badge: "Mobile Editor",
      tasks: [
        { id: "mc-t5", title: "Build a 5-Minute Edit Routine", description: "The best mobile creators can edit a photo in 5 minutes and have it match their feed aesthetic. Build your 5-step process: (1) exposure balance, (2) white balance, (3) apply your signature preset, (4) adjust highlights/shadows, (5) sharpen and export. Time yourself.", estimatedMinutes: 30, type: "practice" },
        { id: "mc-t6", title: "Create Your Mobile Signature Preset", description: "In Lightroom Mobile, build and save your own preset using your preferred settings. Export the preset as a .DNG to back it up. This is your creative fingerprint — the setting that makes all your photos look like yours.", estimatedMinutes: 40, type: "create" },
        { id: "mc-t7", title: "Export Settings Master Class for Instagram and TikTok", description: "Instagram compresses JPEG aggressively — export at 1080×1350 for portrait, 4:3 aspect ratio. TikTok prefers 1080×1920. Use sRGB colour profile. Export at 80% JPEG quality for a balance of file size and visual quality. Higher quality files = more detail preserved after platform compression.", estimatedMinutes: 20, type: "read" },
        { id: "mc-t8", title: "Batch Edit a 10-Photo Set to Feed-Ready Consistency", description: "Edit 10 photos with your mobile workflow in under 1 hour. Each photo should look like it belongs together — same colour temperature direction, same luminosity level, same grain (if applicable). Test them in the Planoly or Preview grid tool.", estimatedMinutes: 60, type: "create" },
      ],
    },
    { index: 2, title: "Content Strategy", description: "Turn creative output into a sustainable content machine without burning out.", skillsGained: ["Content batching", "Niche definition", "Hook writing", "Content calendar"],
      tasks: [
        { id: "mc-t9", title: "Define Your Content Niche and Repeatable Format", description: "The creators who grow fastest have a consistent format. Define: your subject (what you shoot), your style (how you edit), your hook (why people follow YOU specifically, not just nice photos). Write this as one sentence: 'I create [format] for [audience] about [topic] in a [style] way.'", estimatedMinutes: 25, type: "read" },
        { id: "mc-t10", title: "Plan Your First Month of Content in a Calendar", description: "Plan 30 days of content: 12 feed posts, 8 Reels/TikToks, 10 Stories. For each feed post, list the image concept, caption angle, and hashtag set. Batch-shooting on weekends eliminates mid-week pressure. Use Notion or a physical planner.", estimatedMinutes: 60, type: "create" },
        { id: "mc-t11", title: "Write 3 Hooks That Get People to Stop Scrolling", description: "Hooks are the first 3 seconds of a Reel or the first line of a caption. Test: question hooks ('Did you know this trick?'), bold statement hooks ('Stop editing your photos wrong'), and result hooks ('I grew 10k in 30 days by doing this'). Write 3 hooks for your own content style.", estimatedMinutes: 25, type: "create" },
      ],
    },
    { index: 3, title: "Reels and Short Video", description: "Master short-form video as the growth engine for your mobile creative brand.", skillsGained: ["Reel structure", "Trending audio use", "Transitions", "Video editing mobile"],
      badge: "Reels Creator",
      tasks: [
        { id: "mc-t12", title: "Study the Anatomy of a High-Performing Reel", description: "Analyse 10 Reels in your niche with over 100k views. Note: hook (first 2 seconds), pacing (how many cuts?), audio choice, text overlay, and CTA at end. Build a template based on your findings. Most viral Reels follow 2–3 proven structures.", estimatedMinutes: 40, type: "read" },
        { id: "mc-t13", title: "Create Your First 3 Reels in 1 Day", description: "Batch-create 3 Reels using trending audio from your niche. Use CapCut, InShot, or Instagram's native editor. Aim for 7–15 second Reels for maximum completion rate. Post 24 hours apart, not all at once.", estimatedMinutes: 120, type: "create" },
        { id: "mc-t14", title: "A/B Test: Create the Same Reel With 2 Different Hooks", description: "Make 2 versions of the same Reel concept with different opening hooks. Post them 1 week apart and compare: watch time, shares, saves, and profile visits. This teaches you what your specific audience responds to, not what social media gurus say works in general.", estimatedMinutes: 90, type: "create" },
      ],
    },
    { index: 4, title: "Audience Building", description: "Build genuine engagement through community, collaboration, and strategic platform behaviour.", skillsGained: ["Instagram algorithm", "TikTok discovery", "Collab strategy", "DM relationship building"],
      tasks: [
        { id: "mc-t15", title: "Audit Your Best-Performing Content and Replicate the Pattern", description: "Go to your Instagram Insights or TikTok Analytics. Which 3 posts had the most saves? The most shares? Saves = content people want to return to. Replicate the topic, format, or approach of your top 3 posts in new variations.", estimatedMinutes: 30, type: "read" },
        { id: "mc-t16", title: "Collab With 2 Creators in Adjacent Niches", description: "Collaboration is the fastest organic growth strategy. Find 2 mobile creators in complementary niches (if you shoot food, collaborate with a lifestyle creator). Propose a content swap: they create a post using your preset, you feature their location. Reach each other's audiences.", estimatedMinutes: 60, type: "connect", resource: { title: "Find Collaborators", url: "/community/projects" } },
        { id: "mc-t17", title: "Build a Reply Habit: Respond to Every Comment for 14 Days", description: "For 2 weeks, reply to every single comment with a specific, non-generic response. Ask a follow-up question when relevant. This creates a parasocial relationship signal that Instagram and TikTok algorithms reward with more distribution.", estimatedMinutes: 60, type: "connect" },
      ],
    },
    { index: 5, title: "Monetize Your Mobile Audience", description: "Build revenue streams from your mobile creator platform without needing 1 million followers.", skillsGained: ["Brand deals", "Affiliate income", "Digital product sales", "Coaching"],
      badge: "Mobile Pro",
      tasks: [
        { id: "mc-t18", title: "Apply to 3 Creator Programs (Meta, TikTok, Amazon)", description: "Meta's Creator Bonus program, TikTok Creator Fund, and Amazon Influencer Program are accessible at 10k+ followers. Apply to all 3. These are baseline income streams — not retirement income, but consistent and passive.", estimatedMinutes: 45, type: "share" },
        { id: "mc-t19", title: "Launch Your First Digital Product: A Mobile Preset Pack", description: "Package your signature mobile preset (and 2–3 variations) into a downloadable product. Sell on Gumroad or direct via DM with Google Pay/Stripe. Price at $7–15 for mobile presets. Your first $100 proves the model.", estimatedMinutes: 90, type: "create" },
        { id: "mc-t20", title: "Pitch 3 Mobile-First Brands for a Sponsored Post", description: "Mobile creator brands: VSCO, Lightroom subscription, phone case companies, coffee brands, skincare, fashion boutiques. Pitch 3 with your media kit at a 'micro-influencer' rate of $100–300 per post at 10k–50k followers.", estimatedMinutes: 60, type: "connect" },
      ],
    },
  ],
}

/* ── Content Creator Path ────────────────────────────────────── */
const contentCreatorPath: GrowthPath = {
  id:             "content-creator",
  title:          "Content Creator Path",
  tagline:        "Build a brand, grow an audience, and create on your own terms.",
  description:    "A comprehensive path for all-platform content creators who want to build a recognisable personal brand with consistent aesthetics, multiple content formats, and sustainable income from their creative work.",
  difficulty:     "beginner",
  estimatedWeeks: 10,
  badge:          "Content Brand Builder",
  color:          "#a78bfa",
  icon:           "✨",
  totalStages:    6,
  affinities:     { minimal: 0.7, fashion: 0.5, mobile: 0.6, commercial: 0.4 },
  stages: [
    { index: 0, title: "Brand Identity", description: "Define what makes your content unmistakably yours.", skillsGained: ["Brand voice", "Visual identity", "Niche definition", "Creator positioning"],
      tasks: [
        { id: "cc-t1", title: "Write Your Creator One-Liner", description: "The most powerful brand communication is one sentence: 'I help [audience] do [transformation] through [method].' For creators: 'I create [minimal travel content / cinematic city guides / honest fashion reviews] for [who].  Write 5 versions and choose the sharpest.", estimatedMinutes: 25, type: "read" },
        { id: "cc-t2", title: "Define Your Visual Identity: 3 Rules You Never Break", description: "Strong creator brands have consistent visual rules: consistent filter, consistent colour palette, consistent font (for graphics), consistent crop ratio. Define 3 non-negotiable rules for your content. These constraints create recognition.", estimatedMinutes: 30, type: "create" },
        { id: "cc-t3", title: "Create a Brand Mood Board", description: "Collect 20 images that represent the visual direction you want your brand to live in. Include colours, textures, other creators in adjacent spaces, editorial inspiration. This mood board makes all future creative decisions faster and more consistent.", estimatedMinutes: 30, type: "create" },
        { id: "cc-t4", title: "Install the Minimal Clean White Presets and Build Your Visual Preset", description: "The Minimal Clean preset family is the foundation for most lifestyle and content creator aesthetics. Apply to 10 test images and adjust to match your mood board. Your preset IS your brand colour.", estimatedMinutes: 30, type: "practice", presetRecommended: "minimal-clean-white" },
      ],
    },
    { index: 1, title: "Multi-Platform Content", description: "Learn to repurpose one piece of content across Instagram, TikTok, and YouTube efficiently.", skillsGained: ["Content repurposing", "Platform-specific adaptation", "Batch creation", "Format mastery"],
      badge: "Multi-Platform Creator",
      tasks: [
        { id: "cc-t5", title: "Map the Content Ecosystem: 1 Idea Into 5 Formats", description: "One photo from a café can become: (1) Instagram feed post, (2) TikTok morning routine context, (3) YouTube B-roll, (4) Blog featured image, (5) Pinterest aesthetic pin. Practice the '1 to 5' method for your next 3 content ideas.", estimatedMinutes: 30, type: "read" },
        { id: "cc-t6", title: "Create a Weekly Content Template", description: "Design a template for your week: Monday (educational post), Wednesday (personal story), Friday (aesthetic visual), Saturday (Reel), Sunday (Stories/BTS). Consistency builds anticipation. Your audience knows what to expect and when.", estimatedMinutes: 30, type: "create" },
        { id: "cc-t7", title: "Batch Create 1 Full Week of Content in 1 Session", description: "Set aside a half-day: shoot all photos, record all videos, write all captions. Batch creation is the biggest productivity unlock for creators. Schedule everything through Later or Buffer. Spend the rest of the week engaging, not creating.", estimatedMinutes: 240, type: "create" },
      ],
    },
    { index: 2, title: "Storytelling and Engagement", description: "Move beyond aesthetics to content that people bookmark, share, and return to.", skillsGained: ["Narrative content", "Emotional hooks", "Educational content", "Community building"],
      tasks: [
        { id: "cc-t8", title: "Write 5 Story-Led Captions (Not Description Captions)", description: "Description captions: 'Golden hour walk.' Story captions: 'I used to rush everywhere. Last Tuesday I stopped, looked up at 5:47pm, and stayed for 40 minutes. Nothing on my to-do list was more important.' Story captions get saves. Saves grow your account.", estimatedMinutes: 35, type: "create" },
        { id: "cc-t9", title: "Create 3 Educational Carousel Posts", description: "Carousels teaching something useful about your niche consistently outperform single-image posts. Create 3 carousels: a 'how I edit my photos' carousel, a 'my morning creative routine' carousel, and a 'gear I actually use' carousel. Keep each to 5–7 slides.", estimatedMinutes: 90, type: "create" },
        { id: "cc-t10", title: "Host a Q&A Session in Stories and Turn Responses Into Content", description: "Ask your audience a question in Stories (a specific question about your niche — not 'ask me anything'). Turn the best responses into content: quote graphics, follow-up posts, or video responses. This creates community dialogue, not one-way broadcasting.", estimatedMinutes: 60, type: "connect" },
      ],
    },
    { index: 3, title: "Growth Acceleration", description: "Apply proven growth strategies that compound your audience without compromising your brand.", skillsGained: ["Hashtag strategy", "Algorithm triggers", "Collaboration", "Viral content mechanics"],
      badge: "Growth Creator",
      tasks: [
        { id: "cc-t11", title: "Build Your Core 30 Hashtag List (That Actually Converts)", description: "Forget 30 random hashtags. Build 3 sets of 10: 10 small niche hashtags (10k–100k posts), 10 mid-size community hashtags (100k–1M), 10 broad aspirational hashtags (1M+). Rotate through sets and track which combination drives the most reach per post.", estimatedMinutes: 35, type: "practice" },
        { id: "cc-t12", title: "Partner With 3 Creators for Cross-Promotion", description: "Reach out to 3 creators in complementary niches (same size or slightly larger). Propose a collab that genuinely serves their audience: a joint Reel, a shared Giveaway, or a story mention exchange. Focus on value for their audience, not your growth.", estimatedMinutes: 60, type: "connect" },
        { id: "cc-t13", title: "Post Your First Reel With a Proven High-Retention Structure", description: "Structure: Hook (0–2s: something unexpected), Value delivery (2–12s: the main content), Soft CTA (12–15s: 'Save this for later'). No intro. No 'hey guys'. The first 2 seconds determine whether people watch or scroll. Shoot and post this week.", estimatedMinutes: 75, type: "create" },
      ],
    },
    { index: 4, title: "Brand Partnerships", description: "Turn your audience and aesthetic into brand revenue — at any follower count.", skillsGained: ["Media kit", "Brand pitching", "Negotiation", "Sponsored content production"],
      tasks: [
        { id: "cc-t14", title: "Create a Creator Media Kit That Wins Brand Deals", description: "Your media kit is a 2-page PDF: page 1 = who you are (bio, audience, aesthetic), page 2 = what you offer (deliverables, rates, past collabs). Make it beautiful — it's a content piece itself. Use your brand colours and fonts.", estimatedMinutes: 90, type: "create" },
        { id: "cc-t15", title: "Pitch Your First 5 Brands With Personalised Outreach", description: "Research 5 brands that match your aesthetic and audience. Write personalised emails — not templates. Reference their recent campaign or product specifically. Attach your media kit. Propose a specific deliverable. Follow up once after 1 week.", estimatedMinutes: 75, type: "connect" },
        { id: "cc-t16", title: "Produce Your First Sponsored Post (Paid or Trade)", description: "Whether you get paid or receive a product, treat the production like a professional job: brief document, concept board, final deliverables. Deliver on time and above brief expectations. First collaborations are auditions for long-term partnerships.", estimatedMinutes: 120, type: "create" },
      ],
    },
    { index: 5, title: "Build Your Creator Business", description: "Turn your platform into multiple revenue streams and build something that grows whether you post that day or not.", skillsGained: ["Digital products", "Community monetization", "Email list", "Licensing"],
      badge: "Content Brand Builder",
      tasks: [
        { id: "cc-t17", title: "Launch a Paid Newsletter or Substack", description: "Your email list is the only platform you own. A paid newsletter at $5–10/month with 200 subscribers is $1,000–2,000 monthly recurring revenue. Write your first 4 issues, set up Substack or ConvertKit, and promote it to your existing audience.", estimatedMinutes: 120, type: "create" },
        { id: "cc-t18", title: "Create a Digital Product Relevant to Your Niche", description: "Digital products with zero marginal cost: preset packs ($15–40), Lightroom tutorials ($20–60), caption templates ($10–20), brand kit templates ($15–30). Create 1 product this week and list it on Gumroad. Promote it in Stories 3× in the first week.", estimatedMinutes: 150, type: "create" },
        { id: "cc-t19", title: "Build a Monthly Income Report for Your Own Tracking", description: "Know your numbers: brand deals revenue, affiliate income, digital product sales, creator fund, platform bonuses. Track monthly. This is a business now — treat it like one. Set a 6-month revenue goal and reverse-engineer the audience size and product mix needed to hit it.", estimatedMinutes: 45, type: "read" },
      ],
    },
  ],
}

/* ── All paths exported ──────────────────────────────────────── */
export const ALL_GROWTH_PATHS: GrowthPath[] = [
  cinematicFilmmakerPath,
  portraitMasterPath,
  travelCreatorPath,
  streetPhotographyPath,
  mobileCreatorPath,
  contentCreatorPath,
]

export const GROWTH_PATH_MAP: Record<string, GrowthPath> =
  Object.fromEntries(ALL_GROWTH_PATHS.map((p) => [p.id, p]))

/**
 * Score and rank growth paths for a user based on their affinities.
 * Returns paths sorted by dot-product score (highest first).
 */
export function rankGrowthPaths(
  affinities: Partial<Record<keyof CategoryAffinities, number>>
): Array<GrowthPath & { score: number }> {
  return ALL_GROWTH_PATHS
    .map((path) => {
      let score = 0
      for (const [key, weight] of Object.entries(path.affinities)) {
        score += (affinities[key as keyof CategoryAffinities] ?? 0) * (weight ?? 0)
      }
      return { ...path, score: Math.round(score * 100) }
    })
    .sort((a, b) => b.score - a.score)
}
