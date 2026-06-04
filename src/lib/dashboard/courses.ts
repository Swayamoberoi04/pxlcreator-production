/**
 * src/lib/dashboard/courses.ts
 *
 * Course content library. Each course has modules and lessons with
 * real descriptions, durations, and learning outcomes.
 *
 * Course structure is defined here as constants — no DB rows.
 * User lesson completion state is stored in course_progress.
 */

import type { CategoryAffinities } from "@/types/onboarding"

/**
 * Lesson format types.
 *
 * "read"      — instructional content to study (replaces the old "video" type;
 *               no video URL is required or expected)
 * "article"   — reference / long-form reading
 * "exercise"  — hands-on practice task
 * "checklist" — step-by-step workflow checklist to complete
 */
export type LessonType = "read" | "article" | "exercise" | "checklist"

export interface Lesson {
  id:          string
  title:       string
  description: string
  duration:    string   // e.g. "14 min"
  type:        LessonType
  free:        boolean  // first lesson(s) of each course are free
  skillsGained?: string[]
}

export interface CourseModule {
  id:          string
  title:       string
  description: string
  lessons:     Lesson[]
}

export interface Course {
  id:             string
  title:          string
  tagline:        string
  description:    string
  instructor:     string
  instructorBio:  string
  difficulty:     "beginner" | "intermediate" | "advanced"
  estimatedHours: number
  totalLessons:   number
  badge?:         string
  color:          string
  icon:           string
  affinities:     Partial<CategoryAffinities>  // for recommendation matching
  whatYouLearn:   string[]
  prerequisites:  string[]
  modules:        CourseModule[]
}

/* ── Lightroom Mastery: Zero to Pro ──────────────────────────── */
const lightroomMasteryCourse: Course = {
  id:             "lightroom-mastery",
  title:          "Lightroom Mastery — Zero to Pro",
  tagline:        "The complete Lightroom workflow, from first import to final export.",
  description:    "Every professional photographer uses Lightroom. This course covers the complete workflow: organising your shoots, building a repeatable develop process, mastering colour science, creating presets, and delivering client-ready galleries. No fluff — just the workflows that matter.",
  instructor:     "Alex Rivera",
  instructorBio:  "Alex is a commercial photographer with 12 years of experience shooting for brands including Nike, Airbnb, and National Geographic. He's developed editorial workflows for publications across 15 countries.",
  difficulty:     "beginner",
  estimatedHours: 6,
  totalLessons:   20,
  badge:          "Lightroom Certified",
  color:          "#7cb5e0",
  icon:           "🎛",
  affinities:     { minimal: 0.5, portrait: 0.4, cinematic: 0.3, travel: 0.3 },
  whatYouLearn: [
    "Import, organise, and backup your entire photo library",
    "The professional Develop workflow that works for every image",
    "Master HSL, tone curves, and colour science fundamentals",
    "Create, export, and sell your own preset packs",
    "Batch edit large shoots with perfect consistency",
    "Deliver professional client galleries with zero bottleneck",
  ],
  prerequisites: [
    "A camera (DSLR, mirrorless, or even mobile camera)",
    "Adobe Lightroom Classic (desktop) — 7-day free trial available",
    "No prior editing experience required",
  ],
  modules: [
    {
      id:          "lr-m1",
      title:       "Import & Organisation",
      description: "Build a bulletproof library structure from day one. Most photographers waste hours searching for files — this module eliminates that problem permanently.",
      lessons: [
        { id: "lr-l1",  title: "Understanding the Lightroom Catalog",          description: "Learn why Lightroom uses a catalog instead of editing files directly. Understand the difference between the catalog (.lrcat file) and your actual photos on disk. This mental model prevents data loss and confusion.", duration: "12 min", type: "read",     free: true,  skillsGained: ["Catalog management", "Non-destructive editing concept"] },
        { id: "lr-l2",  title: "Smart Import: Settings That Save Hours",        description: "Configure your import settings once and save hours every shoot: Auto-add to collection, apply a develop preset on import (custom base tone), rename by date-time-sequence, and copy to a dated folder structure. Automate the tedious.", duration: "10 min", type: "read",     free: false, skillsGained: ["Import workflow", "Auto-organisation"] },
        { id: "lr-l3",  title: "The Keywording System That Works",              description: "Most photographers keyword wrong — they apply too many or too few. The 3-tier system: Location (Country/City/Venue), Subject (Person Name / Subject Type), and Style (Aesthetic Tag). This makes searching your 50,000-image library feel instant.", duration: "12 min", type: "article",  free: false, skillsGained: ["Keywording", "Library search"] },
        { id: "lr-l4",  title: "Backup Strategy: Protecting Your Work",         description: "The 3-2-1 backup rule: 3 copies, 2 local (different drives), 1 offsite (cloud). Set up Lightroom's catalog backup schedule, configure Time Machine or external drive backup, and connect Backblaze or similar cloud. Never lose a file again.", duration: "8 min",  type: "article",  free: false, skillsGained: ["Backup workflow", "Data protection"] },
      ],
    },
    {
      id:          "lr-m2",
      title:       "The Develop Module",
      description: "Where every photographic decision happens. Master all controls in the correct order — the order that professional retouchers use.",
      lessons: [
        { id: "lr-l5",  title: "Reading the Histogram Like a Pro",             description: "The histogram tells you everything your eyes can't: exactly where your highlights are clipping, where shadows are blocked, and whether your exposure is technically correct. Learn to diagnose any photo in 5 seconds using only the histogram.", duration: "10 min", type: "read",     free: false, skillsGained: ["Histogram reading", "Exposure diagnosis"] },
        { id: "lr-l6",  title: "Exposure and Tone: The 5-Slider Foundation",   description: "Exposure, Contrast, Highlights, Shadows, Whites, Blacks — in that order, for a reason. Understand why each slider affects a different tonal range and how to use them together to recover both highlight and shadow detail simultaneously.", duration: "18 min", type: "read",     free: false, skillsGained: ["Tone controls", "Exposure recovery"] },
        { id: "lr-l7",  title: "White Balance: The Foundation of Natural Colour", description: "Every colour decision downstream depends on your white balance. Learn the Temperature/Tint relationship, how to use the eyedropper correctly (on what neutral surface), and when to intentionally break 'correct' white balance for creative effect.", duration: "14 min", type: "read",     free: false, skillsGained: ["White balance", "Colour correction"] },
        { id: "lr-l8",  title: "HSL Panel: Surgical Colour Control",           description: "The Hue/Saturation/Luminance panel is where good editors become great ones. Learn to isolate and adjust specific colour ranges without affecting others: fixing sky saturation without touching skin, warming grass without affecting blue shadows.", duration: "22 min", type: "read",     free: false, skillsGained: ["HSL colour control", "Secondary colour correction"] },
        { id: "lr-l9",  title: "Detail Panel: Sharpening and Noise Reduction", description: "Two opposing processes that must be balanced: sharpening adds apparent detail but amplifies noise; noise reduction smooths the image but can reduce perceived sharpness. The correct Masking slider technique applies sharpening only to edges, not grain.", duration: "16 min", type: "read",     free: false, skillsGained: ["Sharpening", "Noise reduction"] },
        { id: "lr-l10", title: "Lens Corrections and Transform",               description: "Every lens has optical flaws: chromatic aberration (colour fringing), vignetting (darker corners), and geometric distortion (barrel or pincushion). Lightroom auto-corrects most with profile-based corrections. Learn when to apply manual overrides.", duration: "10 min", type: "article",  free: false, skillsGained: ["Lens correction", "Distortion removal"] },
      ],
    },
    {
      id:          "lr-m3",
      title:       "Colour Grading and Presets",
      description: "Move from correction to creative colour — from technically accurate to distinctively beautiful. Build and monetise your own preset packs.",
      lessons: [
        { id: "lr-l11", title: "Colour Science for Photographers",              description: "Why does skin look orange instead of warm? Why does blue sky sometimes look cyan? Why do shadows shift colour in unexpected ways? Understand the photographic colour space, how sensors see differently from human eyes, and how to compensate deliberately.", duration: "24 min", type: "read",     free: false, skillsGained: ["Colour science", "Colour theory"] },
        { id: "lr-l12", title: "The Colour Grading Panel: Split Toning 2.0",   description: "The Colour Grading panel (Shadows, Midtones, Highlights wheels) lets you apply creative colour shifts independently to tonal ranges. This is where the warm shadows/cool highlights or teal-orange look is built. Learn the 4 most commercially useful colour grade recipes.", duration: "20 min", type: "read",     free: false, skillsGained: ["Split toning", "Creative colour grading"] },
        { id: "lr-l13", title: "Installing and Applying Presets Correctly",     description: "Presets are starting points, not finishing lines. Learn to install presets (XMP and DNG formats), when to hold Shift while applying (Smart Sync), and how to evaluate whether a preset needs to be adjusted for a specific image's exposure, white balance, or skin tone.", duration: "12 min", type: "read",     free: false, skillsGained: ["Preset application", "Workflow efficiency"] },
        { id: "lr-l14", title: "Building Your Own Preset Pack (Commercially Ready)", description: "Create a 5-preset pack from scratch: name each preset for the look it creates (not for the settings), test on 10 different images across different lighting, and export as XMP files. Package with preview images and a PDF install guide. This is a sellable product.", duration: "30 min", type: "exercise", free: false, skillsGained: ["Preset creation", "Product development"] },
        { id: "lr-l15", title: "Batch Editing for Consistency Across a Shoot", description: "Editing 500 wedding images in 8 hours is a professional benchmark. The system: (1) Master edit on one representative image, (2) Sync settings to all images in batch, (3) Individual exposure corrections only. Smart previews, Collection sets, and Auto-sync explained.", duration: "18 min", type: "read",     free: false, skillsGained: ["Batch editing", "Consistency workflow"] },
      ],
    },
    {
      id:          "lr-m4",
      title:       "Export and Delivery",
      description: "The difference between a great photographer and a great professional is a reliable, bulletproof delivery system. Build yours here.",
      lessons: [
        { id: "lr-l16", title: "Export Settings: Understanding Every Option",   description: "JPEG vs. TIFF vs. DNG. sRGB vs. AdobeRGB vs. ProPhoto. What does 'Long Edge: 2048' mean in practice? Understand every export setting and know exactly which combination to use for social media, print, client delivery, and portfolio display.", duration: "16 min", type: "read",     free: false, skillsGained: ["Export workflow", "Format understanding"] },
        { id: "lr-l17", title: "Web vs. Print vs. Social: The Right Settings", description: "Instagram compresses JPEG aggressively after 1080px wide. Printing requires minimum 300 DPI at final print size. Portfolio sites benefit from 2048px long edge. Each platform demands different settings. Build 4 export presets: one for each major use case.", duration: "12 min", type: "article",  free: false, skillsGained: ["Platform-specific export", "Resolution knowledge"] },
        { id: "lr-l18", title: "Watermarking and Metadata",                    description: "Professional metadata embedding: copyright statement, website URL, contact info, usage rights. Watermarking strategies: visible watermark (for undelivered proofs), subtle edge watermark (for social), or invisible EXIF-only copyright (for client deliverables).", duration: "10 min", type: "article",  free: false, skillsGained: ["Copyright protection", "Professional metadata"] },
        { id: "lr-l19", title: "Delivering Professional Client Galleries",     description: "Use Lightroom's built-in Web Gallery for client review, or export to Pixieset/ShootProof for professional delivery. Set up a watermarked proof gallery for client selection, then deliver unwatermarked full-resolution files only after payment confirmation.", duration: "20 min", type: "read",     free: false, skillsGained: ["Client gallery delivery", "Professional workflow"] },
        { id: "lr-l20", title: "Your Complete Lightroom Workflow Checklist",   description: "A capstone lesson walking through the complete workflow on a real shoot from import to delivery. Timed benchmark: you should be able to cull, edit, and export 100 images in under 4 hours. The workflow checklist is downloadable and reusable for every shoot.", duration: "25 min", type: "checklist", free: false, skillsGained: ["Complete workflow mastery", "Speed and efficiency"] },
      ],
    },
  ],
}

/* ── Cinematic Color Grading Masterclass ─────────────────────── */
const colorGradingCourse: Course = {
  id:             "color-grading-masterclass",
  title:          "Cinematic Color Grading Masterclass",
  tagline:        "Advanced colour theory, technical precision, and the looks that define modern cinema.",
  description:    "The definitive colour grading course for video creators, filmmakers, and advanced photographers who want to achieve a genuine cinematic quality in their work. Covers both DaVinci Resolve and Lightroom, with a focus on the technical and creative principles that transfer to any tool.",
  instructor:     "Jordan Nakamura",
  instructorBio:  "Jordan has graded features, series, and commercial campaigns for Netflix, Apple TV+, and HBO. Their work has been seen in 40+ countries. Based in Los Angeles.",
  difficulty:     "advanced",
  estimatedHours: 9,
  totalLessons:   25,
  badge:          "Certified Colorist",
  color:          "#c2855a",
  icon:           "🎬",
  affinities:     { cinematic: 0.9, film: 0.8, dark_luxury: 0.6, commercial: 0.5 },
  whatYouLearn: [
    "Professional node-based colour grading in DaVinci Resolve",
    "The full pipeline from camera native colour to final deliverable",
    "HSL qualification, masking, and secondary corrections",
    "Film emulation: how to make digital footage look like film stock",
    "Commercial, fashion, and cinematic grade recipes from scratch",
    "Colour science: gamma, gamut, LUTs, and ACES workflows",
  ],
  prerequisites: [
    "Working knowledge of Lightroom or Premiere Pro",
    "Basic understanding of exposure and white balance",
    "DaVinci Resolve (free version sufficient for all lessons)",
    "Any footage — even phone video works for practice",
  ],
  modules: [
    {
      id:          "cg-m1",
      title:       "Foundation: Colour Science You Actually Need",
      description: "Professional colour grading starts with understanding the physics and mathematics of how colour works. This is not academic — it's the practical knowledge that separates guesswork from intention.",
      lessons: [
        { id: "cg-l1",  title: "Colour Space, Gamma, and Why It Matters",       description: "Why does log footage look flat? What is a colour space and why does your footage need to be in the right one before grading? Understand REC.709, REC.2020, DCI-P3, and how your camera's log format maps to each.", duration: "22 min", type: "read",     free: true,  skillsGained: ["Colour space fundamentals", "Log footage understanding"] },
        { id: "cg-l2",  title: "The Scopes: Reading Waveform, Parade, and Vectorscope", description: "Learn to read the professional scopes that every colorist uses instead of relying on monitor calibration alone. Waveform for exposure, Parade for channel balance, Vectorscope for saturation and hue accuracy. Grade by data, not by eye alone.", duration: "20 min", type: "read",     free: false, skillsGained: ["Scope reading", "Technical colour analysis"] },
        { id: "cg-l3",  title: "LUTs: Technical vs. Creative",                  description: "Technical LUTs (Input/Output Transforms) convert between colour spaces. Creative LUTs are looks applied on top. Understand the difference and why applying a creative LUT to log footage without a technical LUT first destroys your image.", duration: "18 min", type: "read",     free: false, skillsGained: ["LUT pipeline", "Technical vs. creative LUT"] },
        { id: "cg-l4",  title: "The Node Tree: Resolve's Superpower",           description: "Resolve's node-based workflow lets you separate correction layers logically: Node 1 (Input Transform), Node 2 (Primary Correction), Node 3 (Creative Grade), Node 4 (Secondary Corrections). Learn to build and label a template node tree you'll use on every project.", duration: "25 min", type: "read",     free: false, skillsGained: ["Node-based workflow", "Resolve structure"] },
        { id: "cg-l5",  title: "Primary Correction: Balance Before Beauty",     description: "Before creative colour, every professional does a primary correction: exposure balance, shadow/highlight recovery, accurate white balance. Learn the scope-based workflow for primary correction that makes your creative grade 10× easier and more consistent.", duration: "18 min", type: "exercise", free: false, skillsGained: ["Primary colour correction", "Exposure balancing"] },
      ],
    },
    {
      id:          "cg-m2",
      title:       "Creative Grades: Looks That Sell",
      description: "The most in-demand colour looks — from moody cinematic to warm commercial — built from first principles so you understand them, not just copy them.",
      lessons: [
        { id: "cg-l6",  title: "The Teal-Orange Look: What It Is and Isn't",   description: "The most misunderstood look in cinema. Teal-orange is not an Instagram filter — it's a deliberate exploitation of complementary colours using skin tone warmth vs. shadow desaturation. Learn to build a teal-orange grade that looks cinematic, not processed.", duration: "28 min", type: "read",     free: false, skillsGained: ["Teal-orange technique", "Complementary colour grading"] },
        { id: "cg-l7",  title: "Warm Commercial Grade (Advertising Look)",      description: "The look used in Apple, Nike, and high-end brand advertising: lifted shadows, clean highlights, warm midtones, skin-accurate colour, zero crushing. The grade says: 'Everything is beautiful and aspirational.' Build it from scratch using only Resolve wheels and curves.", duration: "24 min", type: "read",     free: false, skillsGained: ["Commercial colour grading", "Advertising look"] },
        { id: "cg-l8",  title: "Moody Dark Narrative Grade",                   description: "The look of prestige drama: deep shadows with visible shadow detail, desaturated highlights, pushed split-toning (cool shadows / warm highlights or vice versa), film grain at a visible level. Build the complete look for a dialogue scene.", duration: "30 min", type: "read",     free: false, skillsGained: ["Dark narrative grade", "Split-toning mastery"] },
        { id: "cg-l9",  title: "Documentary Warm Grade",                        description: "National Geographic, Vice, and travel documentary look: warm, high-saturation midtones, natural shadow colour, sky that pops without oversaturation, accurate skin across diverse tones. The grade that makes the world look inviting and real.", duration: "22 min", type: "read",     free: false, skillsGained: ["Documentary grade", "Natural colour"] },
        { id: "cg-l10", title: "Fashion/Editorial Grade",                        description: "High fashion campaigns and editorial: precise skin tone rendering, intentional colour cast (often cool), high contrast with preserved highlight detail, minimal saturation in non-skin areas. The grade looks expensive.", duration: "25 min", type: "read",     free: false, skillsGained: ["Fashion grade", "Editorial look"] },
      ],
    },
    {
      id:          "cg-m3",
      title:       "Secondary Corrections: Surgical Precision",
      description: "Primary corrections fix the entire image. Secondaries fix specific elements within the frame — this is what makes a grade look professional vs. amateur.",
      lessons: [
        { id: "cg-l11", title: "HSL Qualification: Isolate Anything",          description: "Resolve's Qualifier tool lets you select a colour range (like skin, sky, or a specific object) and apply corrections only to those pixels. Learn the complete qualifier workflow: pick the colour, refine with Hue/Saturation/Luminance range, clean with the Matte tools.", duration: "30 min", type: "read",     free: false, skillsGained: ["HSL qualification", "Secondary correction"] },
        { id: "cg-l12", title: "Sky Replacement and Enhancement",              description: "Overcast skies blow out before the landscape is properly exposed. Learn to use the HSL qualifier to select and independently control the sky: add drama, shift blue cast, reduce blown highlights, while keeping the landscape grade intact.", duration: "24 min", type: "exercise", free: false, skillsGained: ["Sky correction", "Selective masking"] },
        { id: "cg-l13", title: "Skin Tone Targeting Across Diverse Ethnicities", description: "The hardest problem in professional colour grading: making skin look healthy and natural across diverse tones. Learn the vectorscope skin line, HSL targeting for Orange/Red/Yellow ranges, and the corrective adjustments needed for fair, olive, brown, and deep skin tones.", duration: "28 min", type: "read",     free: false, skillsGained: ["Skin tone correction", "Inclusive colour grading"] },
        { id: "cg-l14", title: "Power Windows and Object Tracking",            description: "Power windows are Resolve's masking system. Create circular, linear, polygonal, and custom curved windows. Track them to moving objects (a face, a car) using Resolve's automatic motion tracker. Apply corrections that stay with the subject throughout a take.", duration: "26 min", type: "read",     free: false, skillsGained: ["Power windows", "Object tracking"] },
        { id: "cg-l15", title: "Vignettes and Atmospheric Finish",             description: "The final touch professionals use to draw attention and add cinematic atmosphere: a subtle optical vignette (darker edges, brighter centre), a slight fog lift (softened blacks via the log wheel), and calibrated film grain. Learn to make these invisible.", duration: "16 min", type: "read",     free: false, skillsGained: ["Vignette technique", "Atmospheric finishing"] },
      ],
    },
    {
      id:          "cg-m4",
      title:       "Film Emulation",
      description: "Digital footage doesn't look like film by accident. Learn the technical and aesthetic reasons why, and the exact workflow to bridge the gap.",
      lessons: [
        { id: "cg-l16", title: "Why Digital Looks Different from Film",        description: "Film records light logarithmically. Digital sensors record linearly. Film has a characteristic highlight roll-off and shadow toe curve. Film grain is chemical, not mathematical. These 4 differences explain every divergence in aesthetic between film and digital.", duration: "20 min", type: "read",     free: false, skillsGained: ["Film vs. digital science", "Characteristic curve"] },
        { id: "cg-l17", title: "Building a Film Emulation Node in Resolve",    description: "The 4-node film emulation chain: (1) Input Transform to log-like encoding, (2) Film curve (S-curve with lifted blacks and rolled highlights), (3) Halation effect (warm bleed from bright areas), (4) Grain generator calibrated to film stock density.", duration: "35 min", type: "exercise", free: false, skillsGained: ["Film emulation workflow", "Advanced Resolve nodes"] },
        { id: "cg-l18", title: "Portra 400, Kodachrome, and Tri-X Emulation",  description: "Build three distinct film emulations from the characteristic curves of real film stocks. Portra: warm midtones, compressed highlights, muted saturation. Kodachrome: elevated reds, contrasty, saturated blues. Tri-X: aggressive grain, deep blacks, high contrast monochrome.", duration: "40 min", type: "exercise", free: false, skillsGained: ["Specific film stock emulation", "Colour archaeology"] },
        { id: "cg-l19", title: "Using Third-Party Film LUT Packs Correctly",   description: "Third-party film LUTs only work correctly when applied to correctly exposed footage in the right colour space. Learn the pre-LUT preparation, intensity control (blending strength), and what to correct after the LUT is applied. Most LUT users skip these steps.", duration: "18 min", type: "read",     free: false, skillsGained: ["LUT application", "Film LUT workflow"] },
        { id: "cg-l20", title: "Grain: The Detail That Makes Film Feel Real",  description: "Resolve has a full film grain generator. Learn grain size (related to film ISO — Tri-X 400 has large grain, Velvia 50 has fine grain), grain colour mixing (B&W grain vs. colour grain), frame blending (grain should not strobe frame-to-frame), and strength calibration.", duration: "22 min", type: "read",     free: false, skillsGained: ["Film grain technique", "Grain calibration"] },
      ],
    },
    {
      id:          "cg-m5",
      title:       "Professional Pipeline and Delivery",
      description: "Grade faster, deliver correctly, and build the systems that make you reliable enough to hire repeatedly.",
      lessons: [
        { id: "cg-l21", title: "ACES: The Professional Colour Management Workflow", description: "ACES (Academy Color Encoding System) is the standard colour pipeline in Hollywood. Learn to configure Resolve's ACES settings for your camera, understand Input/Output Transforms, and why ACES produces more accurate results across multiple cameras on one project.", duration: "28 min", type: "read",     free: false, skillsGained: ["ACES workflow", "Professional colour management"] },
        { id: "cg-l22", title: "Remote Collaboration: Receiving and Delivering Grade Notes", description: "Professional colorists rarely work in the same room as directors. Learn to use Resolve's gallery still and grade copy system, how to receive director notes via Frame.io or Dropbox and translate them to specific corrections, and how to deliver stems and reference stills.", duration: "18 min", type: "article",  free: false, skillsGained: ["Remote grading", "Client communication"] },
        { id: "cg-l23", title: "Export for Cinema, Broadcast, and Streaming",  description: "DCP (Digital Cinema Package) for theatrical. ProRes 4444 or DNxHD for broadcast master. H.265 HDR for streaming. Each delivery format has precise technical specifications. Get them wrong and your grade is rejected. Learn every spec.", duration: "20 min", type: "article",  free: false, skillsGained: ["Broadcast delivery", "Streaming specs"] },
        { id: "cg-l24", title: "Building a Reusable Grade Template Library",   description: "Work smarter: build a library of grade templates you apply as starting points to every new project. Organised by: genre (drama, commercial, documentary), mood (warm, cold, dark, neutral), and source camera (Sony A7S log, BRAW, ARRI Log-C). Templates save 40% of grading time.", duration: "22 min", type: "exercise", free: false, skillsGained: ["Template library", "Workflow efficiency"] },
        { id: "cg-l25", title: "Capstone: Grade a Full 3-Minute Short Film",   description: "The final lesson is a complete grading exercise. You'll receive 3 minutes of raw footage (provided as a download) across 5 different scenes. Apply a complete grade pipeline: primary, secondary, creative look, film emulation, and final QC. Compare your result to the reference grade.", duration: "120 min",type: "exercise", free: false, skillsGained: ["Full film grading", "Complete pipeline mastery"] },
      ],
    },
  ],
}

/* ── Mobile Editing Pro ──────────────────────────────────────── */
const mobileEditingCourse: Course = {
  id:             "mobile-editing-pro",
  title:          "Mobile Editing Pro — iPhone & Android Workflow",
  tagline:        "Edit stunning photos entirely on your phone, faster than desktop.",
  description:    "A complete mobile editing course for creators who shoot and edit on their phones. Covers Lightroom Mobile, VSCO, Snapseed, and CapCut for video. Everything you need to produce professional-quality content without touching a computer.",
  instructor:     "Priya Mehta",
  instructorBio:  "Priya is a mobile photography educator with 420k Instagram followers. She's collaborated with Adobe, Apple, and Samsung on mobile photography campaigns and mentored 2,000+ students.",
  difficulty:     "beginner",
  estimatedHours: 4,
  totalLessons:   14,
  badge:          "Mobile Editor",
  color:          "#7cb5e0",
  icon:           "📱",
  affinities:     { mobile: 0.9, minimal: 0.5, portrait: 0.3 },
  whatYouLearn: [
    "Master Lightroom Mobile from scratch",
    "Shoot in ProRAW for maximum editing range",
    "Build a complete 5-minute edit workflow",
    "Create your own preset collection for sale",
    "Edit professional Reels and short videos in CapCut",
    "Deliver social-ready content directly from your phone",
  ],
  prerequisites: [
    "A smartphone (iPhone 11+ or Android equivalent)",
    "Adobe Lightroom Mobile (free to download)",
    "No prior editing experience required",
  ],
  modules: [
    {
      id:          "me-m1",
      title:       "Capture: Setting Up for the Best Mobile Shots",
      description: "Great edits start with great captures. Learn how to get the most out of your phone camera before you open any editing app.",
      lessons: [
        { id: "me-l1",  title: "ProRAW and RAW: Why You Must Switch Today",    description: "Shoot in ProRAW on iPhone 12 Pro+ or Expert RAW on Android flagship phones. The editing range difference: JPEG can recover 1–1.5 stops of shadows; RAW can recover 4–5 stops. For any creative photo, RAW is non-negotiable. We show you exactly how to enable it.", duration: "12 min", type: "read",     free: true,  skillsGained: ["ProRAW setup", "RAW workflow"] },
        { id: "me-l2",  title: "Manual Controls: AE/AF Lock, Exposure Compensation, ProMode", description: "Tap to set focus. Tap and hold to lock focus AND exposure independently. Use the sun slider to set exposure manually. On Android, use ProMode for manual ISO, shutter speed, and focus. These simple controls put professional results in your hands.", duration: "14 min", type: "read",     free: false, skillsGained: ["Manual camera controls", "Exposure control"] },
        { id: "me-l3",  title: "Composition for Mobile: The 5 Rules That Work", description: "Rule of thirds via grid lines, leading lines that fill the narrow mobile frame, foreground elements for depth (hard to see on small screens — learn what works), vertical composition for social (1:1 and 4:5 ratios), and the eye-level magic of a wider prime lens perspective.", duration: "16 min", type: "read",     free: false, skillsGained: ["Mobile composition", "Social media framing"] },
        { id: "me-l4",  title: "Portrait Mode: Understanding and Overriding the AI",description: "Portrait Mode uses machine learning to create artificial bokeh. Understand its limitations (edges near fine hair, reflections, glass), how to manually adjust the depth slider after the shot, and which lighting effects (Natural, Studio, Contour, Stage) are actually useful vs. gimmicky.", duration: "12 min", type: "read",     free: false, skillsGained: ["Portrait Mode mastery", "Mobile bokeh"] },
        { id: "me-l5",  title: "Night Mode and Low Light: What Works and What Doesn't", description: "Night Mode takes multiple exposures and stacks them computationally. The result: lower noise, but ghosting on moving subjects. Learn when to use Night Mode (static subjects, minimum 2 seconds), when to shoot RAW without it, and how to edit Night Mode photos differently than day photos.", duration: "14 min", type: "article",  free: false, skillsGained: ["Night Mode", "Low light mobile photography"] },
      ],
    },
    {
      id:          "me-m2",
      title:       "Lightroom Mobile: Your Complete Editing Toolkit",
      description: "Lightroom Mobile is the most powerful editing app available. This module covers every tool and builds your personal workflow.",
      lessons: [
        { id: "me-l6",  title: "The Full Lightroom Mobile Interface Tour",      description: "Navigate every panel: Light (Exposure, Contrast, Highlights, Shadows, Whites, Blacks), Colour (White Balance, Vibrance, Saturation), Detail (Sharpening, Noise), Effects (Vignette, Grain), Optics (Lens Correction), and Geometry (Crop, Rotate). Know where everything lives before you need it.", duration: "18 min", type: "read",     free: false, skillsGained: ["Lightroom Mobile navigation", "Panel familiarity"] },
        { id: "me-l7",  title: "AI Tools: Masking, Select Subject, Select Sky", description: "Lightroom Mobile's AI masking changes everything. Select Subject isolates your main subject in 2 seconds. Select Sky isolates the sky automatically. Use these to apply completely different edits to subject vs. background — a 10-minute technique in Photoshop, now 10 seconds on your phone.", duration: "20 min", type: "read",     free: false, skillsGained: ["AI masking", "Selective editing mobile"] },
        { id: "me-l8",  title: "Build Your 5-Minute Edit Routine",             description: "Step 1: Exposure balance (30 sec). Step 2: White balance direction (30 sec). Step 3: Apply your preset (10 sec). Step 4: Highlights/shadows fine-tune (60 sec). Step 5: HSL one colour adjustment (60 sec). Step 6: Export. Total: under 5 minutes. We time you. We drill you.", duration: "22 min", type: "exercise", free: false, skillsGained: ["Speed editing", "5-minute workflow"] },
        { id: "me-l9",  title: "Create and Export Your Signature Preset",       description: "Apply your ideal settings to a 'calibration image' (any well-exposed photo in normal light). Save as a preset with a name that reflects the look, not the settings. Export as a .DNG to iCloud or Google Drive as backup. This preset goes on every new photo you take as a starting point.", duration: "16 min", type: "exercise", free: false, skillsGained: ["Preset creation", "Signature look development"] },
      ],
    },
    {
      id:          "me-m3",
      title:       "Video Editing for Social: CapCut and Reels",
      description: "Still photos get likes. Reels get followers. Build the short-form video editing workflow that transforms your content.",
      lessons: [
        { id: "me-l10", title: "CapCut Interface and First Edit",               description: "CapCut is the most powerful free mobile video editor. Learn: timeline editing, adding music from the in-app library (licensed for commercial use), text overlays (animated), transitions, and the one-tap speed ramping feature. Build your first 15-second Reel in this lesson.", duration: "24 min", type: "read",     free: false, skillsGained: ["CapCut workflow", "Reel editing"] },
        { id: "me-l11", title: "Before/After Transition Reels",                 description: "The highest-engagement format in the editing niche: before photo → edit happening → after photo. This 3-act structure works in 15 seconds. Learn to time the edit reveal to a musical beat drop, use the CapCut auto-beat sync, and export at the exact right resolution for Instagram.", duration: "20 min", type: "exercise", free: false, skillsGained: ["Before/after content", "Transition technique"] },
        { id: "me-l12", title: "Speed Ramp: The Viral Video Technique",         description: "Speed ramping slows a clip at peak moment then speeds back up. On CapCut: select your clip, tap Speed, tap Curve, choose a curve preset (try 'Flash In' or 'Hero'), manually adjust the handles to time the slow-motion to the exact visual or musical moment.", duration: "18 min", type: "read",     free: false, skillsGained: ["Speed ramping", "Cinematic video technique"] },
        { id: "me-l13", title: "Colour Grading Mobile Video",                  description: "Apply consistent colour grading to video clips on mobile: in CapCut, use the Filter menu for LUT-based looks, then the Adjust panel for manual exposure and colour controls. For advanced control, use Lightroom Mobile's Video editing feature (available in the paid plan).", duration: "16 min", type: "read",     free: false, skillsGained: ["Mobile video colour", "LUT application mobile"] },
        { id: "me-l14", title: "Export Settings and Platform Optimisation",    description: "Export your Reel from CapCut at 1080×1920 (9:16 vertical), H.265, 60fps. Instagram recompresses everything — export at maximum quality and let the platform compress. Avoid publishing with third-party watermarks (CapCut, TikTok) for Instagram — they suppress reach.", duration: "12 min", type: "article",  free: false, skillsGained: ["Export optimisation", "Platform-specific delivery"] },
      ],
    },
  ],
}

/* ── Street Photography Editing Workflow ─────────────────────── */
const streetEditingCourse: Course = {
  id:             "street-photography-editing",
  title:          "Street Photography Editing Workflow",
  tagline:        "Black & white conversion, grain, contrast, and grit for street work.",
  description:    "A focused, technical course on editing street photography to its highest potential. Covers black-and-white conversion science, film grain calibration, contrast techniques, and the monochrome workflow used by professional documentary photographers.",
  instructor:     "Samuel Osei",
  instructorBio:  "Samuel is a documentary photographer and darkroom printer based in Accra and London. His work has been published in TIME, Der Spiegel, and exhibited at Les Rencontres d'Arles.",
  difficulty:     "intermediate",
  estimatedHours: 3.5,
  totalLessons:   12,
  color:          "#8ba3bf",
  icon:           "🏙️",
  affinities:     { street: 0.9, urban: 0.8, film: 0.6, cinematic: 0.3 },
  whatYouLearn: [
    "Black & white conversion science: how colour maps to tone",
    "Contrast techniques for impactful street photography",
    "Film grain: size, structure, and calibration to specific stocks",
    "The dodging and burning workflow used in darkroom printing",
    "Processing decisions for harsh midday vs. low-light street scenes",
    "Building a consistent B&W street editing style",
  ],
  prerequisites: [
    "Basic Lightroom knowledge (Modules 1–2 of Lightroom Mastery recommended)",
    "Some experience shooting street photography",
    "No Photoshop required — all techniques work in Lightroom",
  ],
  modules: [
    {
      id:          "sp-m1",
      title:       "Black & White Conversion Science",
      description: "Converting to monochrome is more than desaturation. The B&W mix panel controls how each colour in your original image translates to a shade of grey. This is where street photography editing lives or dies.",
      lessons: [
        { id: "sp-l1",  title: "Colour-to-Tone: How the B&W Mix Panel Works",  description: "When you desaturate a photo, red and green translate to similar shades of grey — making a face with red cheeks and a green background look flat. The B&W mix panel lets you control each colour range independently: raise red to make warm skin glow, lower blue to darken sky dramatically.", duration: "20 min", type: "read",     free: true,  skillsGained: ["B&W conversion", "Colour-to-tone mapping"] },
        { id: "sp-l2",  title: "High Contrast B&W: The Classic Street Look",   description: "Street photography typically lives in high contrast. The approach: deep blacks (Blacks slider -30 to -60), bright highlights that just avoid clipping, strong midtone contrast (Contrast +40 to +60), and high Clarity (+20 to +40) for added edge definition that reads as structure on faces and surfaces.", duration: "22 min", type: "read",     free: false, skillsGained: ["High contrast B&W", "Dramatic monochrome"] },
        { id: "sp-l3",  title: "Flat, Foggy, Low-Contrast: The Alternative B&W", description: "Not all street photography is high contrast. The atmospheric, foggy aesthetic (Lifted blacks, reduced highlights, lower contrast, lighter overall tone) creates a melancholy, documentary quality associated with Japanese street photography and Daido Moriyama's later work.", duration: "18 min", type: "read",     free: false, skillsGained: ["Low-contrast B&W", "Atmospheric monochrome"] },
        { id: "sp-l4",  title: "Auto Exposure and Highlight Recovery in B&W",  description: "Street photography often includes blown highlights (white sky, lit windows). In colour, these are distracting. In B&W, a completely white sky can actually strengthen the composition by creating a graphic, clean top zone. Learn when to recover and when to let highlights blow intentionally.", duration: "14 min", type: "article",  free: false, skillsGained: ["Highlight management", "Intentional B&W exposure"] },
      ],
    },
    {
      id:          "sp-m2",
      title:       "Film Grain: The Soul of Street Photography",
      description: "Film grain is not noise. It's a physical artefact with character, direction, and size determined by film stock and processing. Digital grain should reference this physical reality.",
      lessons: [
        { id: "sp-l5",  title: "How Film Grain is Physically Formed (And Why It Matters)", description: "Silver halide crystals in film emulsion form grain when they're exposed and developed. Larger crystals (higher ISO film) produce larger, more visible grain. The grain has randomised organic structure — not the repeating pattern of digital noise. Understanding this guides every grain decision.", duration: "16 min", type: "article",  free: false, skillsGained: ["Film grain science", "Grain vs. noise"] },
        { id: "sp-l6",  title: "Lightroom Grain Settings: Size, Roughness, and Strength", description: "Lightroom's grain generator has 3 controls. Size: the physical scale of grain particles (25–40 for fine-grain film like Kodak Ektar, 60–80 for medium-grain like Portra 400, 80–100+ for coarse-grain like Kodak T-Max 3200). Roughness: the irregularity of grain edges. Strength: the overall density.", duration: "20 min", type: "read",     free: false, skillsGained: ["Grain calibration", "Film stock emulation"] },
        { id: "sp-l7",  title: "Grain at Export Resolution: The Critical Problem",description: "Lightroom grain looks correct on screen at 100% zoom but changes dramatically at smaller zoom levels and at export. The grain that looks perfect at 100% often disappears at export resolution or looks too heavy at print size. The solution: always evaluate grain in an export preview, not in Develop.", duration: "16 min", type: "read",     free: false, skillsGained: ["Export grain evaluation", "Print vs. screen grain"] },
        { id: "sp-l8",  title: "Tri-X 400 Grain Calibration Exercise",          description: "Kodak Tri-X 400 is the most iconic grain aesthetic in documentary photography. Size: 75, Roughness: 50, Strength: 35–45. Applied to a correctly contrasty B&W image, it should feel like you're looking at a contact sheet from 1965. Calibrate on 5 different street images and compare.", duration: "22 min", type: "exercise", free: false, skillsGained: ["Tri-X calibration", "Historic grain matching"] },
      ],
    },
    {
      id:          "sp-m3",
      title:       "Dodge, Burn, and Final Polish",
      description: "The final refinement that separates editorial-quality street photography from a snapshot with a filter applied.",
      lessons: [
        { id: "sp-l9",  title: "Dodging Eyes: Making Street Portraits Come Alive", description: "The eyes in a street portrait hold the viewer's attention. Even a small dodge (brightening) of the eye whites and iris creates immediate connection. In Lightroom: use the Radial Filter or Masking > Select Subject, then apply +0.3 to +0.5 Exposure in the eye area only.", duration: "18 min", type: "read",     free: false, skillsGained: ["Eye dodging", "Portrait retouching B&W"] },
        { id: "sp-l10", title: "Burning Edges: Cinematic Vignette Without Looking Processed", description: "A subtle edge burn (darkening of corners) draws the viewer's eye toward the centre of the frame — the same technique used in darkroom printing. The secret to invisibility: use Effects > Vignette with a large Feather (85–100), small Amount (-10 to -20), and Midpoint pushed right.", duration: "16 min", type: "read",     free: false, skillsGained: ["Edge burning", "Invisible vignette"] },
        { id: "sp-l11", title: "Local Adjustments for Compositional Emphasis", description: "The viewer's eye follows brightness. By darkening distracting areas and brightening the key subject, you can redirect attention within the frame post-capture. Use the Radial Filter or Linear Gradient with negative Exposure to push back distracting backgrounds.", duration: "20 min", type: "read",     free: false, skillsGained: ["Compositional editing", "Brightness-as-direction"] },
        { id: "sp-l12", title: "Building Your Street Photography Preset and Workflow Checklist", description: "Compile everything you've learned into 2–3 personal street presets: High Contrast Grit, Atmospheric Fog, and Warm Toned Mono. Test each on 10 different street images. Document your complete workflow as a checklist — from import to final export — so every image gets consistent treatment.", duration: "28 min", type: "checklist", free: false, skillsGained: ["Street preset creation", "Complete workflow"] },
      ],
    },
  ],
}

/* ── All courses exported ────────────────────────────────────── */
export const ALL_COURSES: Course[] = [
  lightroomMasteryCourse,
  colorGradingCourse,
  mobileEditingCourse,
  streetEditingCourse,
]

export const COURSE_MAP: Record<string, Course> =
  Object.fromEntries(ALL_COURSES.map((c) => [c.id, c]))

/**
 * Score and rank courses for a user based on their affinities.
 */
export function rankCourses(
  affinities: Partial<Record<keyof CategoryAffinities, number>>
): Array<Course & { score: number }> {
  return ALL_COURSES
    .map((course) => {
      let score = 0
      for (const [key, weight] of Object.entries(course.affinities)) {
        score += (affinities[key as keyof CategoryAffinities] ?? 0) * (weight ?? 0)
      }
      return { ...course, score: Math.round(score * 100) }
    })
    .sort((a, b) => b.score - a.score)
}
