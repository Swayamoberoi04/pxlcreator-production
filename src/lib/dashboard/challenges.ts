/**
 * src/lib/dashboard/challenges.ts
 *
 * Challenge content library. Each challenge is a structured programme
 * with real daily prompts, tips, and learning outcomes.
 *
 * Challenge content is defined as TypeScript constants — no DB rows.
 * User completion state (which days are done) is stored in challenge_completions.
 */

import type { CategoryAffinities } from "@/types/onboarding"

export interface ChallengeDay {
  day:               number
  title:             string
  prompt:            string
  tip:               string
  estimatedMinutes:  number
  skills:            string[]
  presetRecommended?: string
}

export interface Challenge {
  id:               string
  title:            string
  tagline:          string
  description:      string
  totalDays:        number
  difficulty:       "beginner" | "intermediate" | "advanced"
  icon:             string
  color:            string
  reward:           string
  badge:            string
  affinities:       Partial<CategoryAffinities>
  days:             ChallengeDay[]
}

/* ── 30-Day Cinematic Challenge ─────────────────────────────── */
const cinematicChallenge: Challenge = {
  id:          "30-day-cinematic",
  title:       "30-Day Cinematic Challenge",
  tagline:     "One frame. One story. Every day.",
  description: "Thirty daily prompts designed to build your cinematic eye — from finding the right light to telling complete visual stories. Each day takes 20–45 minutes and leaves you with a portfolio-ready frame.",
  totalDays:   30,
  difficulty:  "intermediate",
  icon:        "🎬",
  color:       "#c2855a",
  reward:      "Moody Cinematic Bundle (unlocked at completion)",
  badge:       "Cinematic Creator",
  affinities:  { cinematic: 0.9, film: 0.6, dark_luxury: 0.4 },
  days: [
    { day: 1,  title: "Golden Hour Opening",    prompt: "Find the light that bleeds through windows or trees in the last hour before sunset. Frame it as if it's the opening shot of a film. No people needed — light itself is the subject. Expose for the highlights, not the shadows.", tip: "Use Exposure Compensation -1 to avoid blowing out the warm tones. Let the shadows go dark.", estimatedMinutes: 40, skills: ["Golden hour timing", "Exposure control"], presetRecommended: "moody-cinematic-bundle" },
    { day: 2,  title: "Silhouette Story",       prompt: "Use a strong backlight (window, setting sun, lamp behind a curtain) to create a dramatic silhouette. The shape alone must communicate something — a person in a doorway, hands around a cup, a figure against a city skyline. No flash.", tip: "Expose for the brightest part of the frame (the background). The subject should go completely black.", estimatedMinutes: 30, skills: ["Backlight technique", "Exposure lock"] },
    { day: 3,  title: "Urban Geometry",         prompt: "Find repeating geometric patterns in your environment: stairwells, parking structures, bridge supports, tunnels, tiled walls. Shoot the pattern from an unexpected angle — often looking up or down is more cinematic than straight ahead.", tip: "Use the gridlines in your camera/phone to align the geometry precisely. Slight angles look accidental; bold angles look intentional.", estimatedMinutes: 35, skills: ["Composition", "Architecture photography"] },
    { day: 4,  title: "Motion with Intent",     prompt: "Capture motion deliberately. Set your shutter to 1/30s and photograph a moving element — traffic, water, a person walking — against a static background. The blur should feel intentional, like a cinematic long exposure, not a mistake.", tip: "Use a tripod or brace against a wall. Burst shoot 10 frames and pick the one with the best motion trail.", estimatedMinutes: 40, skills: ["Slow shutter technique", "Intentional blur"] },
    { day: 5,  title: "Foreground Depth",       prompt: "Use a foreground element to create cinematic depth and compression. Shoot through something — glass, foliage, wire mesh, a window frame. The foreground doesn't need to be in focus. It exists purely to create the sense of layers a film frame has.", tip: "Get the foreground element very close to your lens and open your aperture wide (f/1.8–f/2.8). The background will compress beautifully.", estimatedMinutes: 30, skills: ["Depth of field", "Layered composition"] },
    { day: 6,  title: "The Empty Frame",        prompt: "Shoot a scene with no people, but where the presence of people is implied: a coffee cup half-finished on a table, an empty chair by a window, unmade bedsheets in early morning light. Absence can be more powerful than presence.", tip: "The light tells the story. Shoot in the first 90 minutes of the day or the last 30 before sunset.", estimatedMinutes: 25, skills: ["Implied narrative", "Still life storytelling"] },
    { day: 7,  title: "Rain and Reflection",    prompt: "Find a wet surface — pavement after rain, a puddle, a reflective floor. Compose so that the reflection tells the story as much as the subject above it. The inverted world in the reflection is where the cinematic magic lives.", tip: "Shoot low — nearly parallel to the surface. Hold your phone flat or use LiveView on DSLR. Keep the horizon invisible.", estimatedMinutes: 35, skills: ["Reflection composition", "Low angle shooting"], presetRecommended: "moody-cinematic-bundle" },
    { day: 8,  title: "Long Shadow",            prompt: "Early morning or late afternoon: find a long, dramatic shadow cast by a person, a fence, a tree. The shadow must have character — stretch it, use it as a leading line, make it the compositional anchor of the frame.", tip: "Position yourself so the sun is behind your subject at a very low angle (within 1 hour of sunrise/sunset).", estimatedMinutes: 30, skills: ["Shadow as subject", "Low angle light"] },
    { day: 9,  title: "Window Light Interior",  prompt: "Shoot an interior scene lit purely by window light. No lamps, no overhead lights. The contrast between the bright window light and the deep shadow creates the Rembrandt look used in every major film. One window, one subject.", tip: "Position your subject 45° to the window. Shoot from the shadow side to preserve the full tonal range.", estimatedMinutes: 30, skills: ["Rembrandt lighting", "Interior photography"] },
    { day: 10, title: "The City at Night",      prompt: "Stay out 30 minutes after the street lights come on. Shoot the city night scene: neon reflections on wet streets, the blue hour sky behind warm building lights, the isolation of a single figure under a streetlight.", tip: "Open aperture wide, raise ISO to 1600–3200, and lean on a lamppost or railing instead of a tripod. Shoot in RAW.", estimatedMinutes: 45, skills: ["Night photography", "Mixed artificial light"] },
    { day: 11, title: "Texture Close-Up",       prompt: "Go extreme close-up on texture: weathered paint, cracked concrete, worn leather, bark, fabric weave. Fill the entire frame with texture. There is no context — the texture IS the image. Cinematic intimacy lives in surfaces.", tip: "Use macro mode or minimum focus distance. Shoot at angle to the surface to emphasise the texture with raking light.", estimatedMinutes: 25, skills: ["Macro photography", "Texture and detail"] },
    { day: 12, title: "The Portrait Without Face", prompt: "Photograph a person without showing their face. A hand over a coffee cup, a figure walking away down a corridor, a profile looking out of frame, hands clasped in lap. The implied presence without identity creates universal cinematic tension.", tip: "The body language must tell an emotional state. Watch how your subject holds their shoulders, hands, and head.", estimatedMinutes: 35, skills: ["Anonymous portraiture", "Body language"] },
    { day: 13, title: "Film Frame Study",       prompt: "Choose a still from a film you love. Recreate it in your environment. Not literally — find the essence: the light quality, the composition, the emotional register. Study what makes the original frame great, then make your own version of that greatness.", tip: "Use a still from a director known for visual storytelling: Roger Deakins (Blade Runner 2049), Emmanuel Lubezki (The Revenant), Hoyte van Hoytema (Dunkirk).", estimatedMinutes: 50, skills: ["Film analysis", "Reference-based composition"], presetRecommended: "cinema-lut-pack" },
    { day: 14, title: "Half-Way Point Review",  prompt: "This is your mid-challenge review day. Lay out your best 7 frames from Days 1–13 in a grid. Study them as a set: Is there a consistent voice emerging? Which days produced the weakest results and why? What do your strongest frames have in common?", tip: "Print or display at screen size — thumbnail review doesn't count. The image at full size reveals what you missed.", estimatedMinutes: 30, skills: ["Self-critique", "Series curation"] },
    { day: 15, title: "Colour as Emotion",      prompt: "Shoot something specifically to isolate a single emotional colour. Cold blue for loneliness or isolation. Warm amber for safety and comfort. Sickly green for unease. The entire frame must carry the emotional message of that one colour. No mixed palette.", tip: "Scout the location first, before the shoot. A blue neon, a room with a warm lamp, an overcast skyline — pre-plan the colour palette.", estimatedMinutes: 35, skills: ["Colour theory", "Mood-based photography"], presetRecommended: "film-grain-authentic" },
    { day: 16, title: "The Transition Shot",    prompt: "Find a threshold to photograph: a doorway, a window looking out, the top of a staircase, a tunnel exit. Position your subject in the transition — neither here nor there. The best cinematic compositions live in liminal space.", tip: "The in-between location suggests character in transition, which creates viewer curiosity and emotional resonance.", estimatedMinutes: 30, skills: ["Liminal photography", "Architectural framing"] },
    { day: 17, title: "Food Cinema",            prompt: "Photograph food as if it's in a scene from a film. The steam rising from a bowl of noodles in a night market, the solitude of a half-eaten plate in an empty restaurant, coffee and a newspaper in morning light. Context and mood matter more than the food.", tip: "Mist your hot food with water and shoot quickly to catch the steam. Put something interesting in the background — out of focus story.", estimatedMinutes: 35, skills: ["Food cinematography", "Environmental context"] },
    { day: 18, title: "Eye Level Revolution",   prompt: "Today, shoot exclusively at eye level — but the eye level of someone not you. Get on your knees for a child's perspective. Shoot at the height of a dog. Shoot from the ground looking up. Eye level changes everything about how a subject relates to the viewer.", tip: "The non-standard eye level creates a subconscious relationship between viewer and subject. Low = empowering the subject. High = making the viewer powerful over the subject.", estimatedMinutes: 35, skills: ["Perspective", "Psychological composition"] },
    { day: 19, title: "Weather as Mood",        prompt: "Shoot in weather that most photographers avoid: heavy overcast, drizzle, thick fog, harsh midday sun. Each difficult lighting condition has a unique cinematic use. Fog creates mystery. Overcast is the world's largest softbox. Harsh sun creates drama.", tip: "Overcast is perfect for portraits. Fog works for landscape and street. Midday sun creates deep shadows — great for abstract and street.", estimatedMinutes: 40, skills: ["Weather photography", "Difficult lighting"] },
    { day: 20, title: "The Hands",             prompt: "Photograph hands. Working hands, old hands, young hands, hands holding something meaningful, hands in motion, hands at rest. The human hand is cinema's most expressive body part after the eyes — and much less photographed.", tip: "Use a wide aperture to isolate from the background. Shoot with natural light from a window for the most flattering skin tones.", estimatedMinutes: 25, skills: ["Detail portraiture", "Expressive detail"] },
    { day: 21, title: "Three-Quarter Edit Day", prompt: "Edit the 5 strongest images from Days 15–20. Compare your edit quality to your edits from Days 1–5. What has changed? Are you pushing the grade further? Are you more decisive about the look you want? Document what you've learned so far.", tip: "If your grade isn't getting more confident, go back and study one more reference — one film or photographer whose look you want to own.", estimatedMinutes: 45, skills: ["Editing analysis", "Colour grading progression"] },
    { day: 22, title: "Neon Night",            prompt: "Find neon lights — a sign, a light strip, a bar frontage — and photograph their reflection in rain, glass, or wet pavement. Use the neon as your sole light source. Shoot from inside looking out, or from across the street.", tip: "Underexpose by 1–1.5 stops to preserve neon colour saturation. The surroundings should go dark so the neon can dominate.", estimatedMinutes: 40, skills: ["Neon photography", "Night colour"], presetRecommended: "moody-cinematic-bundle" },
    { day: 23, title: "The Sequence",          prompt: "Shoot a 3-frame sequence: before, during, after. It could be tiny (coffee cup empty → being filled → full and steaming) or large (dawn light on a building → the light moving → golden side-lit afternoon). Edit them consistently and sequence them as a triptych.", tip: "Shoot all 3 frames from exactly the same position and framing — only the subject state changes. Lock the camera/phone in place.", estimatedMinutes: 45, skills: ["Sequencing", "Narrative photography"] },
    { day: 24, title: "Your City at 6am",      prompt: "Wake up before the city. Shoot the streets at 6am — the delivery workers, the joggers, the street cleaners, the light before the crowds arrive. The city at 6am is an entirely different city to the one everyone knows. Find its character.", tip: "Bring a thermos. Spend minimum 1 hour — the light changes dramatically in the first hour of sun. Shoot RAW, bracket exposure.", estimatedMinutes: 90, skills: ["Street photography", "Early morning light"] },
    { day: 25, title: "Minimalism",            prompt: "Find the most minimal composition you can: one subject, one clean background, vast negative space. Remove everything that doesn't need to be there. What remains must be so precise that removing anything further would destroy the image.", tip: "Look for subjects against a flat sky, a white wall, or a still body of water. Exposure must be perfect — minimal images have nowhere to hide flaws.", estimatedMinutes: 30, skills: ["Minimal composition", "Negative space"] },
    { day: 26, title: "Film Emulation",        prompt: "Shoot with the explicit goal of making a digital image look like it was shot on a specific film stock. Research Kodak Portra 400, Fuji Provia 100, or Ilford HP5. Shoot in the same lighting those stocks were designed for, then grade toward that look.", tip: "Film emulation works best with flat, even daylight or window light — the same conditions where film excelled. Avoid dynamic scenes that film couldn't capture.", estimatedMinutes: 40, skills: ["Film emulation", "Analogue aesthetics"], presetRecommended: "film-grain-authentic" },
    { day: 27, title: "The Decisive Moment",   prompt: "This is Cartier-Bresson's challenge. Go to a location with human activity and wait for a single perfect moment where all elements align: geometry, light, and human action. You may wait 30 minutes for one frame. That one frame is the point.", tip: "Pre-compose your frame without a subject. Wait for the right person to enter the frame at the right moment. Anticipation, not reaction.", estimatedMinutes: 60, skills: ["Decisive moment", "Patience and timing"] },
    { day: 28, title: "Sound Into Vision",     prompt: "Choose a piece of music you love. Listen to it once with your eyes closed. What images did it generate? Go shoot those images. Let sound inform vision. This is how film composers work in reverse — start from the emotion the sound creates.", tip: "Choose 1–3 minutes of cinematic instrumental music. Film scores by Ennio Morricone, Hans Zimmer, or Nils Frahm work well.", estimatedMinutes: 50, skills: ["Cross-modal inspiration", "Concept-to-image"] },
    { day: 29, title: "Your Signature Shot",   prompt: "Create the single image that best represents everything you've learned in this challenge. Bring everything: your best light, your strongest composition, your most intentional grade, your most honest subject. This is your signature frame from the 30-day challenge.", tip: "Don't rush this one. Scout the location, plan the light, and return at the right time. Make it deliberate.", estimatedMinutes: 75, skills: ["Synthesis", "Intentional image-making"], presetRecommended: "cinema-lut-pack" },
    { day: 30, title: "Review and Publish",    prompt: "The final day. Select your 10 best frames from the 30-day challenge. Edit them to a consistent, cohesive standard. Write one sentence about each explaining what you were going for and whether you got it. Publish the series to PXL Showcase with #30DayCinematic.", tip: "Look for the common thread across your best images. That thread IS your emerging visual voice. Name it. Own it. Build from it.", estimatedMinutes: 90, skills: ["Curation", "Portfolio building", "Series editing"] },
  ],
}

/* ── 7-Day Portrait Aesthetic Week ──────────────────────────── */
const portraitWeekChallenge: Challenge = {
  id:          "portrait-aesthetic-week",
  title:       "Aesthetic Portrait Week",
  tagline:     "7 days. 7 styles. Find your signature portrait look.",
  description: "Seven consecutive days of portrait photography in seven different styles. By Day 7, you'll have experienced every major portrait aesthetic and discovered which one feels most authentically yours.",
  totalDays:   7,
  difficulty:  "beginner",
  icon:        "📸",
  color:       "#e8a87c",
  reward:      "Portrait Skin Luxury Preset (unlocked at completion)",
  badge:       "Portrait Specialist",
  affinities:  { portrait: 0.9, fashion: 0.5, editorial: 0.5 },
  days: [
    { day: 1, title: "Soft Natural Window Light",   prompt: "Position your subject 45° to a north-facing window (or any window not in direct sun). Expose for the shadows — let the highlight side of their face be bright but not blown. Shoot at f/2–f/2.8. The quality of light should feel like a Sunday morning: soft, honest, unhurried.", tip: "Add a white foam board or white sheet opposite the window to bounce fill light into the shadow side for a softer look.", estimatedMinutes: 45, skills: ["Natural light", "Window positioning"], presetRecommended: "portrait-skin-luxury" },
    { day: 2, title: "Fashion Editorial",           prompt: "Direct your subject to channel high fashion: strong posture, angular poses, direct or away eye contact, confidence in stillness. Choose a graphic background — a plain wall, a stark architectural surface. Underexpose by 1 stop for drama.", tip: "Give your subject specific direction, not generic 'look confident'. Say: chin up, shoulders back, breathe out, now look through me — not at me.", estimatedMinutes: 50, skills: ["Fashion direction", "Editorial posing"] },
    { day: 3, title: "Candid Lifestyle",            prompt: "Photograph your subject in their natural environment doing something real: reading, cooking, working on their craft, playing with a pet. They must not be 'performing' for the camera. Your job is to disappear and capture authentic moments.", tip: "Talk to your subject constantly — asking questions, telling stories. The moment they forget you're there is when the real photograph happens.", estimatedMinutes: 60, skills: ["Candid photography", "Environmental portrait"] },
    { day: 4, title: "Black & White High Contrast", prompt: "Convert to mono in camera or as your first edit step (shoot RAW, convert after). Build high contrast: deepen the shadows, lift the midtones, bring structure all the way to 100. Dodge the eyes, burn the hair slightly. The result should feel like a contact sheet from a 1960s photographer.", tip: "In B&W, skin tone is controlled by the Red and Orange sliders in the B&W mix. Raise Orange for brighter, more glowing skin in mono.", estimatedMinutes: 45, skills: ["B&W conversion", "Dodge and burn"], presetRecommended: "film-grain-authentic" },
    { day: 5, title: "Environmental Portrait",      prompt: "Your subject must be in a location that reveals something essential about who they are: their studio, their workspace, their favourite outdoor spot, in the context of their tools or passion. The environment tells as much story as the face.", tip: "Find the best natural light in that environment first, then position your subject in relation to it. The location is secondary to the light quality.", estimatedMinutes: 75, skills: ["Environmental context", "Storytelling portrait"] },
    { day: 6, title: "Rim Light Drama",             prompt: "Use a single backlight (a lamp positioned directly behind and slightly above the subject, or a window behind them) to create a 'halo' of light around the hair and shoulders. The face should be in relative shadow — lit only by ambient fill. It's used in every serious portrait film.", tip: "Expose for the bright rim light, then use a reflector in front of the subject to bring some fill light back to the face.", estimatedMinutes: 40, skills: ["Rim lighting", "Dramatic lighting"] },
    { day: 7, title: "Golden Hour Magic",           prompt: "The final day, the best light of the week. 45 minutes before sunset, take your subject outdoors. Position them with the warm light coming from the side and slightly behind. Shoot toward the light but keep the subject's face in shade or with gentle side-rim light. Edit warm, edit soft.", tip: "Arrive 1 hour early and find 3 different positions. Map where the light will be at its warmest — often lower than you expect.", estimatedMinutes: 75, skills: ["Golden hour", "Outdoor portrait"], presetRecommended: "portrait-skin-luxury" },
  ],
}

/* ── 10-Day Travel Photo Sprint ─────────────────────────────── */
const travelSprintChallenge: Challenge = {
  id:          "travel-photo-sprint",
  title:       "Travel Photo Sprint",
  tagline:     "10 images. 10 days. One complete visual story.",
  description: "A structured 10-day sprint that guides you through building a complete travel photography story — from the establishing shot to the intimate detail. By Day 10 you'll have a publishable series.",
  totalDays:   10,
  difficulty:  "beginner",
  icon:        "🌍",
  color:       "#6fba8a",
  reward:      "Golden Travel Pack Preset (unlocked at completion)",
  badge:       "Travel Storyteller",
  affinities:  { travel: 0.9, nature: 0.7, cinematic: 0.3 },
  days: [
    { day: 1,  title: "The Establishing Shot",  prompt: "Day 1 of your story: the wide, establishing shot. Show where your story takes place. This could be a street corner, a landscape, a market square, a rooftop, a path into a forest. The viewer must understand the world they're entering. Shoot wide, show scale.", tip: "Include a human element even if tiny — it gives the viewer a scale reference and an emotional entry point to the location.", estimatedMinutes: 45, skills: ["Wide composition", "Establishing shot"], presetRecommended: "golden-travel-pack" },
    { day: 2,  title: "The Local Detail",       prompt: "Find a detail unique to this place — a type of food, a sign in the local language, a style of architecture, a pattern on a wall, a tool or object specific to this culture or geography. The detail reveals character the wide shot can't.", tip: "Get close. Fill the frame with the detail. No empty space needed — the detail at maximum scale is the statement.", estimatedMinutes: 35, skills: ["Detail photography", "Cultural documentation"] },
    { day: 3,  title: "The Local Person",       prompt: "Photograph someone who belongs to this place: not a tourist, but someone who lives and works here. A baker, a fisherman, a teacher walking to school, a vendor at a market. Approach with genuine curiosity and ask permission. Connection is everything.", tip: "Learn to say 'may I photograph you?' in the local language if possible. Even a failed attempt leads to a human connection worth photographing.", estimatedMinutes: 60, skills: ["Environmental portrait", "Street photography"], presetRecommended: "golden-travel-pack" },
    { day: 4,  title: "The Landscape",         prompt: "Find the natural or urban landscape that defines this place. Spend 1 hour at the best light (golden hour or blue hour). Compose with foreground, midground, and background — three distinct layers that create cinematic depth. Single exposure, no HDR.", tip: "Scout the location the day before during unflattering light. Plan exactly where you'll stand and what time the light will be perfect.", estimatedMinutes: 90, skills: ["Landscape photography", "Golden hour"] },
    { day: 5,  title: "The Action",            prompt: "Photograph movement and activity: a market in full operation, children playing, fishermen unloading catches, craftspeople at work. Capture the energy and industry of a place in motion. Use a slightly slower shutter for implied motion.", tip: "Set shutter to 1/80s–1/250s for slight motion blur on moving subjects while keeping the scene sharp. Prefocus on the area where the action will peak.", estimatedMinutes: 50, skills: ["Action photography", "Street documentary"] },
    { day: 6,  title: "Light Study",           prompt: "This day is about light itself, not the subject. Find a location where light behaves in an exceptional way — through a market awning, through the lattice of a mosque, through forest canopy, through glass or curtains. Let the light pattern be the composition.", tip: "Arrive early — when the sun is low, the angles are most dramatic. Once the sun is high, the effect often disappears.", estimatedMinutes: 45, skills: ["Light as subject", "Atmospheric photography"] },
    { day: 7,  title: "Food and Community",    prompt: "Shared food is the most universal human story. Find and photograph a meal — not just the food, but the context: the hands sharing it, the table it's served on, the fire it's cooked over, the laughter around it. The meal is a metaphor for belonging.", tip: "Get below the table level for a more immersive, cinematic angle. Show the hands, the utensils, the texture of the surface.", estimatedMinutes: 40, skills: ["Food photography", "Community documentation"] },
    { day: 8,  title: "Architecture and Scale", prompt: "Find the architecture that gives this place its character — old or new, monumental or intimate. Photograph it in a way that shows human scale: a person walking through an archway, a bicycle against a cathedral wall, a child in a plaza. Context through scale.", tip: "Wait for a person who adds the right visual weight to the composition. The single figure against an overwhelming structure creates the emotional contrast.", estimatedMinutes: 45, skills: ["Architecture photography", "Scale and proportion"] },
    { day: 9,  title: "The Intimate Moment",   prompt: "Day 9 is your quiet, intimate image. A scene of small beauty: an old couple at a café, a child looking through a window, a single flower growing from a crack in stone, an empty table in a market after closing. Restraint and patience.", tip: "Slow down completely. Walk slowly. Stop often. Sit in one location for 20 minutes before taking the first frame. The intimate moments find you when you stop chasing.", estimatedMinutes: 60, skills: ["Quiet photography", "Moment photography"] },
    { day: 10, title: "The Closing Frame",     prompt: "Day 10 is your final image — the closing shot of your travel story. It should feel like an ending: a sunset or sunrise, a figure departing, a light turning off, an empty road or path leading out of frame. Emotional resolution. Warmth, or haunting absence.", tip: "This image often works best when it references or rhymes with Day 1's establishing shot — closing a visual circle.", estimatedMinutes: 60, skills: ["Narrative closure", "Series completion"], presetRecommended: "golden-travel-pack" },
  ],
}

/* ── 14-Day Mobile Creator Challenge ─────────────────────────── */
const mobileCreatorChallenge: Challenge = {
  id:          "14-day-mobile",
  title:       "14-Day Mobile Creator Challenge",
  tagline:     "Your phone is a professional camera. Prove it.",
  description: "Fourteen days of daily mobile photography and content challenges. By the end, you'll have 14 portfolio-quality images and a repeatable mobile content workflow.",
  totalDays:   14,
  difficulty:  "beginner",
  icon:        "📱",
  color:       "#7cb5e0",
  reward:      "Mobile Creator Pack Preset (unlocked at completion)",
  badge:       "Mobile Pro",
  affinities:  { mobile: 0.9, minimal: 0.5, portrait: 0.3 },
  days: [
    { day: 1,  title: "ProRAW First Shoot",         prompt: "Enable ProRAW (iPhone) or Expert RAW (Samsung/Pixel). Shoot 10 frames of anything in this format. Compare the RAW file edit range to a JPEG from the same scene. Notice: RAW shadow recovery is 2–3 stops better than JPEG. This changes everything.", tip: "ProRAW files are 10–25MB vs 3–5MB JPEG. You'll need storage. But the editing headroom makes it worth it for any important shot.", estimatedMinutes: 30, skills: ["ProRAW workflow", "RAW vs JPEG"], presetRecommended: "mobile-creator-pack" },
    { day: 2,  title: "Lightroom Mobile Setup",     prompt: "Install Lightroom Mobile and configure your workspace. Set up your first custom preset using: +10 Exposure, -20 Highlights, +30 Shadows, +15 Whites, -15 Blacks, -10 Vibrance. This starter preset is your safety net for any scene.", tip: "In LRM, go to Settings > Local Adjustments to enable AI masking. This alone justifies using the app over Instagram's native editor.", estimatedMinutes: 25, skills: ["Lightroom Mobile", "Preset creation"] },
    { day: 3,  title: "Flat Lay Composition",       prompt: "Create a flat lay — an overhead arrangement of objects on a flat surface. Choose a colour-coordinated theme: coffee and morning ritual, travel gear, art supplies, cosmetics. The arrangement must be deliberate — not just scattered. Negative space is your friend.", tip: "Shoot from directly above (not at an angle) for true flat lay. Use a step ladder or shoot from a mezzanine if possible.", estimatedMinutes: 40, skills: ["Flat lay", "Product styling"] },
    { day: 4,  title: "Portrait Mode Mastery",      prompt: "Shoot 5 portraits using Portrait Mode — but override the automatic decisions. Test all available lighting effects (Natural, Studio, Contour, Stage, Stage Mono). Manually adjust the depth level after shooting. Identify which depth level looks most realistic vs. most dramatic.", tip: "Portrait Mode works best at 1–2m from subject. At shorter distances the segmentation mask becomes imprecise and edges look cut-out.", estimatedMinutes: 35, skills: ["Portrait Mode", "Mobile bokeh"], presetRecommended: "mobile-creator-pack" },
    { day: 5,  title: "Golden Hour on Mobile",      prompt: "Mobile sensors struggle with high-dynamic-range golden hour scenes — they blow highlights aggressively. Use AE/AF Lock (tap and hold) to expose for the sky/highlights, then check if the subject is visible. Use Night Mode if shadows go black.", tip: "On iPhone: use Photo Pro app (Sony) or Halide for manual control that ProCamera gives you over the automatic scene detection.", estimatedMinutes: 40, skills: ["Mobile exposure control", "Golden hour mobile"] },
    { day: 6,  title: "Minimal Content Day",        prompt: "Minimal aesthetic: one clean subject, maximum negative space, neutral or complementary background. Shoot 10 frames. Your minimum elements should communicate maximum story. What is the absolute fewest objects you need to make a meaningful frame?", tip: "Before shooting, physically remove everything from your composition area. Only add back what genuinely needs to be there.", estimatedMinutes: 30, skills: ["Minimalism", "Negative space"], presetRecommended: "minimal-clean-white" },
    { day: 7,  title: "First Reel",                prompt: "Create your first 15-second Reel. Structure: 2-second hook (something unexpected), 10 seconds of content (your editing process, a before/after, a location reveal, or a morning routine), 3-second soft CTA ('Save for your next edit'). Post it with 5 relevant hashtags.", tip: "Shoot all clips in 1080p 60fps for smooth slow-motion capability. Cut to beat if using music. No talking in first Reel unless you're already comfortable on camera.", estimatedMinutes: 60, skills: ["Reel creation", "Short form video"] },
    { day: 8,  title: "Colour Pop Challenge",       prompt: "Find a scene where one colour is dominant against a mostly neutral or desaturated background — a red jacket in a grey street, yellow flowers against a white wall, a blue door in a stone alley. The colour contrast should be striking enough to stop someone mid-scroll.", tip: "In editing, increase Saturation of only the colour you want to pop (HSL panel). Desaturate everything else slightly to make the pop more dramatic.", estimatedMinutes: 35, skills: ["Colour isolation", "Selective editing"] },
    { day: 9,  title: "Before/After Reel",         prompt: "Shoot one photo (any subject). Apply your full editing workflow. Screen record the edit from RAW to finished image in Lightroom Mobile. Create a 15-second Reel showing the before → during → after. This is the highest-engagement format in the photo editing niche.", tip: "Speed up the recording 2–4× in post. Show your most dramatic adjustment first — usually the biggest Highlights pull or the Shadows lift.", estimatedMinutes: 50, skills: ["Before/after content", "Screen recording"] },
    { day: 10, title: "Street Mobile",              prompt: "Take your mobile phone to a busy public space for 45 minutes. Shoot street photography: decisive moments, human geometry, unexpected beauty in everyday scenes. Mobile phones are invisible street cameras — people don't react to them the way they react to large cameras.", tip: "Use the Volume button as a shutter for one-handed discreet shooting. Pre-focus by tapping before the moment arrives.", estimatedMinutes: 45, skills: ["Mobile street photography", "Discreet shooting"] },
    { day: 11, title: "Product Photography",        prompt: "Choose any household product — perfume, coffee, book, skincare, food. Create a commercial-quality product shot on your phone. Soft window light or a ring light, a clean background (paper or table), and a deliberate composition. This skill has direct commercial value.", tip: "Use a piece of white paper as both surface and backdrop — tape it to a wall and let it curve down for the seamless infinity look.", estimatedMinutes: 50, skills: ["Product photography", "Commercial mobile"] },
    { day: 12, title: "Edit 5 Friends' Photos",    prompt: "Ask 5 people in your life to send you their favourite photo they've taken this year. Edit each one with your mobile workflow. This teaches you to apply your style to someone else's vision — a crucial skill for commercial work and collaboration.", tip: "Ask the person what they were going for before you edit. Serve their vision, not yours. If their photo is bright and airy, don't make it dark and moody.", estimatedMinutes: 60, skills: ["Client editing", "Adaptive workflow"] },
    { day: 13, title: "Your Best Mobile Portfolio Set", prompt: "From the last 13 days, curate your 6 strongest mobile images. Edit them to a consistent standard — same colour temperature direction, same luminosity level. This is your mobile photography portfolio. It should be good enough to show a brand.", tip: "Don't include a technically weak image just because the subject is interesting. Technical consistency is what makes a portfolio set trustworthy to brands.", estimatedMinutes: 60, skills: ["Portfolio curation", "Series consistency"], presetRecommended: "mobile-creator-pack" },
    { day: 14, title: "Publish and Pitch",         prompt: "Final day. Post your 6 best mobile images to Instagram as a carousel with the caption: '[Your phone model] + [your preset/workflow]. 14 days of intentional mobile photography.' Tag any brands whose products appear. DM 2 brands with your mobile photography portfolio.", tip: "A mobile photography showcase that proves camera phone capability is directly valuable to brands with similar target audiences. This is your calling card.", estimatedMinutes: 45, skills: ["Portfolio publishing", "Brand outreach"] },
  ],
}

/* ── 5-Day Film Emulation Experiment ─────────────────────────── */
const filmEmulationChallenge: Challenge = {
  id:          "film-emulation-5-day",
  title:       "5-Day Film Emulation Experiment",
  tagline:     "Teach your digital camera to think in film.",
  description: "Five days of shooting and editing with the explicit goal of emulating classic film stocks. By Day 5 you'll understand why film looks the way it does and how to replicate it digitally.",
  totalDays:   5,
  difficulty:  "intermediate",
  icon:        "🎞️",
  color:       "#d4a373",
  reward:      "Film Grain Authentic Preset Pack (unlocked at completion)",
  badge:       "Film Purist",
  affinities:  { film: 0.9, vintage: 0.8, cinematic: 0.4 },
  days: [
    { day: 1, title: "Kodak Portra 400 Study",  prompt: "Kodak Portra 400 is the standard for modern film emulation: warm midtones, compressed highlights, lifted shadows, subtle grain, desaturated-but-not-dead colours. Shoot 10 frames in flat, even daylight or window light — the conditions Portra was designed for. Then edit each to match the reference. No filters.", tip: "Key to Portra: raise your shadows so blacks are never truly black. The film base gives a slight density to the darkest areas. Lifted blacks = instant film feel.", estimatedMinutes: 60, skills: ["Portra emulation", "Film stock analysis"], presetRecommended: "film-grain-authentic" },
    { day: 2, title: "Kodak Tri-X 400 B&W",    prompt: "Tri-X is the definitive B&W street film: high contrast, prominent grain, deep blacks that still retain some shadow detail. Shoot 10 street or documentary frames specifically for Tri-X conversion. Convert in the B&W mix panel, add grain at 60–70, reduce Clarity slightly for authentic halation.", tip: "Tri-X grain is large and visible even at moderate sizes. Don't be afraid of heavy grain. It's part of the aesthetic character, not a technical failure.", estimatedMinutes: 50, skills: ["B&W film emulation", "Grain management"], presetRecommended: "film-grain-authentic" },
    { day: 3, title: "Fuji Velvia 50 Landscape", prompt: "Velvia 50 is the hyperrealist landscape slide film: punchy saturation, deep greens, bright reds, a slightly cool bias in the shadows. It's the opposite of Portra — aggressive, intense. Shoot a landscape or nature scene, then edit it to be the most saturated and vivid your eye finds credible.", tip: "Velvia looks extreme at first. Let it sit. Come back in an hour and look again. Our eyes adjust. If it looks exactly like reality after a day, add more saturation.", estimatedMinutes: 55, skills: ["Landscape saturation", "Slide film emulation"] },
    { day: 4, title: "Cross-Processing Effect",  prompt: "Cross-processing (developing slide film in negative chemicals or vice versa) creates colour shifts no standard film produces: cyan in shadows, yellow/red cast in highlights, increased contrast and grain. Study a reference, then recreate the specific colour shift in your tone curves (blue up in highlights, red/green correction in shadows).", tip: "Cross-process curves: pull the blue curve up in the shadow zone, pull red up in the highlights, boost overall contrast. The result should look deliberately wrong in a beautiful way.", estimatedMinutes: 50, skills: ["Cross-process technique", "Tone curve manipulation"] },
    { day: 5, title: "Your Film Preset Collection", prompt: "Today you build a 4-preset collection based on the last 4 days: Portra Modern, Tri-X Mono, Velvia Landscape, Cross-Process. Save each as a named preset. Apply each to the same test photo and compare all 4 side-by-side. These 4 presets are your analogue toolkit.", tip: "Export the preset collection as a shareable set. This becomes a product you can sell or share with your community. Real film presets built by someone who studied the originals have genuine value.", estimatedMinutes: 75, skills: ["Preset creation", "Film stock range"], presetRecommended: "film-grain-authentic" },
  ],
}

/* ── All challenges exported ─────────────────────────────────── */
export const ALL_CHALLENGES: Challenge[] = [
  cinematicChallenge,
  portraitWeekChallenge,
  travelSprintChallenge,
  mobileCreatorChallenge,
  filmEmulationChallenge,
]

export const CHALLENGE_MAP: Record<string, Challenge> =
  Object.fromEntries(ALL_CHALLENGES.map((c) => [c.id, c]))

/**
 * Score and rank challenges for a user based on their affinities.
 */
export function rankChallenges(
  affinities: Partial<Record<keyof CategoryAffinities, number>>
): Array<Challenge & { score: number }> {
  return ALL_CHALLENGES
    .map((challenge) => {
      let score = 0
      for (const [key, weight] of Object.entries(challenge.affinities)) {
        score += (affinities[key as keyof CategoryAffinities] ?? 0) * (weight ?? 0)
      }
      return { ...challenge, score: Math.round(score * 100) }
    })
    .sort((a, b) => b.score - a.score)
}
