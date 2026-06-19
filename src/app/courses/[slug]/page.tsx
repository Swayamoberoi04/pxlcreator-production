import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { Container } from "@/components/layout/Container"
import { ALL_COURSES } from "@/data/courses"
import type { CourseLevel } from "@/types/course"
import { cn } from "@/lib/utils"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

type PageProps = { params: Promise<{ slug: string }> }

const LEVEL_STYLES: Record<CourseLevel, string> = {
  Beginner:     "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Intermediate: "text-blue-400   bg-blue-400/10   border-blue-400/20",
  Advanced:     "text-gold       bg-gold/10       border-gold/20",
}

export async function generateStaticParams() {
  return ALL_COURSES.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const course = ALL_COURSES.find((c) => c.slug === slug)
  if (!course) return {}
  return { title: course.title, description: course.tagline }
}


export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params
  const course = ALL_COURSES.find((c) => c.slug === slug)
  if (!course) notFound()

  const discount = course.originalPrice
    ? Math.round((1 - course.price / course.originalPrice) * 100)
    : null

  const related = ALL_COURSES
    .filter((c) => c.category === course.category && c.id !== course.id)
    .slice(0, 2)

  return (
    <div className="relative w-full bg-background overflow-hidden">
      <LuminousEnvironment variant="teal" intensity={0.65} />
      <GrainOverlay opacity={0.014} zIndex={1} />

      <Container size="wide" className="relative z-10 py-14 sm:py-20">

        {/* Breadcrumb */}
        <CinematicReveal variant="rise">
          <nav className="flex items-center gap-2 text-small text-muted mb-8" aria-label="Breadcrumb">
            <Link href="/courses" className="hover:text-foreground transition-colors">Courses</Link>
            <span aria-hidden="true">/</span>
            <span className={cn("text-label rounded px-2 py-0.5 border", LEVEL_STYLES[course.level])}>
              {course.level}
            </span>
          </nav>
        </CinematicReveal>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 xl:gap-14 items-start">

          {/* ═══════════ LEFT — Main content ═══════════ */}
          <div className="flex flex-col gap-8">

            {/* Header */}
            <CinematicReveal variant="depth">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="h-px w-6 bg-gold" />
                <span className="text-label text-gold">{course.category}</span>
              </div>
              <h1 className="heading-2 text-foreground">{course.title}</h1>
              <p className="text-lead">{course.tagline}</p>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
                {course.reviewCount && course.reviewCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < Math.round(course.rating ?? 0) ? "#C9A84C" : "none"} stroke={i < Math.round(course.rating ?? 0) ? "none" : "#555"} strokeWidth="1.5" aria-hidden="true">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                    <span className="text-sm font-medium text-foreground ml-0.5">{course.rating}</span>
                    <span className="text-small text-muted">({course.reviewCount} reviews)</span>
                  </div>
                )}
                <span className="text-small text-muted">{course.totalLessons} lessons · {course.totalHours}h total</span>
              </div>

              {/* Instructor */}
              <div className="flex items-center gap-2.5 pt-1">
                <div className="h-8 w-8 rounded-full bg-gold flex items-center justify-center text-background text-xs font-bold shrink-0">
                  {course.instructorInitials}
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">{course.instructor}</span>
                  <span className="text-small text-muted ml-2">{course.instructorRole}</span>
                </div>
              </div>
            </div>
            </CinematicReveal>

            {/* Cover */}
            <CinematicReveal variant="depth" delay={0.05}>
            <div className={cn(
              "relative w-full aspect-video rounded-2xl overflow-hidden border border-border bg-gradient-to-br",
              course.coverGradient
            )}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-background/40 backdrop-blur-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white" className="translate-x-0.5" aria-hidden="true">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </div>
              </div>
              <div aria-hidden="true" className="absolute bottom-4 left-4 flex gap-2">
                <span className={cn("text-label rounded-md px-2.5 py-1 border", LEVEL_STYLES[course.level])}>
                  {course.level}
                </span>
                {course.badge && (
                  <span className="text-label rounded-md px-2.5 py-1 bg-gold text-background">
                    {course.badge}
                  </span>
                )}
              </div>
            </div>
            </CinematicReveal>

            {/* What you'll learn */}
            {course.whatYouLearn && (
              <CinematicReveal variant="rise" delay={0.1}>
              <div className="rounded-xl border border-gold/10 bg-surface/70 backdrop-blur-sm p-6 flex flex-col gap-4">
                <h2 className="font-display font-bold text-base text-foreground">What you&apos;ll learn</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list">
                  {course.whatYouLearn.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-1 text-gold shrink-0">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                      <span className="text-sm text-foreground/90">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              </CinematicReveal>
            )}

            {/* Course modules */}
            {course.modules && (
              <div className="flex flex-col gap-4">
                <h2 className="font-display font-bold text-base text-foreground">Course Content</h2>
                <div className="flex flex-col divide-y divide-border rounded-xl overflow-hidden border border-border">
                  {course.modules.map((mod, i) => (
                    <div key={i} className="flex items-center justify-between bg-surface px-5 py-4 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-display font-bold text-sm text-gold shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate">{mod.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-small text-muted shrink-0">
                        <span>{mod.lessons} lessons</span>
                        <span aria-hidden="true">·</span>
                        <span>{mod.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {course.description && (
              <div className="flex flex-col gap-3">
                <h2 className="font-display font-bold text-base text-foreground">About this course</h2>
                <p className="text-body text-muted leading-relaxed">{course.description}</p>
              </div>
            )}

          </div>

          {/* ═══════════ RIGHT — Sticky purchase card ═══════════ */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-24">
            <div className="depth-card rounded-2xl border border-gold/15 bg-surface/70 backdrop-blur-sm overflow-hidden shadow-[0_0_60px_rgba(20,184,166,0.05)]">

              {/* Price */}
              <div className="p-6 border-b border-border">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-display font-bold text-3xl text-gold">${course.price}</span>
                  {course.originalPrice && (
                    <>
                      <span className="text-muted line-through">${course.originalPrice}</span>
                      <span className="text-label text-red-400 bg-destructive/10 rounded px-2 py-0.5">
                        −{discount}%
                      </span>
                    </>
                  )}
                </div>
                {course.originalPrice && (
                  <p className="text-small text-muted mt-1">
                    Limited time offer — save ${course.originalPrice - course.price}
                  </p>
                )}
              </div>

              {/* Enroll button */}
              <div className="p-6 flex flex-col gap-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-4 text-base font-semibold text-background hover:bg-gold-dim active:scale-[0.98] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Enroll Now — ${course.price}
                </button>
                <p className="text-center text-small text-muted">
                  30-day money-back guarantee
                </p>
              </div>

              {/* What's included */}
              {course.includes && (
                <div className="px-6 pb-6 flex flex-col gap-3">
                  <p className="text-label text-muted">This course includes</p>
                  <ul className="flex flex-col gap-2.5" role="list">
                    {course.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-0.5 text-gold shrink-0">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                        <span className="text-small text-foreground/80">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Back link */}
            <Link
              href="/courses"
              className="flex items-center justify-center gap-2 text-small text-muted hover:text-foreground transition-colors focus-visible:outline-none"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Back to all courses
            </Link>
          </div>

        </div>

        {/* ── Related courses ── */}
        {related.length > 0 && (
          <div className="mt-16 pt-12 border-t border-border/40">
            <CinematicReveal variant="rise">
              <div className="flex items-center gap-2 mb-8">
                <span className="h-px w-6 bg-gold" />
                <span className="text-label text-gold">More {course.category} Courses</span>
              </div>
            </CinematicReveal>
            <CinematicStagger stagger={0.12} baseDelay={0.05} itemVariant="rise" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {related.map((c) => (
                <CinematicItem key={c.id} variant="rise">
                  <Link
                    href={`/courses/${c.slug}`}
                    className="depth-card group flex items-center gap-4 rounded-xl border border-border/60 bg-surface/70 backdrop-blur-sm p-4 hover:border-gold/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className={cn("h-14 w-20 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br", c.coverGradient)} />
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground group-hover:text-gold transition-colors line-clamp-2 leading-snug">
                        {c.title}
                      </p>
                      <p className="text-small text-muted">{c.totalLessons} lessons · ${c.price}</p>
                    </div>
                  </Link>
                </CinematicItem>
              ))}
            </CinematicStagger>
          </div>
        )}

      </Container>
    </div>
  )
}
