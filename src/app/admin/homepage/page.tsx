"use client"

/**
 * src/app/admin/homepage/page.tsx
 *
 * Homepage CMS — every section rendered on the public homepage (src/app/
 * page.tsx) as an enable/disable + reorder + edit list. Built on the same
 * useAdminResource + Phase 1 UI kit as every other module, but composed
 * as a drag-reorder list rather than AdminListPage — a fixed set of ~11
 * sections isn't a search/filter/paginate resource, so forcing a table
 * onto it would be the wrong abstraction, not a shortcut.
 *
 * NOTE: this ships the admin CRUD only. Making src/app/page.tsx actually
 * read `enabled`/order from this table (instead of the hardcoded JSX
 * order) is a separate follow-up — flagged to the user, not silently
 * half-done.
 */

import { useState } from "react"
import { useAdminResource } from "@/hooks/admin/useAdminResource"
import { Breadcrumbs } from "@/components/admin/ui/Breadcrumbs"
import { ToggleSwitch } from "@/components/admin/ui/ToggleSwitch"
import { AdminDrawer } from "@/components/admin/ui/AdminDrawer"
import { FormField, TextInput, TextArea } from "@/components/admin/ui/FormField"
import { ImageUploader } from "@/components/admin/ui/ImageUploader"
import { TableSkeleton } from "@/components/admin/ui/Skeleton"
import type { Database } from "@/types/database"

type Section = Database["public"]["Tables"]["homepage_sections"]["Row"]

export default function HomepageCMSPage() {
  const resource = useAdminResource<Section>({
    basePath: "/api/admin/homepage",
    statusField: "enabled",
    getId: (s) => s.id,
  })
  const [editing, setEditing] = useState<Section | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const sections = [...resource.items].sort((a, b) => a.order_index - b.order_index)

  async function moveTo(fromId: string, toIndex: number) {
    const from = sections.findIndex((s) => s.id === fromId)
    if (from === -1 || from === toIndex) return
    const reordered = [...sections]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(toIndex, 0, moved)
    // Persist new order_index for every row that changed position.
    await Promise.all(
      reordered.map((s, i) => (s.order_index !== i ? resource.patch(s.id, { order_index: i } as Partial<Section>) : null))
    )
  }

  return (
    <div className="flex flex-col gap-6 px-6 sm:px-8 py-6 sm:py-8 max-w-[900px] mx-auto w-full">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Homepage" }]} />

      <div className="flex flex-col gap-1">
        <h1 className="text-[1.375rem] font-bold text-white/95">Homepage CMS</h1>
        <p className="text-[0.8125rem] text-white/45">
          Enable, disable, reorder, and edit every section on the homepage. Drag a row to reorder.
        </p>
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
          {sections.map((s, i) => (
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
          ))}
        </div>
      )}

      <AdminDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.label}
        footer={
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="rounded-lg bg-gold px-4 py-2 text-[0.8125rem] font-semibold text-background hover:bg-gold/90 transition-colors"
          >
            Done
          </button>
        }
      >
        {editing && (
          <div className="flex flex-col gap-4">
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
          </div>
        )}
      </AdminDrawer>
    </div>
  )
}
