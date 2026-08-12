"use client"

/**
 * src/app/admin/editor-presets/page.tsx
 *
 * Quick Look presets for the in-browser photo editor's left sidebar
 * (src/components/editor/LeftSidebar.tsx). Adjustments are edited as raw
 * JSON — a Partial<Adjustments> object with ~15 possible numeric fields
 * (see src/lib/editor/adjustments.ts); building 15 individual slider
 * inputs in the admin panel would just duplicate the editor's own slider
 * UI for authoring a handful of presets. Same trade-off as SEO Manager's
 * raw JSON-LD schema field.
 */

import { useState } from "react"
import { useAdminResource } from "@/hooks/admin/useAdminResource"
import { Breadcrumbs } from "@/components/admin/ui/Breadcrumbs"
import { ToggleSwitch } from "@/components/admin/ui/ToggleSwitch"
import { AdminDrawer } from "@/components/admin/ui/AdminDrawer"
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog"
import { FormField, TextInput, TextArea } from "@/components/admin/ui/FormField"
import { TableSkeleton } from "@/components/admin/ui/Skeleton"
import type { Database } from "@/types/database"

type Preset = Database["public"]["Tables"]["editor_quick_presets"]["Row"]

/** Module-scope (not nested in the component) so the impure Date.now() call isn't in a render-reachable closure. */
function generatePresetKey(): string {
  return `look-${Date.now()}`
}

export default function EditorPresetsPage() {
  const resource = useAdminResource<Preset>({
    basePath: "/api/admin/editor-presets",
    statusField: "is_active",
    getId: (p) => p.id,
  })
  const [editing, setEditing] = useState<Preset | null>(null)
  const [jsonDraft, setJsonDraft] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Preset | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const presets = [...resource.items].sort((a, b) => a.order_index - b.order_index)

  function openEditor(p: Preset) {
    setEditing(p)
    setJsonDraft(JSON.stringify(p.adjustments, null, 2))
    setJsonError(null)
  }

  function saveAdjustments() {
    if (!editing) return
    try {
      const parsed = JSON.parse(jsonDraft)
      void resource.patch(editing.id, { adjustments: parsed } as Partial<Preset>)
      setJsonError(null)
    } catch {
      setJsonError("Invalid JSON — fix the syntax before saving.")
    }
  }

  async function moveTo(fromId: string, toIndex: number) {
    const from = presets.findIndex((p) => p.id === fromId)
    if (from === -1 || from === toIndex) return
    const reordered = [...presets]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(toIndex, 0, moved)
    await Promise.all(
      reordered.map((p, i) => (p.order_index !== i ? resource.patch(p.id, { order_index: i } as Partial<Preset>) : null))
    )
  }

  async function addPreset() {
    const created = await resource.create({
      preset_key: generatePresetKey(),
      name: "New Look",
      adjustments: {},
      order_index: presets.length,
    } as Partial<Preset>)
    if (created) openEditor(created)
  }

  return (
    <div className="flex flex-col gap-6 px-6 sm:px-8 py-6 sm:py-8 max-w-[800px] mx-auto w-full">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Editor Presets" }]} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[1.375rem] font-bold text-white/95">Editor Quick Looks</h1>
          <p className="text-[0.8125rem] text-white/45">
            One-click presets shown in the photo editor&apos;s sidebar. Drag to reorder.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void addPreset()}
          className="shrink-0 rounded-lg bg-gold px-4 py-2.5 text-[0.8125rem] font-semibold text-background hover:bg-gold/90 transition-colors"
        >
          + New
        </button>
      </div>

      {resource.error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-[0.8125rem] text-red-300">
          {resource.error}
        </div>
      )}

      {resource.loading ? (
        <TableSkeleton rows={6} columns={3} />
      ) : (
        <div className="flex flex-col gap-2">
          {presets.map((p, i) => (
            <div
              key={p.id}
              draggable
              onDragStart={() => setDragId(p.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragId) void moveTo(dragId, i); setDragId(null) }}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5 cursor-grab active:cursor-grabbing hover:border-white/[0.12] transition-colors"
            >
              <span className="text-white/25 shrink-0" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="6" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[0.875rem] font-medium text-white/85 truncate">{p.name}</p>
                <p className="text-[0.7rem] text-white/35 truncate">{p.preset_key}</p>
              </div>
              <ToggleSwitch
                checked={p.is_active}
                loading={resource.pendingIds.has(p.id)}
                onChange={(next) => void resource.patch(p.id, { is_active: next } as Partial<Preset>)}
              />
              <button
                type="button"
                onClick={() => openEditor(p)}
                className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-[0.75rem] text-white/60 hover:text-white/90 hover:border-white/25 transition-colors"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(p)}
                className="shrink-0 text-[0.75rem] text-white/35 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <AdminDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.name}
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
            <FormField label="Name">
              <TextInput
                defaultValue={editing.name}
                onBlur={(e) => void resource.patch(editing.id, { name: e.target.value } as Partial<Preset>)}
              />
            </FormField>
            <FormField label="Preset Key" hint="Stable identifier, lowercase-with-hyphens">
              <TextInput
                defaultValue={editing.preset_key}
                onBlur={(e) => void resource.patch(editing.id, { preset_key: e.target.value } as Partial<Preset>)}
              />
            </FormField>
            <FormField
              label="Adjustments (JSON)"
              error={jsonError ?? undefined}
              hint="Partial<Adjustments> — e.g. temperature, contrast, clarity, vibrance, blacks, highlights, shadows, saturation, dehaze, sharpening"
            >
              <TextArea
                rows={8}
                value={jsonDraft}
                onChange={(e) => setJsonDraft(e.target.value)}
                onBlur={saveAdjustments}
                className="font-mono text-[0.8125rem]"
              />
            </FormField>
          </div>
        )}
      </AdminDrawer>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => { if (pendingDelete) await resource.remove(pendingDelete.id) }}
        title="Delete this look?"
        description="This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  )
}
