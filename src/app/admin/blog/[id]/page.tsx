"use client"

/**
 * src/app/admin/blog/[id]/page.tsx
 *
 * Post create/edit — AdminEditShell + useAdminResourceItem, BlogContentEditor
 * for the typed content-block array, and scheduled publish via published_at.
 */

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { AdminEditShell } from "@/components/admin/AdminEditShell"
import { FormField, FormSection, TextInput, TextArea, Select } from "@/components/admin/ui/FormField"
import { ImageUploader } from "@/components/admin/ui/ImageUploader"
import { ToggleSwitch } from "@/components/admin/ui/ToggleSwitch"
import { BlogContentEditor } from "@/components/admin/ui/BlogContentEditor"
import { SEOForm } from "@/components/admin/ui/SEOForm"
import { useAdminResourceItem } from "@/hooks/admin/useAdminResourceItem"
import { slugify } from "@/lib/admin/validation"
import type { Database } from "@/types/database"
import type { ContentBlock } from "@/types/blog"

type Post = Database["public"]["Tables"]["blog_posts"]["Row"]

const CATEGORIES = ["Tutorial", "Gear", "Behind the Scenes", "Tips & Tricks", "Inspiration"] as const

const EMPTY_POST = {
  title: "", slug: "", excerpt: "", content: [],
  category: "Tutorial", author_name: "PXL Creator", author_role: "Editorial Team", author_initials: "PXL",
  cover_image_url: "", banner_url: "", cover_gradient: "", tags: [], reading_time_minutes: 5,
  is_featured: false, is_published: false, published_at: null,
  views_count: 0, likes_count: 0, shares_count: 0,
  seo_title: "", seo_description: "", seo_keywords: "", og_image_url: "", canonical_url: "",
} as unknown as Post

/** ISO string <-> the value a <input type="datetime-local"> understands (no timezone). */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function BlogEditPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const isNew = id === "new"

  const item = useAdminResourceItem<Post>({
    basePath: "/api/admin/blog",
    id,
    emptyDraft: EMPTY_POST,
  })

  const [slugTouched, setSlugTouched] = useState(!isNew)
  const d = item.draft

  async function handleSave() {
    const saved = await item.save()
    if (saved && isNew) router.replace(`/admin/blog/${saved.id}`)
  }

  async function handleDelete() {
    const ok = await item.remove()
    if (ok) router.push("/admin/blog")
  }

  async function handleDuplicate() {
    const copy = await item.duplicate()
    if (copy) router.push(`/admin/blog/${copy.id}`)
  }

  const isLive = Boolean(d?.is_published && (!d.published_at || new Date(d.published_at) <= new Date()))

  return (
    <AdminEditShell
      title={d?.title || (isNew ? "New Post" : "Post")}
      breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Blog", href: "/admin/blog" }, { label: d?.title || "New" }]}
      loading={item.loading}
      saving={item.saving}
      dirty={item.dirty}
      savedAt={item.savedAt}
      error={item.error}
      isNew={isNew}
      isPublished={d?.is_published}
      onSave={handleSave}
      onPublish={item.publish}
      onUnpublish={item.unpublish}
      onDuplicate={!isNew ? handleDuplicate : undefined}
      onDelete={!isNew ? handleDelete : undefined}
    >
      {d && (
        <>
          {isLive && (
            <a
              href={`/blog/${d.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start text-[0.8125rem] text-gold/80 hover:text-gold transition-colors"
            >
              View live post →
            </a>
          )}

          <FormSection title="Basic Info">
            <FormField label="Title" required>
              <TextInput
                value={d.title}
                onChange={(e) => {
                  item.setField("title", e.target.value)
                  if (!slugTouched) item.setField("slug", slugify(e.target.value))
                }}
              />
            </FormField>
            <FormField label="Slug" required hint="Used in the post URL">
              <TextInput value={d.slug} onChange={(e) => { setSlugTouched(true); item.setField("slug", e.target.value) }} />
            </FormField>
            <FormField label="Excerpt" hint="Shown in cards and search results">
              <TextArea rows={2} value={d.excerpt ?? ""} onChange={(e) => item.setField("excerpt", e.target.value)} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Category">
                <Select value={d.category} onChange={(e) => item.setField("category", e.target.value as Post["category"])}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </FormField>
              <FormField label="Reading Time (minutes)">
                <TextInput type="number" value={d.reading_time_minutes} onChange={(e) => item.setField("reading_time_minutes", Number(e.target.value))} />
              </FormField>
            </div>
            <FormField label="Tags" hint="Comma-separated">
              <TextInput
                value={(d.tags ?? []).join(", ")}
                onChange={(e) => item.setField("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
              />
            </FormField>
          </FormSection>

          <FormSection title="Author">
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Name">
                <TextInput value={d.author_name} onChange={(e) => item.setField("author_name", e.target.value)} />
              </FormField>
              <FormField label="Role">
                <TextInput value={d.author_role} onChange={(e) => item.setField("author_role", e.target.value)} />
              </FormField>
              <FormField label="Initials">
                <TextInput value={d.author_initials} onChange={(e) => item.setField("author_initials", e.target.value)} maxLength={4} />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Media">
            <FormField label="Cover Image">
              <ImageUploader value={d.cover_image_url ?? ""} onChange={(url) => item.setField("cover_image_url", url)} folder="blogs" aspect="video" />
            </FormField>
            <FormField label="Banner">
              <ImageUploader value={d.banner_url ?? ""} onChange={(url) => item.setField("banner_url", url)} folder="blogs" aspect="banner" />
            </FormField>
            <FormField label="Cover Gradient" hint="Tailwind gradient classes, used as a fallback when no cover image is set">
              <TextInput value={d.cover_gradient ?? ""} onChange={(e) => item.setField("cover_gradient", e.target.value)} className="font-mono text-[0.8125rem]" />
            </FormField>
          </FormSection>

          <FormSection title="Content" description="Build the article from blocks — paragraphs, headings, images, video, code, tables, and CTAs.">
            <BlogContentEditor
              value={(d.content as unknown as ContentBlock[]) ?? []}
              onChange={(next) => item.setField("content", next as unknown as Post["content"])}
            />
          </FormSection>

          <FormSection title="Publishing">
            <div className="flex flex-col gap-3">
              <ToggleSwitch label="Featured" checked={d.is_featured} onChange={(v) => item.setField("is_featured", v)} />
              <ToggleSwitch label="Published" checked={d.is_published} onChange={(v) => item.setField("is_published", v)} />
            </div>
            <FormField label="Publish Date" hint="Leave blank to publish immediately once Published is on. A future date schedules the post — it stays hidden until then.">
              <input
                type="datetime-local"
                className="admin-input"
                value={toLocalInputValue(d.published_at)}
                onChange={(e) => item.setField("published_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </FormField>
          </FormSection>

          <FormSection title="Analytics" description="Display figures shown on the post. Not live-computed yet.">
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Views"><TextInput type="number" value={d.views_count} onChange={(e) => item.setField("views_count", Number(e.target.value))} /></FormField>
              <FormField label="Likes"><TextInput type="number" value={d.likes_count} onChange={(e) => item.setField("likes_count", Number(e.target.value))} /></FormField>
              <FormField label="Shares"><TextInput type="number" value={d.shares_count} onChange={(e) => item.setField("shares_count", Number(e.target.value))} /></FormField>
            </div>
          </FormSection>

          <SEOForm
            mediaFolder="blogs"
            showCanonicalUrl
            value={{
              seoTitle: d.seo_title ?? "", seoDescription: d.seo_description ?? "",
              seoKeywords: d.seo_keywords ?? "", ogImage: d.og_image_url ?? "", canonicalUrl: d.canonical_url ?? "",
            }}
            onChange={(next) => {
              item.setField("seo_title", next.seoTitle ?? "")
              item.setField("seo_description", next.seoDescription ?? "")
              item.setField("seo_keywords", next.seoKeywords ?? "")
              item.setField("og_image_url", next.ogImage ?? "")
              item.setField("canonical_url", next.canonicalUrl ?? "")
            }}
          />
        </>
      )}
    </AdminEditShell>
  )
}
