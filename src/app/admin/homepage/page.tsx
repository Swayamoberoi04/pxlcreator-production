"use client"

/**
 * src/app/admin/homepage/page.tsx
 *
 * Homepage CMS — every section as an enable/disable + reorder + edit list.
 * Composed as a drag-reorder list rather than AdminListPage — a fixed set
 * of sections isn't a search/filter/paginate resource.
 *
 * v2 additions: scheduling (publish_at/unpublish_at), the generic
 * SectionItemsEditor for repeatable content (testimonials/FAQ/stats/
 * feature cards/videos), version history + restore, and a responsive
 * live-site preview.
 *
 * HONEST SCOPE — see the "content wiring" checklist at the bottom of this
 * file's final PR description: `enabled` is respected by every section on
 * the public homepage (src/lib/homepage/repository.ts), and the FAQ /
 * Announcement Banner sections render real DB content end-to-end. Several
 * other sections (Hero, Featured, Manifesto, ...) are existing components
 * that don't accept content props yet — this CMS captures their title/
 * subtitle/CTA edits and respects enable/disable, but doesn't rewrite
 * those components' internals in this pass.
 */

import { useState } from "react"
import { useAdminResource } from "@/hooks/admin/useAdminResource"
import { Breadcrumbs } from "@/components/admin/ui/Breadcrumbs"
import { ToggleSwitch } from "@/components/admin/ui/ToggleSwitch"
import { AdminDrawer } from "@/components/admin/ui/AdminDrawer"
import { AdminModal } from "@/components/admin/ui/AdminModal"
import { FormField, FormSection, TextInput, TextArea } from "@/components/admin/ui/FormField"
import { ImageUploader } from "@/components/admin/ui/ImageUploader"
import { TableSkeleton } from "@/components/admin/ui/Skeleton"
import { SectionItemsEditor, type SectionItem } from "@/components/admin/ui/SectionItemsEditor"
import { VersionHistoryPanel } from "@/components/admin/ui/VersionHistoryPanel"
import { ResponsivePreview } from "@/components/admin/ui/ResponsivePreview"
import { StatusBadge } from "@/components/admin/ui/StatusBadge"
import type { Database } from "@/types/database"

type Section = Database["public"]["Tables"]["homepage_sections"]["Row"]

/** Sections whose content is a repeatable list — SectionItemsEditor field/label config per type. */
const ITEMS_CONFIG: Record<string, { fields: (keyof SectionItem)[]; labels: Partial<Record<keyof SectionItem, string>> }> = {
  faq:                     { fields: ["title", "subtitle"], labels: { title: "Question", subtitle: "Answer" } },
  social_proof:            { fields: ["image_url", "title", "subtitle", "link_label", "link_href"], labels: { title: "Author Name", subtitle: "Quote", link_label: "Role", link_href: "Preset Pack" } },
  manifesto:               { fields: ["title", "subtitle"], labels: { title: "Faded (wrong)", subtitle: "Bold (right)" } },
  philosophy_strip:        { fields: ["title", "subtitle"], labels: { title: "Pillar Title", subtitle: "Pillar Description" } },
  feature_cards:           { fields: ["image_url", "title", "subtitle", "link_href"], labels: { link_href: "Link" } },
  featured_youtube_videos: { fields: ["image_url", "title", "link_href"], labels: { title: "Video Title", link_href: "YouTube URL" } },
}

/** ISO string <-> the value a <input type="datetime-local"> understands (no timezone). */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function scheduleStatus(s: Section): { label: string; tone: "success" | "info" | "neutral" | "warning" } {
  if (!s.enabled) return { label: "Disabled", tone: "neutral" }
  const now = new Date()
  if (s.publish_at && new Date(s.publish_at) > now) return { label: "Scheduled", tone: "info" }
  if (s.unpublish_at && new Date(s.unpublish_at) <= now) return { label: "Expired", tone: "warning" }
  return { label: "Live", tone: "success" }
}

export default function HomepageCMSPage() {
  const resource = useAdminResource<Section>({
    basePath: "/api/admin/homepage",
    statusField: "enabled",
    getId: (s) => s.id,
  })
  const [editing, setEditing] = useState<Section | null>(null)
  const [historyFor, setHistoryFor] = useState<Section | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)

  const sections = [...resource.items].sort((a, b) => a.order_index - b.order_index)
  const itemsConfig = editing ? ITEMS_CONFIG[editing.section_key] : undefined

  async function moveTo(fromId: string, toIndex: number) {
    const from = sections.findIndex((s) => s.id === fromId)
    if (from === -1 || from === toIndex) return
    const reordered = [...sections]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(toIndex, 0, moved)
    await Promise.all(
      reordered.map((s, i) => (s.order_index !== i ? resource.patch(s.id, { order_index: i } as Partial<Section>) : null))
    )
  }

  return (
    <div className="flex flex-col gap-6 px-6 sm:px-8 py-6 sm:py-8 max-w-[900px] mx-auto w-full">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Homepage" }]} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[1.375rem] font-bold text-white/95">Homepage CMS</h1>
          <p className="text-[0.8125rem] text-white/45">
            Enable, disable, reorder, schedule, and edit every section on the homepage. Drag a row to reorder.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="shrink-0 rounded-lg border border-white/10 px-4 py-2.5 text-[0.8125rem] text-white/70 hover:text-white/95 hover:border-white/25 transition-colors"
        >
          Preview Live Site
        </button>
      </div>

      {resource.error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-[0.8125rem] text-red-300">
          {resource.error}
        </div>
      )}

      {resource.loading ? (
        <TableSkeleton rows={11} columns={3} />
      ) : (
        <div className="flex flex-col gap-2">
          {sections.map((s, i) => {
            const status = scheduleStatus(s)
            return (
              <div
                key={s.id}
                draggable
                onDragStart={() => setDragId(s.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragId) void moveTo(dragId, i); setDragId(null) }}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5 cursor-grab active:cursor-grabbing hover:border-white/[0.12] transition-colors"
              >
                <span className="text-white/25 shrink-0" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="6" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>
                </span>

                <span className="w-6 shrink-0 text-[0.75rem] text-white/30 tabular-nums">{i + 1}</span>

                <div className="flex-1 min-w-0">
                  <p className="text-[0.875rem] font-medium text-white/85 truncate">{s.label}</p>
                  <p className="text-[0.7rem] text-white/35 truncate">{s.title || s.section_key}</p>
                </div>

                <StatusBadge label={status.label} tone={status.tone} className="shrink-0" />

                <ToggleSwitch
                  checked={s.enabled}
                  loading={resource.pendingIds.has(s.id)}
                  onChange={(next) => void resource.patch(s.id, { enabled: next } as Partial<Section>)}
                />

                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-[0.75rem] text-white/60 hover:text-white/90 hover:border-white/25 transition-colors"
                >
                  Edit
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Edit drawer ── */}
      <AdminDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.label}
        width="lg"
        footer={
          <>
            {editing && (
              <button
                type="button"
                onClick={() => setHistoryFor(editing)}
                className="mr-auto text-[0.8125rem] text-white/50 hover:text-white/85 transition-colors"
              >
                History
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg bg-gold px-4 py-2 text-[0.8125rem] font-semibold text-background hover:bg-gold/90 transition-colors"
            >
              Done
            </button>
          </>
        }
      >
        {editing && (
          <div className="flex flex-col gap-5">
            <FormSection title="Content">
              <FormField label="Title">
                <TextInput
                  defaultValue={editing.title ?? ""}
                  onBlur={(e) => void resource.patch(editing.id, { title: e.target.value } as Partial<Section>)}
                  placeholder="Leave blank to keep the section's default copy"
                />
              </FormField>

              <FormField label="Subtitle">
                <TextArea
                  rows={2}
                  defaultValue={editing.subtitle ?? ""}
                  onBlur={(e) => void resource.patch(editing.id, { subtitle: e.target.value } as Partial<Section>)}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Button Text">
                  <TextInput
                    defaultValue={editing.cta_label ?? ""}
                    onBlur={(e) => void resource.patch(editing.id, { cta_label: e.target.value } as Partial<Section>)}
                  />
                </FormField>
                <FormField label="Button Link">
                  <TextInput
                    defaultValue={editing.cta_href ?? ""}
                    onBlur={(e) => void resource.patch(editing.id, { cta_href: e.target.value } as Partial<Section>)}
                    placeholder="/store"
                  />
                </FormField>
              </div>

              <FormField label="Image" hint="Used by sections with a background or feature image">
                <ImageUploader
                  value={editing.image_url ?? ""}
                  onChange={(url) => void resource.patch(editing.id, { image_url: url } as Partial<Section>)}
                  folder="general"
                  aspect="banner"
                />
              </FormField>

              <FormField label="Video URL" hint="Used by sections with a video background">
                <TextInput
                  defaultValue={editing.video_url ?? ""}
                  onBlur={(e) => void resource.patch(editing.id, { video_url: e.target.value } as Partial<Section>)}
                />
              </FormField>
            </FormSection>

            {itemsConfig && (
              <FormSection title="Items" description="Drag to reorder.">
                <SectionItemsEditor
                  value={(editing.items as unknown as SectionItem[]) ?? []}
                  onChange={(next) => void resource.patch(editing.id, { items: next as unknown as Section["items"] } as Partial<Section>)}
                  fields={itemsConfig.fields}
                  labels={itemsConfig.labels}
                  mediaFolder="general"
                />
              </FormSection>
            )}

            <FormSection title="Scheduling" description="A future publish date keeps this hidden until then. An unpublish date takes it down automatically.">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Publish At">
                  <input
                    type="datetime-local"
                    className="admin-input"
                    defaultValue={toLocalInputValue(editing.publish_at)}
                    onBlur={(e) => void resource.patch(editing.id, { publish_at: e.target.value ? new Date(e.target.value).toISOString() : null } as Partial<Section>)}
                  />
                </FormField>
                <FormField label="Unpublish At">
                  <input
                    type="datetime-local"
                    className="admin-input"
                    defaultValue={toLocalInputValue(editing.unpublish_at)}
                    onBlur={(e) => void resource.patch(editing.id, { unpublish_at: e.target.value ? new Date(e.target.value).toISOString() : null } as Partial<Section>)}
                  />
                </FormField>
              </div>
            </FormSection>
          </div>
        )}
      </AdminDrawer>

      {/* ── History drawer (nested) ── */}
      <AdminDrawer
        open={!!historyFor}
        onClose={() => setHistoryFor(null)}
        title={historyFor ? `History — ${historyFor.label}` : undefined}
        width="sm"
      >
        {historyFor && (
          <VersionHistoryPanel
            basePath="/api/admin/homepage"
            resourceId={historyFor.id}
            previewFields={["title", "subtitle"]}
            onRestored={() => { void resource.refresh(); setHistoryFor(null) }}
          />
        )}
      </AdminDrawer>

      {/* ── Live preview ── */}
      <AdminModal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Live Site Preview" size="xl">
        <ResponsivePreview url="/" />
      </AdminModal>
    </div>
  )
}
