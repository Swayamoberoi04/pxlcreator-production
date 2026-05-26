export type BlogCategory =
  | "Tutorial"
  | "Gear"
  | "Behind the Scenes"
  | "Tips & Tricks"
  | "Inspiration"

export interface BlogAuthor {
  name: string
  role: string
  initials: string
}

/* ── Structured content blocks ──────────────────────────
   Instead of raw HTML, content is typed.
   Easy to render, easy to migrate to a CMS later.
──────────────────────────────────────────────────────── */
export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading";   text: string }
  | { type: "subheading"; text: string }
  | { type: "list";      items: string[] }
  | { type: "quote";     text: string; attribution?: string }
  | { type: "tip";       label: string; text: string }
  | { type: "divider" }

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  category: BlogCategory
  author: BlogAuthor
  publishedAt: string   // ISO date string  e.g. "2026-05-01"
  readTime: number      // estimated minutes
  featured: boolean
  coverGradient: string  // Tailwind gradient fallback
  coverImage?:   string  // Real image path e.g. "/assets/moody_city.webp"
  tags: string[]
  content?: ContentBlock[]
}
