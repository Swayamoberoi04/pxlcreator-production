-- ============================================================
-- PXL Creator — Blog
-- Migration: 032_blog_posts.sql
--
-- `content` is a JSONB array of typed ContentBlock objects (see
-- src/types/blog.ts) — paragraph/heading/subheading/list/quote/tip/
-- divider/image/video/code/table/cta. This mirrors the exact shape the
-- static src/data/posts.ts already used ("Instead of raw HTML, content
-- is typed. Easy to migrate to a CMS later." — this migration is that).
--
-- `published_at` doubles as the schedule-publish field: a post with
-- is_published = true and published_at in the future is NOT yet public
-- (see the RLS policy and src/lib/blog/repository.ts).
--
-- Seeds the 6 posts currently hardcoded in src/data/posts.ts with
-- IDENTICAL slugs, so cutting the public pages over to the database is a
-- zero-URL-change operation — same approach as migration 031 for courses.
--
-- Idempotent — safe to re-run. Seed uses ON CONFLICT (slug) DO NOTHING.
-- ============================================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  title             TEXT        NOT NULL,
  slug              TEXT        NOT NULL UNIQUE,
  excerpt           TEXT,
  content           JSONB       NOT NULL DEFAULT '[]',

  category          TEXT        NOT NULL DEFAULT 'Tutorial'
                     CHECK (category IN ('Tutorial', 'Gear', 'Behind the Scenes', 'Tips & Tricks', 'Inspiration')),
  author_name       TEXT        NOT NULL DEFAULT 'PXL Creator',
  author_role       TEXT        NOT NULL DEFAULT 'Editorial Team',
  author_initials   TEXT        NOT NULL DEFAULT 'PXL',

  cover_image_url   TEXT,
  banner_url        TEXT,
  cover_gradient    TEXT,
  tags              TEXT[]      NOT NULL DEFAULT '{}',
  reading_time_minutes INTEGER  NOT NULL DEFAULT 5,

  is_featured       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_published       BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at       TIMESTAMPTZ,          -- NULL = draft; future = scheduled; past/now = live

  views_count        INTEGER     NOT NULL DEFAULT 0,
  likes_count         INTEGER     NOT NULL DEFAULT 0,
  shares_count         INTEGER     NOT NULL DEFAULT 0,

  seo_title           TEXT,
  seo_description      TEXT,
  seo_keywords          TEXT,
  og_image_url            TEXT,
  canonical_url             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug        ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published    ON blog_posts(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category     ON blog_posts(category);

CREATE OR REPLACE FUNCTION blog_posts_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_posts_updated_at ON blog_posts;
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION blog_posts_touch_updated_at();

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read live posts" ON blog_posts;
CREATE POLICY "Public can read live posts"
  ON blog_posts FOR SELECT
  USING (is_published = TRUE AND (published_at IS NULL OR published_at <= NOW()));

-- Writes: service role only (admin API routes).

-- ── Seed ──────────────────────────────────────────────────────

INSERT INTO blog_posts (
  title, slug, excerpt, content, category, author_name, author_role, author_initials,
  cover_image_url, cover_gradient, tags, reading_time_minutes, is_featured, is_published, published_at
) VALUES

(
  '5 Lightroom Mistakes Every Beginner Makes (And How to Fix Them)',
  '5-lightroom-mistakes-beginners-make',
  'Most editing problems come from the same five habits. Here''s how to spot them in your own workflow and what to do instead.',
  '[
    {"type":"paragraph","text":"Lightroom is one of the most powerful editing tools available — but it''s also one of the easiest to misuse. After reviewing thousands of edits submitted to our community, we keep seeing the same five mistakes over and over. The good news: every single one is fixable once you understand why it happens."},
    {"type":"heading","text":"Mistake 1: Over-editing the Highlights"},
    {"type":"paragraph","text":"The most common edit we see from beginners is dragging the Highlights slider all the way down in an attempt to recover blown-out skies or windows. While this does recover detail, it creates an unnatural, flat look that immediately signals ''edited photo''. Real highlight recovery happens subtly."},
    {"type":"tip","label":"Fix it","text":"Use Highlights at -30 to -50 maximum. Then use the Tone Curve to gently pull down the upper quarter of the curve. This gives you natural-looking recovery without the grey, washed-out sky."},
    {"type":"heading","text":"Mistake 2: Ignoring White Balance"},
    {"type":"paragraph","text":"White balance is the single most important edit in any photo, and yet most beginners either leave it on Auto or overcorrect it. Auto WB in Lightroom is surprisingly good — but it almost always adds a slight coolness to images that are shot in warm light, which kills the mood."},
    {"type":"tip","label":"Fix it","text":"Shoot in RAW and set your own WB in post. For golden hour shots, try setting Temp to around 6200–6800K. Trust your eyes, not the eyedropper tool."},
    {"type":"heading","text":"Mistake 3: Over-sharpening"},
    {"type":"paragraph","text":"Sharpening is additive — you cannot undo the damage it causes to an image. We regularly see images with Sharpening set to 100 with no masking, which turns skin into sandpaper and creates edge halos around foliage."},
    {"type":"tip","label":"Fix it","text":"Hold Alt (Option on Mac) while dragging the Masking slider. You''ll see a black-and-white mask appear. Drag until only the hard edges are white — usually around 60–80. This constrains sharpening to edges only."},
    {"type":"heading","text":"Mistake 4: Using Vibrance as a Crutch"},
    {"type":"paragraph","text":"Vibrance boosts muted colours while protecting already-saturated ones. It sounds perfect — and it is, in small doses. But we see beginners using Vibrance at +40 to +60 to ''make photos pop'', which turns natural scenes into oversaturated messes."},
    {"type":"tip","label":"Fix it","text":"Use Vibrance sparingly — maximum +20. For more targeted colour work, use the HSL panel to boost or shift individual colour channels. You''ll get far more control."},
    {"type":"heading","text":"Mistake 5: Not Using Local Adjustments"},
    {"type":"paragraph","text":"Global adjustments affect the entire image. If your subject is well-exposed but your background is too bright, pulling down Exposure globally ruins your subject too. Local adjustments — Masks, Radial Filters, Graduated Filters — are where professional editing actually happens."},
    {"type":"tip","label":"Fix it","text":"Learn the Masking panel in Lightroom Classic. Start with Select Subject to isolate your subject, then adjust the background separately. This single skill will transform your editing quality."},
    {"type":"divider"},
    {"type":"quote","text":"The goal isn''t to make a photo look edited. The goal is to make it look like the best version of what was actually there.","attribution":"PXL Creator"}
  ]'::jsonb,
  'Tutorial', 'PXL Creator', 'Editorial Team', 'PXL',
  '/assets/moody_city.webp', 'from-[#0a1020] via-[#0d1830] to-[#060c18]',
  ARRAY['Lightroom','Beginner','Editing','Tutorial'], 7, TRUE, TRUE, '2026-05-10T00:00:00Z'
),

(
  'How We Developed the Desert Gold Pack: A Behind-the-Scenes Look',
  'shooting-desert-gold-behind-the-scenes',
  'Every preset starts with a real shoot. Here''s the process, the failures, and the eventual breakthrough that became our best-selling pack.',
  '[
    {"type":"paragraph","text":"The Desert Gold Pack started with a failed trip to Rajasthan. We had the cameras, the locations, and the golden hour — but every edit looked either too orange or too muddy. Three months and 47 preset iterations later, we had something that actually worked."},
    {"type":"heading","text":"The Problem With Warm Presets"},
    {"type":"paragraph","text":"Most ''warm'' presets simply boost the orange channel and push the temperature slider right. It looks great on the thumbnail and falls apart in real use. Skin turns pumpkin-orange. Shadows go greenish. It''s a mess."},
    {"type":"paragraph","text":"We wanted something different. We started by studying cinematography colour science — specifically how colorists in films like Dune and Blade Runner 2049 handle warm, high-contrast desert scenes. The answer was always in the tone curve, not the HSL panel."},
    {"type":"tip","label":"Key insight","text":"The warmth in Desert Gold doesn''t come from the Temperature slider. It comes from a custom tone curve that lifts the red channel in the mid-tones while keeping the shadows neutral. This is what prevents skin tones from going orange."}
  ]'::jsonb,
  'Behind the Scenes', 'PXL Creator', 'Editorial Team', 'PXL',
  '/assets/magical_sunset.webp', 'from-[#3d2b00] via-[#1a1200] to-[#0a0800]',
  ARRAY['Desert Gold','Behind the Scenes','Presets','Development'], 5, FALSE, TRUE, '2026-05-03T00:00:00Z'
),

(
  'The Best Budget Cameras for Content Creators in 2026',
  'best-budget-cameras-content-creators-2026',
  'You don''t need to spend $3,000 to get cinematic footage. These five cameras punch well above their price point.',
  '[
    {"type":"paragraph","text":"The camera market in 2026 is genuinely the best it has ever been at the entry level. Cameras that would have cost $2,000+ two years ago are now available for under $1,000. Here are the five we recommend most often."},
    {"type":"list","items":["Sony ZV-E10 II — Best overall for YouTube and social","Fujifilm X-S20 — Best for film simulation and colour science","DJI Osmo Pocket 3 — Best for travel and run-and-gun","Canon EOS R50 — Best for beginners transitioning from phone","OM System OM-5 — Best for outdoor and adventure shooters"]}
  ]'::jsonb,
  'Gear', 'PXL Creator', 'Editorial Team', 'PXL',
  '/assets/dramatic_city.webp', 'from-[#111827] via-[#0f172a] to-[#090e18]',
  ARRAY['Gear','Cameras','Budget','Content Creation'], 6, FALSE, TRUE, '2026-04-22T00:00:00Z'
),

(
  'Understanding Colour Theory for Photo Editing',
  'colour-theory-photo-editing-guide',
  'Why do some edits feel cohesive and others feel random? The answer is almost always colour theory. Here''s a practical guide.',
  '[
    {"type":"paragraph","text":"Every photo edit is making a colour decision, whether you realise it or not. Understanding why certain colour combinations work — and others don''t — is what separates editors who produce consistent, striking work from those who get lucky occasionally."},
    {"type":"heading","text":"The Colour Wheel in Editing"},
    {"type":"paragraph","text":"The most common colour combination in cinematic editing is the teal-and-orange split — cool shadows against warm skin and highlights. This works because teal and orange are complementary colours — directly opposite on the colour wheel. Complementary pairs create visual tension and make images feel dynamic."},
    {"type":"quote","text":"Colour grading isn''t about making things look good. It''s about making things feel right."}
  ]'::jsonb,
  'Tutorial', 'PXL Creator', 'Editorial Team', 'PXL',
  '/assets/film_green.webp', 'from-[#1a0a2b] via-[#120820] to-[#080510]',
  ARRAY['Color Theory','Tutorial','Editing','Advanced'], 8, FALSE, TRUE, '2026-04-15T00:00:00Z'
),

(
  'Why Your Presets Look Different on Every Screen',
  'why-presets-look-different-every-screen',
  'You edited on your laptop and it looked perfect. Then you opened it on your phone and it looked completely different. Here''s why.',
  '[
    {"type":"paragraph","text":"Monitor calibration is the single most overlooked aspect of the photography and editing workflow. If you''re editing on an uncalibrated screen, you''re essentially guessing what your photo looks like."},
    {"type":"tip","label":"Quick fix","text":"If you can''t afford a hardware calibrator, use your operating system''s built-in display calibration tool (System Preferences > Displays > Calibrate on Mac, or Display Color Calibration on Windows) as a starting point."}
  ]'::jsonb,
  'Tips & Tricks', 'PXL Creator', 'Editorial Team', 'PXL',
  '/assets/moody_brown.webp', 'from-[#0a1a10] via-[#081410] to-[#040a08]',
  ARRAY['Calibration','Monitors','Tips','Workflow'], 4, FALSE, TRUE, '2026-04-08T00:00:00Z'
),

(
  'A Travel Photographer on the Editing Workflow That Saves Him 10 Hours a Week',
  'travel-photographer-editing-workflow-interview',
  'Arjun Mehta shoots 40+ countries a year. This is the exact process he uses to go from card dump to finished gallery in under two hours.',
  '[
    {"type":"paragraph","text":"Arjun Mehta has shot in 43 countries. He uses PXL Creator presets, an aggressive culling workflow, and a set of Lightroom export presets that have cut his post-processing time from 12 hours per trip to under 2. We asked him to walk us through exactly how."},
    {"type":"heading","text":"Step 1: Cull First, Edit Never"},
    {"type":"paragraph","text":"''Most photographers edit too many photos. I cull down to 3% of what I shoot before I open a single image in Lightroom. If I''m not immediately drawn to it when I''m selecting, the viewer won''t be either.''"}
  ]'::jsonb,
  'Inspiration', 'PXL Creator', 'Editorial Team', 'PXL',
  '/assets/campfire.webp', 'from-[#1a0f00] via-[#120a00] to-[#080500]',
  ARRAY['Workflow','Travel Photography','Interview','Efficiency'], 6, FALSE, TRUE, '2026-03-29T00:00:00Z'
)

ON CONFLICT (slug) DO NOTHING;
