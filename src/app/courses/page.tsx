import type { Metadata } from "next"
import Link  from "next/link"
import Image from "next/image"
import { Container } from "@/components/layout/Container"
import { ALL_COURSES, FEATURED_COURSE, OTHER_COURSES } from "@/data/courses"
import type { Course, CourseLevel } from "@/types/course"
import { cn } from "@/lib/utils"
import { LuminousEnvironment }  from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }         from "@/components/ui/GrainOverlay"
import { CinematicBackground }  from "@/components/ui/CinematicBackground"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Learn photography editing, colour grading and business from PXL Creator. Practical video courses built for real creators.",
}

const LEVEL_STYLES: Record<CourseLevel, string> = {
  Beginner:     "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Intermediate: "text-blue-400   bg-blue-400/10   border-blue-400/20",
  Advanced:     "text-gold       bg-gold/10       border-gold/20",
}


export default function CoursesPage() {
  return (
    <div className="w-full bg-background">

      {/* â”€â”€ Hero â”€â”€ */}
      <div className="relative w-full border-b border-border overflow-hidden depth-section">
        <LuminousEnvironment variant="teal" intensity={0.9} />
        <CinematicBackground variant="mission" />
        <GrainOverlay opacity={0.018} animated zIndex={2} />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-500/25 to-transparent z-[3]" />

        <Container className="relative z-10 py-16 sm:py-24">
          <div className="flex flex-col items-center text-center gap-5 max-w-2xl mx-auto">

            <CinematicReveal variant="rise">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
                <span className="text-label text-gold/80 tracking-widest animate-gold-flicker">Learn</span>
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
              </div>
            </CinematicReveal>

            <CinematicReveal variant="depth" delay={0.07}>
              <h1 className="heading-2 text-foreground">
                Courses Built for{" "}
                <span className="text-gold-gradient">Real Creators</span>
              </h1>
            </CinematicReveal>

            <CinematicReveal variant="rise" delay={0.13}>
              <p className="text-lead max-w-lg">
                {ALL_COURSES.length} practical courses covering editing, colour grading,
                composition and business â€” taught by people who actually shoot.
              </p>
            </CinematicReveal>

            {/* Stats row â€” centered with pipe dividers */}
            <div className="flex items-center pt-2">
              <StatPill value={`${ALL_COURSES.length}`} label="Courses" />
              <span className="mx-5 h-7 w-px bg-border shrink-0" aria-hidden="true" />
              <StatPill
                value={`${ALL_COURSES.reduce((s, c) => s + c.totalLessons, 0)}+`}
                label="Lessons"
              />
            </div>

          </div>
        </Container>
      </div>

      <Container className="py-14 sm:py-20">

        {/* â”€â”€ Featured course â”€â”€ */}
        <div className="mb-14">
          <CinematicReveal variant="gentle">
            <div className="flex items-center gap-2 mb-6">
              <span className="h-px w-6 bg-gold" />
              <span className="text-label text-gold">Featured Course</span>
            </div>
          </CinematicReveal>
          <CinematicReveal variant="rise" delay={0.06}>
            <FeaturedCourseCard course={FEATURED_COURSE} />
          </CinematicReveal>
        </div>

        {/* â”€â”€ All other courses â”€â”€ */}
        <div>
          <CinematicReveal variant="gentle">
            <div className="flex items-center gap-2 mb-8">
              <span className="h-px w-6 bg-gold" />
              <span className="text-label text-gold">All Courses</span>
            </div>
          </CinematicReveal>
          <CinematicStagger
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            itemVariant="rise"
            stagger={0.09}
          >
            {OTHER_COURSES.map((course) => (
              <CinematicItem key={course.id} variant="rise">
                <CourseCard course={course} />
              </CinematicItem>
            ))}
          </CinematicStagger>
        </div>

      </Container>
    </div>
  )
}

/* â”€â”€ Featured course â€” wide horizontal card â”€â”€ */
function FeaturedCourseCard({ course }: { course: Course }) {
  const discount = course.originalPrice
    ? Math.round((1 - course.price / course.originalPrice) * 100)
    : null

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group grid grid-cols-1 lg:grid-cols-[2fr_3fr] rounded-2xl overflow-hidden border border-border bg-surface hover:border-gold/30 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Cover */}
      <div className={cn(
        "relative aspect-video lg:aspect-auto min-h-[200px] bg-gradient-to-br overflow-hidden",
        course.coverGradient
      )}>
        {course.coverImage && (
          <Image
            src={course.coverImage}
            alt={course.title}
            fill
            sizes="(max-width:1024px) 100vw, 40vw"
            className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
          />
        )}
        <div className="absolute inset-0 bg-black/35" />
        <div aria-hidden="true" className="absolute inset-0 flex items-end justify-start p-5 gap-2 z-10">
          <span className={cn("text-label rounded-md px-2.5 py-1 border backdrop-blur-sm", LEVEL_STYLES[course.level])}>
            {course.level}
          </span>
          {course.badge && (
            <span className="text-label rounded-md px-2.5 py-1 bg-gold text-background">
              {course.badge}
            </span>
          )}
        </div>
        {/* Play button hint */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-background/30 backdrop-blur-sm group-hover:bg-gold/20 group-hover:border-gold/30 transition-all duration-300">
            <PlayIcon />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col justify-between gap-5 p-7 sm:p-8">
        <div className="flex flex-col gap-3">
          <span className="text-label text-gold">{course.category}</span>
          <h2 className="heading-3 text-foreground group-hover:text-gold transition-colors duration-200 leading-snug">
            {course.title}
          </h2>
          <p className="text-lead line-clamp-2">{course.tagline}</p>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <CourseStat icon={<LessonIcon />} label={`${course.totalLessons} lessons`} />
          <CourseStat icon={<ClockIcon />}  label={`${course.totalHours}h content`} />
          {course.reviewCount && course.reviewCount > 0 && (
            <CourseStat icon={<StarIcon />} label={`${course.rating} (${course.reviewCount})`} gold />
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between border-t border-border pt-5">
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-2xl text-gold">${course.price}</span>
            {course.originalPrice && (
              <>
                <span className="text-small text-muted line-through">${course.originalPrice}</span>
                <span className="text-label text-red-400">âˆ’{discount}%</span>
              </>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold group-hover:gap-2.5 transition-all duration-200">
            View Course
            <ArrowRightIcon />
          </span>
        </div>
      </div>
    </Link>
  )
}

/* â”€â”€ Regular course card â€” vertical â”€â”€ */
function CourseCard({ course }: { course: Course }) {
  const discount = course.originalPrice
    ? Math.round((1 - course.price / course.originalPrice) * 100)
    : null

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col rounded-xl overflow-hidden border border-border bg-surface hover:border-gold/30 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(255,214,10,0.06)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Cover */}
      <div className={cn(
        "relative aspect-video bg-gradient-to-br overflow-hidden",
        course.coverGradient
      )}>
        {course.coverImage && (
          <Image
            src={course.coverImage}
            alt={course.title}
            fill
            sizes="(max-width:640px) 100vw, 50vw"
            className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.04]"
          />
        )}
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-background/30 backdrop-blur-sm group-hover:bg-gold/20 group-hover:border-gold/30 transition-all duration-300">
            <PlayIcon small />
          </div>
        </div>
        <div aria-hidden="true" className="absolute bottom-3 left-3 flex gap-2 z-10">
          <span className={cn("text-label rounded-md px-2 py-0.5 border backdrop-blur-sm", LEVEL_STYLES[course.level])}>
            {course.level}
          </span>
          {course.badge && (
            <span className="text-label rounded-md px-2 py-0.5 bg-gold text-background">
              {course.badge}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-5 flex-1">
        <span className="text-label text-gold/70">{course.category}</span>
        <h3 className="font-display font-bold text-base text-foreground group-hover:text-gold transition-colors duration-200 leading-snug">
          {course.title}
        </h3>
        <p className="text-small text-muted line-clamp-2 flex-1">{course.tagline}</p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-small text-muted">
          <span>{course.totalLessons} lessons</span>
          <span aria-hidden="true">Â·</span>
          <span>{course.totalHours}h</span>
          <span aria-hidden="true">Â·</span>
          {course.rating && <span className="text-gold">â˜… {course.rating}</span>}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-lg text-gold">${course.price}</span>
            {course.originalPrice && (
              <>
                <span className="text-small text-muted line-through">${course.originalPrice}</span>
                <span className="text-label text-red-400">âˆ’{discount}%</span>
              </>
            )}
          </div>
          <span className="text-small font-medium text-muted group-hover:text-gold transition-colors">
            View â†’
          </span>
        </div>
      </div>
    </Link>
  )
}

/* â”€â”€ Helpers â”€â”€ */
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span className="font-display font-bold text-xl text-gold leading-none">{value}</span>
      <span className="text-small text-muted whitespace-nowrap">{label}</span>
    </div>
  )
}

function CourseStat({ icon, label, gold }: { icon: React.ReactNode; label: string; gold?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={gold ? "text-gold" : "text-muted"}>{icon}</span>
      <span className={cn("text-small", gold ? "text-gold font-medium" : "text-muted")}>{label}</span>
    </div>
  )
}

/* â”€â”€ Icons â”€â”€ */
function PlayIcon({ small }: { small?: boolean }) {
  const s = small ? 12 : 14
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" className="text-white/80 translate-x-0.5" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}
function LessonIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
}
function ClockIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function StarIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
}
function ArrowRightIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
}

