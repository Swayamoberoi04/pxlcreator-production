"use client"

/**
 * src/app/admin/courses/[id]/page.tsx
 *
 * Course create/edit — built on AdminEditShell + useAdminResourceItem
 * (autosave once the record exists) and the full Phase 1 UI kit:
 * FormSection/FormField, ImageUploader, GalleryUploader, SEOForm,
 * ToggleSwitch. Curriculum (sections → lessons) is a small bespoke editor
 * over the `curriculum` JSONB field — see migration 030 for why.
 */

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { AdminEditShell } from "@/components/admin/AdminEditShell"
import { FormField, FormSection, TextInput, Select } from "@/components/admin/ui/FormField"
import { ImageUploader } from "@/components/admin/ui/ImageUploader"
import { GalleryUploader } from "@/components/admin/ui/GalleryUploader"
import { ToggleSwitch } from "@/components/admin/ui/ToggleSwitch"
import { RichTextEditor } from "@/components/admin/ui/RichTextEditor"
import { SEOForm } from "@/components/admin/ui/SEOForm"
import { useAdminResourceItem } from "@/hooks/admin/useAdminResourceItem"
import { slugify } from "@/lib/admin/validation"
import type { Database } from "@/types/database"

type Course = Database["public"]["Tables"]["courses"]["Row"]

interface Lesson { title: string; type: "video" | "pdf" | "external" | "attachment"; url: string }
interface CurriculumSection { title: string; lessons: Lesson[] }

const EMPTY_COURSE = {
  title: "", slug: "", subtitle: "", description: "", category: "", difficulty: "Beginner",
  instructor: "", duration_minutes: 0, lesson_count: 0, thumbnail_url: "", banner_url: "",
  gallery: [], trailer_video_url: "", price: 0, discount_price: null, currency: "USD",
  badge: "", is_bestseller: false, is_featured: false, is_coming_soon: false,
  is_published: false, is_archived: false, access_level: "premium", tags: [], curriculum: [],
  seo_title: "", seo_description: "", seo_keywords: "",
  students_count: 0, sales_count: 0, revenue_cached: 0, rating: 0, review_count: 0, completion_avg_pct: 0,
  order_index: 0,
} as unknown as Course

export default function CourseEditPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const isNew = id === "new"

  const item = useAdminResourceItem<Course>({
    basePath: "/api/admin/courses",
    id,
    emptyDraft: EMPTY_COURSE,
  })

  const [slugTouched, setSlugTouched] = useState(!isNew)
  const d = item.draft

  const curriculum = ((d?.curriculum as unknown as CurriculumSection[]) ?? [])

  function setCurriculum(next: CurriculumSection[]) {
    if (!d) return
    item.setField("curriculum", next as unknown as Course["curriculum"])
    item.setField("lesson_count", next.reduce((sum, s) => sum + s.lessons.length, 0) as Course["lesson_count"])
  }

  async function handleSave() {
    const saved = await item.save()
    if (saved && isNew) router.replace(`/admin/courses/${saved.id}`)
  }

  async function handleDelete() {
    const ok = await item.remove()
    if (ok) router.push("/admin/courses")
  }

  async function handleDuplicate() {
    const copy = await item.duplicate()
    if (copy) router.push(`/admin/courses/${copy.id}`)
  }

  return (
    <AdminEditShell
      title={d?.title || (isNew ? "New Course" : "Course")}
      breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Courses", href: "/admin/courses" }, { label: d?.title || "New" }]}
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
            <FormField label="Slug" required hint="Used in the course URL">
              <TextInput value={d.slug} onChange={(e) => { setSlugTouched(true); item.setField("slug", e.target.value) }} />
            </FormField>
            <FormField label="Subtitle">
              <TextInput value={d.subtitle ?? ""} onChange={(e) => item.setField("subtitle", e.target.value)} />
            </FormField>
            <FormField label="Description">
              <RichTextEditor value={d.description ?? ""} onChange={(v) => item.setField("description", v)} minHeight={180} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Category">
                <TextInput value={d.category ?? ""} onChange={(e) => item.setField("category", e.target.value)} />
              </FormField>
              <FormField label="Difficulty">
                <Select value={d.difficulty ?? "Beginner"} onChange={(e) => item.setField("difficulty", e.target.value as Course["difficulty"])}>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Instructor">
                <TextInput value={d.instructor ?? ""} onChange={(e) => item.setField("instructor", e.target.value)} />
              </FormField>
              <FormField label="Duration (minutes)">
                <TextInput type="number" value={d.duration_minutes ?? 0} onChange={(e) => item.setField("duration_minutes", Number(e.target.value))} />
              </FormField>
            </div>
            <FormField label="Tags" hint="Comma-separated">
              <TextInput
                value={(d.tags ?? []).join(", ")}
                onChange={(e) => item.setField("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
              />
            </FormField>
          </FormSection>

          <FormSection title="Media">
            <FormField label="Thumbnail">
              <ImageUploader value={d.thumbnail_url ?? ""} onChange={(url) => item.setField("thumbnail_url", url)} folder="courses" aspect="video" />
            </FormField>
            <FormField label="Banner">
              <ImageUploader value={d.banner_url ?? ""} onChange={(url) => item.setField("banner_url", url)} folder="courses" aspect="banner" />
            </FormField>
            <FormField label="Gallery">
              <GalleryUploader value={d.gallery ?? []} onChange={(urls) => item.setField("gallery", urls)} folder="courses" />
            </FormField>
            <FormField label="Trailer Video URL">
              <TextInput value={d.trailer_video_url ?? ""} onChange={(e) => item.setField("trailer_video_url", e.target.value)} placeholder="https://..." />
            </FormField>
          </FormSection>

          <FormSection title="Pricing & Access">
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Price">
                <TextInput type="number" step="0.01" value={d.price} onChange={(e) => item.setField("price", Number(e.target.value))} />
              </FormField>
              <FormField label="Discount Price">
                <TextInput type="number" step="0.01" value={d.discount_price ?? ""} onChange={(e) => item.setField("discount_price", e.target.value ? Number(e.target.value) : null)} />
              </FormField>
              <FormField label="Currency">
                <Select value={d.currency} onChange={(e) => item.setField("currency", e.target.value as Course["currency"])}>
                  <option>USD</option><option>INR</option><option>EUR</option><option>GBP</option>
                </Select>
              </FormField>
            </div>
            <FormField label="Access Level">
              <Select value={d.access_level} onChange={(e) => item.setField("access_level", e.target.value as Course["access_level"])}>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="purchased_only">Purchased Only</option>
              </Select>
            </FormField>
            <FormField label="Badge" hint="e.g. Bestseller, New">
              <TextInput value={d.badge ?? ""} onChange={(e) => item.setField("badge", e.target.value)} />
            </FormField>
            <div className="flex flex-col gap-3 pt-1">
              <ToggleSwitch label="Bestseller" checked={d.is_bestseller} onChange={(v) => item.setField("is_bestseller", v)} />
              <ToggleSwitch label="Featured" checked={d.is_featured} onChange={(v) => item.setField("is_featured", v)} />
              <ToggleSwitch label="Coming Soon" checked={d.is_coming_soon} onChange={(v) => item.setField("is_coming_soon", v)} />
            </div>
          </FormSection>

          <FormSection title="Curriculum" description="Sections and lessons — video, PDF, external link, or attachment.">
            <CurriculumEditor value={curriculum} onChange={setCurriculum} />
          </FormSection>

          <FormSection title="Stats" description="Display figures shown on the course page. Not live-computed yet.">
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Students"><TextInput type="number" value={d.students_count} onChange={(e) => item.setField("students_count", Number(e.target.value))} /></FormField>
              <FormField label="Sales"><TextInput type="number" value={d.sales_count} onChange={(e) => item.setField("sales_count", Number(e.target.value))} /></FormField>
              <FormField label="Revenue"><TextInput type="number" value={d.revenue_cached} onChange={(e) => item.setField("revenue_cached", Number(e.target.value))} /></FormField>
              <FormField label="Rating"><TextInput type="number" step="0.1" max={5} value={d.rating} onChange={(e) => item.setField("rating", Number(e.target.value))} /></FormField>
              <FormField label="Reviews"><TextInput type="number" value={d.review_count} onChange={(e) => item.setField("review_count", Number(e.target.value))} /></FormField>
              <FormField label="Completion %"><TextInput type="number" max={100} value={d.completion_avg_pct} onChange={(e) => item.setField("completion_avg_pct", Number(e.target.value))} /></FormField>
            </div>
          </FormSection>

          <SEOForm
            mediaFolder="courses"
            value={{ seoTitle: d.seo_title ?? "", seoDescription: d.seo_description ?? "", seoKeywords: d.seo_keywords ?? "" }}
            onChange={(next) => {
              item.setField("seo_title", next.seoTitle ?? "")
              item.setField("seo_description", next.seoDescription ?? "")
              item.setField("seo_keywords", next.seoKeywords ?? "")
            }}
          />
        </>
      )}
    </AdminEditShell>
  )
}

/* ── Curriculum editor ────────────────────────────────────────────────── */

function CurriculumEditor({ value, onChange }: { value: CurriculumSection[]; onChange: (next: CurriculumSection[]) => void }) {
  function addSection() {
    onChange([...value, { title: `Section ${value.length + 1}`, lessons: [] }])
  }
  function updateSection(i: number, patch: Partial<CurriculumSection>) {
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }
  function removeSection(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }
  function addLesson(sIdx: number) {
    const section = value[sIdx]
    updateSection(sIdx, { lessons: [...section.lessons, { title: "", type: "video", url: "" }] })
  }
  function updateLesson(sIdx: number, lIdx: number, patch: Partial<Lesson>) {
    const section = value[sIdx]
    updateSection(sIdx, { lessons: section.lessons.map((l, idx) => (idx === lIdx ? { ...l, ...patch } : l)) })
  }
  function removeLesson(sIdx: number, lIdx: number) {
    const section = value[sIdx]
    updateSection(sIdx, { lessons: section.lessons.filter((_, idx) => idx !== lIdx) })
  }

  return (
    <div className="flex flex-col gap-4">
      {value.map((section, sIdx) => (
        <div key={sIdx} className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TextInput
              value={section.title}
              onChange={(e) => updateSection(sIdx, { title: e.target.value })}
              className="font-medium"
            />
            <button type="button" onClick={() => removeSection(sIdx)} className="shrink-0 text-[0.75rem] text-white/35 hover:text-red-400 transition-colors">
              Remove
            </button>
          </div>

          <div className="flex flex-col gap-2 pl-3 border-l border-white/[0.06]">
            {section.lessons.map((lesson, lIdx) => (
              <div key={lIdx} className="flex items-center gap-2">
                <TextInput
                  value={lesson.title}
                  onChange={(e) => updateLesson(sIdx, lIdx, { title: e.target.value })}
                  placeholder="Lesson title"
                  className="flex-1"
                />
                <Select
                  value={lesson.type}
                  onChange={(e) => updateLesson(sIdx, lIdx, { type: e.target.value as Lesson["type"] })}
                  className="w-32 shrink-0"
                >
                  <option value="video">Video</option>
                  <option value="pdf">PDF</option>
                  <option value="external">External</option>
                  <option value="attachment">Attachment</option>
                </Select>
                <TextInput
                  value={lesson.url}
                  onChange={(e) => updateLesson(sIdx, lIdx, { url: e.target.value })}
                  placeholder="URL"
                  className="flex-1"
                />
                <button type="button" onClick={() => removeLesson(sIdx, lIdx)} aria-label="Remove lesson" className="shrink-0 text-white/30 hover:text-red-400 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addLesson(sIdx)} className="self-start text-[0.75rem] text-gold/80 hover:text-gold transition-colors">
              + Add lesson
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addSection}
        className="self-start rounded-lg border border-white/10 px-3.5 py-2 text-[0.8125rem] text-white/60 hover:text-white/90 hover:border-white/25 transition-colors"
      >
        + Add section
      </button>
    </div>
  )
}
