/**
 * src/lib/courses/adapter.ts
 *
 * Maps a `courses` DB row (src/types/database.ts) to the public storefront
 * `Course` shape (src/types/course.ts) consumed by /courses and
 * /courses/[slug]. Mirrors src/lib/presets/adapter.ts's role for presets.
 *
 * The DB stores a detailed `curriculum` (sections → individual lessons with
 * type/url/duration_min — see migration 030/031) so admins can manage real
 * lesson content. The public pages only ever display a per-SECTION summary
 * (title, lesson count, total duration) — never individual lesson titles —
 * so this adapter derives that summary instead of the admin UI needing to
 * maintain two parallel data shapes.
 */

import type { Database } from "@/types/database"
import type { Course, CourseLevel, CourseCategory, CourseModule } from "@/types/course"

type CourseRow = Database["public"]["Tables"]["courses"]["Row"]

interface RawLesson { title?: string; type?: string; url?: string; duration_min?: number }
interface RawSection { title?: string; lessons?: RawLesson[] }

function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0m"
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${String(m).padStart(2, "0")}m`
}

/** Derive the public module-summary list from the admin's detailed curriculum JSON. */
function deriveModules(curriculum: unknown): CourseModule[] {
  if (!Array.isArray(curriculum)) return []
  return (curriculum as RawSection[]).map((section) => {
    const lessons = section.lessons ?? []
    const totalMinutes = lessons.reduce((sum, l) => sum + (l.duration_min ?? 0), 0)
    return {
      title: section.title ?? "",
      lessons: lessons.length,
      duration: formatDuration(totalMinutes),
    }
  })
}

const KNOWN_LEVELS: readonly CourseLevel[] = ["Beginner", "Intermediate", "Advanced"]
const KNOWN_CATEGORIES: readonly CourseCategory[] = ["Editing", "Color Grading", "Business", "Composition", "Filmmaking"]

export function adaptCourse(row: CourseRow): Course {
  const level = KNOWN_LEVELS.includes(row.difficulty as CourseLevel) ? (row.difficulty as CourseLevel) : "Beginner"
  const category = KNOWN_CATEGORIES.includes(row.category as CourseCategory) ? (row.category as CourseCategory) : "Editing"

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: row.subtitle ?? "",
    description: row.description ?? undefined,
    instructor: row.instructor ?? "PXL Creator",
    instructorRole: row.instructor_role ?? "",
    instructorInitials: row.instructor_initials ?? "PXL",
    price: row.discount_price ?? row.price,
    originalPrice: row.discount_price != null ? row.price : undefined,
    level,
    category,
    totalLessons: row.lesson_count,
    totalHours: Math.round(((row.duration_minutes ?? 0) / 60) * 10) / 10,
    students: row.students_count || undefined,
    rating: row.rating || undefined,
    reviewCount: row.review_count || undefined,
    badge: row.badge ?? undefined,
    coverGradient: row.cover_gradient ?? "from-[#141414] via-[#1a1a1a] to-[#0a0a0a]",
    coverImage: row.thumbnail_url ?? undefined,
    isFeatured: row.is_featured,
    whatYouLearn: row.what_you_learn.length > 0 ? row.what_you_learn : undefined,
    modules: deriveModules(row.curriculum),
    includes: row.includes.length > 0 ? row.includes : undefined,
  }
}

export function adaptCourses(rows: CourseRow[]): Course[] {
  return rows.map(adaptCourse)
}
