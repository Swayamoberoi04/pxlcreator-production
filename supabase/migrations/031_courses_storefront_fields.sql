-- ============================================================
-- PXL Creator — Courses: storefront fields + seed
-- Migration: 031_courses_storefront_fields.sql
--
-- 1. Adds the columns the public /courses storefront needs that migration
--    030 didn't include (instructor display fields, cover gradient,
--    "what you'll learn" / "includes" lists).
-- 2. Seeds the 5 courses currently hardcoded in src/data/courses.ts, with
--    IDENTICAL slugs — so cutting the public pages over to the database
--    (see src/lib/courses/repository.ts) is a zero-URL-change operation.
--    Each course's `curriculum` is seeded with real section titles and
--    the ORIGINAL lesson counts, but individual lesson entries are
--    generic placeholders ("Lesson 1", "Lesson 2", ...) with duration_min
--    evenly split from the section's original total — the source data
--    only ever had per-MODULE summaries (title/count/duration), never
--    individual lesson titles or URLs, so per-lesson content is exactly
--    as much of a placeholder here as it was in the original static file.
--    Admins should replace these with real lesson titles + video/PDF URLs
--    over time; nothing on the public site depends on the placeholder
--    lesson titles themselves (only section title / lesson count /
--    total duration are displayed — see repository.ts).
--
-- Idempotent — safe to re-run. Seed uses ON CONFLICT (slug) DO NOTHING so
-- admin edits made after the first run are never overwritten.
-- ============================================================

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS instructor_role     TEXT,
  ADD COLUMN IF NOT EXISTS instructor_initials TEXT,
  ADD COLUMN IF NOT EXISTS cover_gradient      TEXT,
  ADD COLUMN IF NOT EXISTS what_you_learn      TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS includes            TEXT[] NOT NULL DEFAULT '{}';

-- ── Seed ──────────────────────────────────────────────────────

INSERT INTO courses (
  title, slug, subtitle, description, category, difficulty, instructor,
  instructor_role, instructor_initials, duration_minutes, lesson_count,
  thumbnail_url, cover_gradient, price, discount_price, currency,
  is_featured, is_published, access_level, what_you_learn, includes, curriculum, order_index
) VALUES

(
  'Cinematic Editing Masterclass', 'cinematic-editing-masterclass',
  'Go from flat RAW files to cinematic, film-quality edits in Lightroom',
  'This is the most complete Lightroom editing course we''ve produced. Starting from the fundamentals of RAW processing and working up through advanced colour grading, tone curves, and local adjustments — every lesson is built around real-world photo scenarios. By the end, you''ll have a systematic editing workflow that produces consistent, professional results in under 20 minutes per image.',
  'Editing', 'Advanced', 'PXL Creator', 'Lead Educator', 'PXL', 720, 32,
  '/assets/cinematic.webp', 'from-[#1a1000] via-[#2a1800] to-[#0a0800]',
  79, 119, 'USD', TRUE, TRUE, 'premium',
  ARRAY[
    'Master the Lightroom RAW processing pipeline from import to export',
    'Build a personal colour grading system using the tone curve',
    'Use local adjustments and masking for professional-level control',
    'Create your own preset packs from your editing style',
    'Develop a 20-minute editing workflow for consistent results',
    'Understand colour theory as it applies to photo editing'
  ],
  ARRAY[
    '32 in-depth video lessons (12+ hours)',
    '5 practice RAW files for hands-on work',
    'Exclusive ''Masterclass'' preset pack (10 presets)',
    'Downloadable cheat sheet: tone curve reference',
    'Lifetime access + all future updates',
    'Private community access'
  ],
  '[
    {"title":"RAW Processing Fundamentals","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":22},{"title":"Lesson 2","type":"video","url":"","duration_min":22},{"title":"Lesson 3","type":"video","url":"","duration_min":22},{"title":"Lesson 4","type":"video","url":"","duration_min":21},{"title":"Lesson 5","type":"video","url":"","duration_min":21},{"title":"Lesson 6","type":"video","url":"","duration_min":22}]},
    {"title":"Colour Science & White Balance","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":21},{"title":"Lesson 2","type":"video","url":"","duration_min":21},{"title":"Lesson 3","type":"video","url":"","duration_min":21},{"title":"Lesson 4","type":"video","url":"","duration_min":21},{"title":"Lesson 5","type":"video","url":"","duration_min":21}]},
    {"title":"Tone Curve Mastery","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":21},{"title":"Lesson 2","type":"video","url":"","duration_min":21},{"title":"Lesson 3","type":"video","url":"","duration_min":21},{"title":"Lesson 4","type":"video","url":"","duration_min":22},{"title":"Lesson 5","type":"video","url":"","duration_min":22},{"title":"Lesson 6","type":"video","url":"","duration_min":21},{"title":"Lesson 7","type":"video","url":"","duration_min":22}]},
    {"title":"HSL & Colour Grading","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":23},{"title":"Lesson 2","type":"video","url":"","duration_min":22},{"title":"Lesson 3","type":"video","url":"","duration_min":22},{"title":"Lesson 4","type":"video","url":"","duration_min":23},{"title":"Lesson 5","type":"video","url":"","duration_min":22},{"title":"Lesson 6","type":"video","url":"","duration_min":23}]},
    {"title":"Local Adjustments & Masking","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":23},{"title":"Lesson 2","type":"video","url":"","duration_min":23},{"title":"Lesson 3","type":"video","url":"","duration_min":23},{"title":"Lesson 4","type":"video","url":"","duration_min":23},{"title":"Lesson 5","type":"video","url":"","duration_min":23}]},
    {"title":"Building Your Workflow","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":28},{"title":"Lesson 2","type":"video","url":"","duration_min":28},{"title":"Lesson 3","type":"video","url":"","duration_min":29}]}
  ]'::jsonb, 1
),

(
  'Lightroom for Beginners', 'lightroom-for-beginners',
  'Everything you need to start editing with confidence — in one weekend',
  'Never opened Lightroom before? This course starts from absolute zero. We cover the interface, importing, basic adjustments, and your first full edit from RAW to export. Designed to be completed in a single weekend.',
  'Editing', 'Beginner', 'PXL Creator', 'Lead Educator', 'PXL', 300, 18,
  '/assets/fr_after.webp', 'from-[#0a1520] via-[#0c1a28] to-[#060e18]',
  49, NULL, 'USD', FALSE, TRUE, 'premium',
  ARRAY[
    'Navigate the Lightroom interface with confidence',
    'Import, organise and rate your photos efficiently',
    'Make your first professional edit using basic adjustments',
    'Export photos for web, print and social media',
    'Build a simple editing workflow you can repeat consistently'
  ],
  ARRAY[
    '18 beginner-friendly video lessons (5 hours)',
    '3 practice RAW files',
    'Beginner preset starter pack (5 presets)',
    'Lifetime access'
  ],
  '[
    {"title":"Getting Started","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":13},{"title":"Lesson 2","type":"video","url":"","duration_min":12},{"title":"Lesson 3","type":"video","url":"","duration_min":13},{"title":"Lesson 4","type":"video","url":"","duration_min":12}]},
    {"title":"The Basic Panel","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":16},{"title":"Lesson 2","type":"video","url":"","duration_min":16},{"title":"Lesson 3","type":"video","url":"","duration_min":16},{"title":"Lesson 4","type":"video","url":"","duration_min":16},{"title":"Lesson 5","type":"video","url":"","duration_min":16}]},
    {"title":"Your First Full Edit","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":21},{"title":"Lesson 2","type":"video","url":"","duration_min":21},{"title":"Lesson 3","type":"video","url":"","duration_min":21},{"title":"Lesson 4","type":"video","url":"","duration_min":21},{"title":"Lesson 5","type":"video","url":"","duration_min":21}]},
    {"title":"Exporting & Sharing","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":14},{"title":"Lesson 2","type":"video","url":"","duration_min":14},{"title":"Lesson 3","type":"video","url":"","duration_min":13},{"title":"Lesson 4","type":"video","url":"","duration_min":14}]}
  ]'::jsonb, 2
),

(
  'Colour Grading for Filmmakers', 'colour-grading-for-filmmakers',
  'Professional DaVinci Resolve colour grading — from flat log to cinematic',
  'Built for videographers and filmmakers who want their footage to look as good as their photography. Covers DaVinci Resolve from setup through node-based grading, LUTs, and creating a signature cinematic look.',
  'Color Grading', 'Intermediate', 'PXL Creator', 'Lead Educator', 'PXL', 540, 26,
  '/assets/garage_after.webp', 'from-[#0f0a1a] via-[#140d22] to-[#080510]',
  89, 129, 'USD', FALSE, TRUE, 'premium',
  ARRAY[
    'Set up DaVinci Resolve for professional colour work',
    'Understand log footage and primary colour correction',
    'Build node-based grading structures used by professionals',
    'Create and apply custom LUTs for your shooting style',
    'Match colour across different cameras and lighting',
    'Deliver a finished grade for YouTube, broadcast and cinema'
  ],
  ARRAY[
    '26 professional video lessons (9 hours)',
    '4 practice flat log clips (Sony & Canon)',
    '3 custom LUTs (.cube format)',
    'Lifetime access + future updates',
    'Private community access'
  ],
  '[
    {"title":"DaVinci Resolve Setup","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":18},{"title":"Lesson 2","type":"video","url":"","duration_min":17},{"title":"Lesson 3","type":"video","url":"","duration_min":18},{"title":"Lesson 4","type":"video","url":"","duration_min":17}]},
    {"title":"Primary Correction","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":21},{"title":"Lesson 2","type":"video","url":"","duration_min":21},{"title":"Lesson 3","type":"video","url":"","duration_min":21},{"title":"Lesson 4","type":"video","url":"","duration_min":20},{"title":"Lesson 5","type":"video","url":"","duration_min":21},{"title":"Lesson 6","type":"video","url":"","duration_min":21}]},
    {"title":"Node-Based Grading","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":24},{"title":"Lesson 2","type":"video","url":"","duration_min":23},{"title":"Lesson 3","type":"video","url":"","duration_min":24},{"title":"Lesson 4","type":"video","url":"","duration_min":23},{"title":"Lesson 5","type":"video","url":"","duration_min":24},{"title":"Lesson 6","type":"video","url":"","duration_min":23},{"title":"Lesson 7","type":"video","url":"","duration_min":24}]},
    {"title":"LUTs & Creative Looks","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":22},{"title":"Lesson 2","type":"video","url":"","duration_min":22},{"title":"Lesson 3","type":"video","url":"","duration_min":22},{"title":"Lesson 4","type":"video","url":"","duration_min":22},{"title":"Lesson 5","type":"video","url":"","duration_min":22}]},
    {"title":"Final Delivery","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":18},{"title":"Lesson 2","type":"video","url":"","duration_min":17},{"title":"Lesson 3","type":"video","url":"","duration_min":18},{"title":"Lesson 4","type":"video","url":"","duration_min":17}]}
  ]'::jsonb, 3
),

(
  'Photography Business Blueprint', 'photography-business-blueprint',
  'How to turn your camera into a consistent income — without selling out',
  'The business side of photography that no one teaches. Pricing your work, attracting ideal clients, building a portfolio that converts, and creating passive income from presets and prints.',
  'Business', 'Beginner', 'PXL Creator', 'Lead Educator', 'PXL', 360, 20,
  '/assets/urban.webp', 'from-[#0a1a10] via-[#0c1a12] to-[#060e08]',
  59, NULL, 'USD', FALSE, TRUE, 'premium',
  ARRAY[
    'Price your work correctly — stop undercharging',
    'Build a portfolio website that attracts the right clients',
    'Create passive income from presets, prints and workshops',
    'Use social media without burning out',
    'Write proposals and contracts that protect you'
  ],
  ARRAY[
    '20 focused business lessons (6 hours)',
    'Pricing calculator spreadsheet',
    'Client proposal template',
    'Lifetime access'
  ],
  '[
    {"title":"Pricing & Packages","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":18},{"title":"Lesson 2","type":"video","url":"","duration_min":18},{"title":"Lesson 3","type":"video","url":"","duration_min":18},{"title":"Lesson 4","type":"video","url":"","duration_min":18},{"title":"Lesson 5","type":"video","url":"","duration_min":18}]},
    {"title":"Portfolio & Online Presence","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":21},{"title":"Lesson 2","type":"video","url":"","duration_min":21},{"title":"Lesson 3","type":"video","url":"","duration_min":21},{"title":"Lesson 4","type":"video","url":"","duration_min":21},{"title":"Lesson 5","type":"video","url":"","duration_min":21}]},
    {"title":"Client Acquisition","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":20},{"title":"Lesson 2","type":"video","url":"","duration_min":20},{"title":"Lesson 3","type":"video","url":"","duration_min":20},{"title":"Lesson 4","type":"video","url":"","duration_min":20},{"title":"Lesson 5","type":"video","url":"","duration_min":20}]},
    {"title":"Passive Income Streams","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":13},{"title":"Lesson 2","type":"video","url":"","duration_min":13},{"title":"Lesson 3","type":"video","url":"","duration_min":13},{"title":"Lesson 4","type":"video","url":"","duration_min":13},{"title":"Lesson 5","type":"video","url":"","duration_min":13}]}
  ]'::jsonb, 4
),

(
  'Advanced Composition & Visual Storytelling', 'advanced-composition-storytelling',
  'Make images that stop the scroll — the rules, when to break them, and why',
  'Composition is the difference between a technically correct photo and one that people can''t stop looking at. This course goes deep into visual hierarchy, leading lines, negative space, and how to build a coherent photo essay.',
  'Composition', 'Intermediate', 'PXL Creator', 'Lead Educator', 'PXL', 420, 22,
  '/assets/portrait_bw.webp', 'from-[#1a0a00] via-[#1a0e00] to-[#0a0600]',
  69, NULL, 'USD', FALSE, TRUE, 'premium',
  ARRAY[
    'Understand visual hierarchy and how the eye moves through an image',
    'Use leading lines, frames and negative space intentionally',
    'Know when to follow compositional rules — and when to break them',
    'Build a coherent series or photo essay',
    'Shoot with composition in mind, not as an afterthought'
  ],
  ARRAY[
    '22 in-depth video lessons (7 hours)',
    'Composition checklist PDF',
    '10 before/after composition critiques',
    'Lifetime access'
  ],
  '[
    {"title":"Visual Hierarchy","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":20},{"title":"Lesson 2","type":"video","url":"","duration_min":20},{"title":"Lesson 3","type":"video","url":"","duration_min":20},{"title":"Lesson 4","type":"video","url":"","duration_min":20},{"title":"Lesson 5","type":"video","url":"","duration_min":20}]},
    {"title":"The Classic Rules","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":21},{"title":"Lesson 2","type":"video","url":"","duration_min":21},{"title":"Lesson 3","type":"video","url":"","duration_min":21},{"title":"Lesson 4","type":"video","url":"","duration_min":20},{"title":"Lesson 5","type":"video","url":"","duration_min":21},{"title":"Lesson 6","type":"video","url":"","duration_min":21}]},
    {"title":"Breaking the Rules","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":19},{"title":"Lesson 2","type":"video","url":"","duration_min":19},{"title":"Lesson 3","type":"video","url":"","duration_min":19},{"title":"Lesson 4","type":"video","url":"","duration_min":19},{"title":"Lesson 5","type":"video","url":"","duration_min":19}]},
    {"title":"Photo Essays & Series","lessons":[{"title":"Lesson 1","type":"video","url":"","duration_min":17},{"title":"Lesson 2","type":"video","url":"","duration_min":17},{"title":"Lesson 3","type":"video","url":"","duration_min":17},{"title":"Lesson 4","type":"video","url":"","duration_min":16},{"title":"Lesson 5","type":"video","url":"","duration_min":17},{"title":"Lesson 6","type":"video","url":"","duration_min":16}]}
  ]'::jsonb, 5
)

ON CONFLICT (slug) DO NOTHING;
