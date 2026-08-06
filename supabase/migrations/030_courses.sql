-- ============================================================
-- PXL Creator — Courses
-- Migration: 030_courses.sql
--
-- `curriculum` is a JSONB array of sections, each with a lessons array:
--   [{ "title": "Getting Started", "lessons": [
--       { "title": "Welcome", "type": "video", "url": "...", "duration_min": 4 },
--       { "title": "Cheatsheet", "type": "pdf", "url": "..." },
--       { "title": "Further reading", "type": "external", "url": "..." }
--   ]}]
-- Kept as JSONB rather than normalized course_sections/course_lessons
-- tables — the curriculum is edited as one unit in the admin UI (not
-- searched/filtered/paginated independently), so a relational schema
-- would add migration + join overhead with no admin-UI benefit. Can be
-- normalized later without changing the admin API contract (still a
-- "curriculum" field on the course).
--
-- `students_count` / `sales_count` / `revenue_cached` / `rating` /
-- `review_count` / `completion_avg_pct` are DISPLAY fields, not live
-- analytics — they're editable in this pass so the admin can enter known
-- figures. Wiring them to real enrollment/order data is Analytics (module
-- #8 in the CMS roadmap), not duplicated here.
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS courses (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  title             TEXT        NOT NULL,
  slug              TEXT        NOT NULL UNIQUE,
  subtitle          TEXT,
  description       TEXT,
  category          TEXT,
  difficulty        TEXT        CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  instructor        TEXT,
  duration_minutes  INTEGER,
  lesson_count      INTEGER     NOT NULL DEFAULT 0,

  thumbnail_url     TEXT,
  banner_url        TEXT,
  gallery           TEXT[]      NOT NULL DEFAULT '{}',
  trailer_video_url TEXT,

  price             NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_price    NUMERIC(10,2),
  currency          TEXT        NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'INR', 'EUR', 'GBP')),

  badge             TEXT,
  is_bestseller     BOOLEAN     NOT NULL DEFAULT FALSE,
  is_featured       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_coming_soon    BOOLEAN     NOT NULL DEFAULT FALSE,
  is_published      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_archived       BOOLEAN     NOT NULL DEFAULT FALSE,

  access_level      TEXT        NOT NULL DEFAULT 'premium' CHECK (access_level IN ('free', 'premium', 'purchased_only')),
  tags              TEXT[]      NOT NULL DEFAULT '{}',
  curriculum        JSONB       NOT NULL DEFAULT '[]',

  seo_title         TEXT,
  seo_description   TEXT,
  seo_keywords      TEXT,

  -- Display stats — see note above.
  students_count     INTEGER       NOT NULL DEFAULT 0,
  sales_count         INTEGER       NOT NULL DEFAULT 0,
  revenue_cached       NUMERIC(12,2) NOT NULL DEFAULT 0,
  rating               NUMERIC(3,2)  NOT NULL DEFAULT 0,
  review_count         INTEGER       NOT NULL DEFAULT 0,
  completion_avg_pct   NUMERIC(5,2)  NOT NULL DEFAULT 0,

  order_index       INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_slug        ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_published    ON courses(is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_courses_order        ON courses(order_index);

CREATE OR REPLACE FUNCTION courses_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS courses_updated_at ON courses;
CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION courses_touch_updated_at();

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published courses" ON courses;
CREATE POLICY "Public can read published courses"
  ON courses FOR SELECT
  USING (is_published = TRUE AND is_archived = FALSE);

-- Writes: service role only (admin API routes).
