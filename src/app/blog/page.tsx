import type { Metadata } from "next"
import Link  from "next/link"
import Image from "next/image"
import { Container } from "@/components/layout/Container"
import { ALL_POSTS, FEATURED_POST, RECENT_POSTS } from "@/data/posts"
import type { BlogPost, BlogCategory } from "@/types/blog"
import { cn } from "@/lib/utils"
import { LuminousEnvironment }  from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }         from "@/components/ui/GrainOverlay"
import { CinematicBackground }  from "@/components/ui/CinematicBackground"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Photography tutorials, editing tips, gear reviews and behind-the-scenes from the PXL Creator team.",
}

/* Category accent colours */
const CATEGORY_STYLES: Record<BlogCategory, string> = {
  "Tutorial":           "text-blue-400   bg-blue-400/10   border-blue-400/20",
  "Gear":               "text-slate-300  bg-slate-400/10  border-slate-400/20",
  "Behind the Scenes":  "text-gold       bg-gold/10       border-gold/20",
  "Tips & Tricks":      "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  "Inspiration":        "text-purple-400 bg-purple-400/10 border-purple-400/20",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default function BlogPage() {
  return (
    <div className="w-full bg-background">

      {/* ── Page hero ── */}
      <div className="relative w-full border-b border-border overflow-hidden depth-section">
        <LuminousEnvironment variant="indigo" intensity={0.85} />
        <CinematicBackground variant="mission" />
        <GrainOverlay opacity={0.018} animated zIndex={2} />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#6366f1]/25 to-transparent z-[3]" />

        <Container className="relative z-10 py-16 sm:py-24">
          <div className="flex flex-col items-center text-center gap-5 max-w-2xl mx-auto">

            <CinematicReveal variant="rise">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
                <span className="text-label text-gold/80 tracking-widest animate-gold-flicker">The Journal</span>
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
              </div>
            </CinematicReveal>

            <CinematicReveal variant="depth" delay={0.07}>
              <h1 className="heading-2 text-foreground">
                Tutorials, Tips &amp;{" "}
                <span className="text-gold-gradient">Stories</span>
              </h1>
            </CinematicReveal>

            <CinematicReveal variant="rise" delay={0.14}>
              <p className="text-lead max-w-lg">
                Editing guides, gear reviews, and behind-the-scenes from the
                PXL Creator team. {ALL_POSTS.length} articles and counting.
              </p>
            </CinematicReveal>

          </div>
        </Container>
      </div>

      <Container className="py-14 sm:py-20">

        {/* ── Featured post ── */}
        <div className="mb-14">
          <CinematicReveal variant="gentle">
            <div className="flex items-center gap-2 mb-6">
              <span className="h-px w-6 bg-gold" />
              <span className="text-label text-gold">Featured</span>
            </div>
          </CinematicReveal>
          <CinematicReveal variant="rise" delay={0.06}>
            <FeaturedCard post={FEATURED_POST} />
          </CinematicReveal>
        </div>

        {/* ── Recent posts ── */}
        <div>
          <CinematicReveal variant="gentle">
            <div className="flex items-center gap-2 mb-8">
              <span className="h-px w-6 bg-gold" />
              <span className="text-label text-gold">Recent Articles</span>
            </div>
          </CinematicReveal>
          <CinematicStagger
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            itemVariant="rise"
            stagger={0.08}
          >
            {RECENT_POSTS.map((post) => (
              <CinematicItem key={post.id} variant="rise">
                <PostCard post={post} />
              </CinematicItem>
            ))}
          </CinematicStagger>
        </div>

      </Container>
    </div>
  )
}

/* ─────────────────────────────────────────
   Featured post card — full-width, landscape
───────────────────────────────────────── */
function FeaturedCard({ post }: { post: BlogPost }) {
  const catStyle = CATEGORY_STYLES[post.category]

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group grid grid-cols-1 lg:grid-cols-2 rounded-2xl overflow-hidden border border-border bg-surface hover:border-gold/30 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Cover */}
      <div className={cn(
        "relative aspect-video lg:aspect-auto min-h-[220px] bg-gradient-to-br overflow-hidden",
        post.coverGradient
      )}>
        {post.coverImage && (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width:1024px) 100vw, 50vw"
            className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
          />
        )}
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/30" />
        {/* Featured badge */}
        <div className="absolute top-4 left-4 z-10">
          <span className="text-label bg-gold text-background rounded-md px-2.5 py-1">
            Featured
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col justify-between gap-6 p-7 sm:p-8">
        <div className="flex flex-col gap-4">
          <span className={cn("text-label rounded-md px-2.5 py-1 border w-fit", catStyle)}>
            {post.category}
          </span>
          <h2 className="heading-3 text-foreground group-hover:text-gold transition-colors duration-200 leading-snug">
            {post.title}
          </h2>
          <p className="text-lead">{post.excerpt}</p>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between border-t border-border pt-5">
          <div className="flex items-center gap-2.5">
            <AuthorAvatar initials={post.author.initials} />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground leading-none">{post.author.name}</span>
              <span className="text-small text-muted">{post.author.role}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-small text-muted">
            <span>{formatDate(post.publishedAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{post.readTime} min read</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ─────────────────────────────────────────
   Regular post card — vertical
───────────────────────────────────────── */
function PostCard({ post }: { post: BlogPost }) {
  const catStyle = CATEGORY_STYLES[post.category]

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-xl overflow-hidden border border-border bg-surface hover:border-gold/30 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(201,168,76,0.06)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Cover */}
      <div className={cn(
        "relative aspect-video w-full bg-gradient-to-br overflow-hidden",
        post.coverGradient
      )}>
        {post.coverImage && (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
            className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.04]"
          />
        )}
        {/* Consistent dark overlay for brand mood */}
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 p-5 flex-1">
        <span className={cn("text-label rounded-md px-2 py-0.5 border w-fit", catStyle)}>
          {post.category}
        </span>

        <h3 className="font-display font-bold text-base text-foreground group-hover:text-gold transition-colors duration-200 leading-snug line-clamp-2">
          {post.title}
        </h3>

        <p className="text-small text-muted leading-relaxed line-clamp-3 flex-1">
          {post.excerpt}
        </p>

        {/* Meta */}
        <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
          <div className="flex items-center gap-2">
            <AuthorAvatar initials={post.author.initials} small />
            <span className="text-small text-muted">{post.author.name}</span>
          </div>
          <span className="text-small text-muted">{post.readTime} min</span>
        </div>
      </div>
    </Link>
  )
}

/* ── Shared ── */
function AuthorAvatar({ initials, small }: { initials: string; small?: boolean }) {
  return (
    <div className={cn(
      "shrink-0 rounded-full bg-surface-2 border border-border flex items-center justify-center font-bold text-muted",
      small ? "h-6 w-6 text-[9px]" : "h-9 w-9 text-xs"
    )}>
      {initials}
    </div>
  )
}
