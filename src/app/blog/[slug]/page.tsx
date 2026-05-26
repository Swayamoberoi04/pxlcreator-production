import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { Container } from "@/components/layout/Container"
import { ALL_POSTS } from "@/data/posts"
import type { BlogPost, ContentBlock, BlogCategory } from "@/types/blog"
import { cn } from "@/lib/utils"
import { siteConfig } from "@/config/site"
import { articleSchema, breadcrumbSchema } from "@/lib/seo/schemas"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

type PageProps = { params: Promise<{ slug: string }> }

/* ── Category colours ─────────────────────────────── */
const CATEGORY_STYLES: Record<BlogCategory, string> = {
  "Tutorial":           "text-blue-400    bg-blue-400/10    border-blue-400/20",
  "Gear":               "text-slate-300   bg-slate-400/10   border-slate-400/20",
  "Behind the Scenes":  "text-gold        bg-gold/10        border-gold/20",
  "Tips & Tricks":      "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  "Inspiration":        "text-purple-400  bg-purple-400/10  border-purple-400/20",
}

/* ── Static params ────────────────────────────────── */
export async function generateStaticParams() {
  return ALL_POSTS.map((p) => ({ slug: p.slug }))
}

/* ── SEO metadata ─────────────────────────────────── */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = ALL_POSTS.find((p) => p.slug === slug)
  if (!post) return {}

  const pageUrl = `${siteConfig.url}/blog/${post.slug}`

  return {
    title:       post.title,
    description: post.excerpt,
    keywords:    [...post.tags, post.category, "photography", "lightroom", "PXL Creator"],
    alternates:  { canonical: pageUrl },
    openGraph: {
      type:         "article",
      url:           pageUrl,
      title:         post.title,
      description:   post.excerpt,
      images:       [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: post.title }],
      publishedTime: post.publishedAt,
      authors:      [post.author.name],
      tags:          post.tags,
    },
    twitter: {
      card:        "summary_large_image",
      title:        post.title,
      description:  post.excerpt,
      images:       [siteConfig.ogImage],
    },
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  })
}

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = ALL_POSTS.find((p) => p.slug === slug)
  if (!post) notFound()

  const relatedPosts = ALL_POSTS
    .filter((p) => p.category === post.category && p.id !== post.id)
    .slice(0, 3)

  const catStyle = CATEGORY_STYLES[post.category]

  /* ── Structured data ── */
  const jsonLd = [
    articleSchema(post),
    breadcrumbSchema([
      { name: "Home", url: siteConfig.url },
      { name: "Blog", url: `${siteConfig.url}/blog` },
      { name: post.category, url: `${siteConfig.url}/blog` },
      { name: post.title, url: `${siteConfig.url}/blog/${post.slug}` },
    ]),
  ]

  return (
    <div className="relative w-full bg-background overflow-hidden">

      {/* Subtle reading atmosphere */}
      <LuminousEnvironment variant="neutral" intensity={0.5} />
      <GrainOverlay opacity={0.014} zIndex={1} />

      {/* ── JSON-LD structured data ── */}
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <Container size="narrow" className="relative z-10 py-14 sm:py-20">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-2 text-small text-muted mb-10" aria-label="Breadcrumb">
          <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          <span aria-hidden="true">/</span>
          <span className={cn("text-label rounded px-2 py-0.5 border", catStyle)}>
            {post.category}
          </span>
        </nav>

        {/* ── Article header ── */}
        <header className="flex flex-col gap-5 mb-10">
          <h1 className="heading-2 text-foreground">{post.title}</h1>
          <p className="text-lead">{post.excerpt}</p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs font-bold text-muted">
                {post.author.initials}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground leading-none">{post.author.name}</p>
                <p className="text-small text-muted">{post.author.role}</p>
              </div>
            </div>
            <span className="text-small text-muted">{formatDate(post.publishedAt)}</span>
            <span className="text-small text-muted">{post.readTime} min read</span>
          </div>
        </header>

        {/* ── Cover image ── */}
        <div className={cn(
          "relative w-full aspect-video rounded-2xl overflow-hidden border border-border mb-12 bg-gradient-to-br",
          post.coverGradient
        )}>
          <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center opacity-10 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-px bg-gold" style={{ height: `${45 + i * 8}%` }} />
            ))}
          </div>
          {/* Letterbox */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[8%] bg-background/50" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[8%] bg-background/50" />
        </div>

        {/* ── Article body ── */}
        {post.content && post.content.length > 0 ? (
          <article className="flex flex-col gap-6">
            {post.content.map((block, i) => (
              <ContentBlockRenderer key={i} block={block} />
            ))}
          </article>
        ) : (
          /* Stub for posts without full content yet */
          <div className="rounded-xl border border-border bg-surface px-6 py-10 text-center">
            <p className="text-muted text-body">Full article coming soon.</p>
          </div>
        )}

        {/* ── Tags ── */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-border">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-small text-muted bg-surface border border-border rounded-md px-2.5 py-1"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* ── Back link ── */}
        <div className="mt-12">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <ArrowLeftIcon />
            Back to Blog
          </Link>
        </div>

      </Container>

      {/* ── Related posts ── */}
      {relatedPosts.length > 0 && (
        <div className="w-full border-t border-border py-16 sm:py-20">
          <Container size="narrow">
            <div className="flex items-center gap-2 mb-8">
              <span className="h-px w-6 bg-gold" />
              <span className="text-label text-gold">More in {post.category}</span>
            </div>
            <div className="flex flex-col gap-4">
              {relatedPosts.map((related) => (
                <RelatedPostRow key={related.id} post={related} />
              ))}
            </div>
          </Container>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   Content block renderer
───────────────────────────────────────── */
function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-body text-foreground leading-[1.85] opacity-90">
          {block.text}
        </p>
      )

    case "heading":
      return (
        <h2 className="heading-3 text-foreground mt-4">
          {block.text}
        </h2>
      )

    case "subheading":
      return (
        <h3 className="heading-4 text-foreground mt-2">
          {block.text}
        </h3>
      )

    case "list":
      return (
        <ul className="flex flex-col gap-2.5 pl-1" role="list">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold shrink-0" aria-hidden="true" />
              <span className="text-body text-foreground opacity-90">{item}</span>
            </li>
          ))}
        </ul>
      )

    case "quote":
      return (
        <blockquote className="relative border-l-2 border-gold pl-6 py-1 my-2">
          <p className="text-body text-foreground italic opacity-90 leading-relaxed">
            &ldquo;{block.text}&rdquo;
          </p>
          {block.attribution && (
            <cite className="block text-small text-muted mt-2 not-italic">
              — {block.attribution}
            </cite>
          )}
        </blockquote>
      )

    case "tip":
      return (
        <div className="flex gap-4 rounded-xl border border-gold/20 bg-gold/5 p-5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold mt-0.5">
            <TipIcon />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-gold">{block.label}</p>
            <p className="text-body text-foreground opacity-90 leading-relaxed">{block.text}</p>
          </div>
        </div>
      )

    case "divider":
      return (
        <div className="flex items-center gap-3 py-2" aria-hidden="true">
          <div className="h-px flex-1 bg-border" />
          <div className="h-1.5 w-1.5 rounded-full bg-gold opacity-50" />
          <div className="h-px flex-1 bg-border" />
        </div>
      )

    default:
      return null
  }
}

/* ── Related post row ── */
function RelatedPostRow({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 hover:border-gold/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Colour swatch */}
      <div className={cn(
        "h-14 w-20 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br",
        post.coverGradient
      )} />
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm font-semibold text-foreground group-hover:text-gold transition-colors leading-snug line-clamp-2">
          {post.title}
        </p>
        <p className="text-small text-muted">{post.readTime} min read</p>
      </div>
      <ArrowRightIcon />
    </Link>
  )
}

/* ── Icons ── */
function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  )
}
function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted ml-auto" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}
function TipIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
