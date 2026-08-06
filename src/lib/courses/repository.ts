/**
 * src/lib/courses/repository.ts
 *
 * Data access layer for the public course storefront (/courses,
 * /courses/[slug]). Mirrors src/lib/presets/repository.ts exactly:
 * falls back to the static ALL_COURSES catalog when Supabase isn't
 * configured, so the site works out of the box and switches to the
 * database (managed via /admin/courses) once it's set up — same
 * resilience guarantee as presets, same reason.
 *
 * Used in Server Components only.
 */

import type { Course } from "@/types/course"
import { adaptCourses, adaptCourse } from "./adapter"
import { ALL_COURSES as STATIC_COURSES } from "@/data/courses"

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co"
  )
}

/** All published, non-archived courses, ordered for display. */
export async function getCourses(): Promise<Course[]> {
  if (!isSupabaseConfigured()) return STATIC_COURSES

  try {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("is_published", true)
      .eq("is_archived", false)
      .order("order_index", { ascending: true })

    if (error || !data || data.length === 0) return STATIC_COURSES
    return adaptCourses(data)
  } catch {
    return STATIC_COURSES
  }
}

/** Single published course by slug, or null if not found. */
export async function getCourseBySlug(slug: string): Promise<Course | null> {
  if (!isSupabaseConfigured()) {
    return STATIC_COURSES.find((c) => c.slug === slug) ?? null
  }

  try {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server")
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .eq("is_archived", false)
      .maybeSingle()

    if (error || !data) {
      // Fall back to static (covers the "migration not run yet" window).
      return STATIC_COURSES.find((c) => c.slug === slug) ?? null
    }
    return adaptCourse(data)
  } catch {
    return STATIC_COURSES.find((c) => c.slug === slug) ?? null
  }
}

/** All course slugs — used by generateStaticParams. Falls back to static slugs. */
export async function getAllCourseSlugs(): Promise<string[]> {
  const courses = await getCourses()
  return courses.map((c) => c.slug)
}
