"use client"

/**
 * src/app/admin/community/resources/page.tsx
 *
 * Admin curation for the creator resource directory. `source` is the
 * load-bearing field: 'external' marks a third-party tool listed for
 * discovery, which the public directory labels as such — PXL never implies
 * it built someone else's tool.
 */

import { useState } from "react"
import { AdminListPage } from "@/components/admin/AdminListPage"
import { StatusBadge } from "@/components/admin/ui/StatusBadge"
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog"
import { AdminDrawer } from "@/components/admin/ui/AdminDrawer"
import { FormField, TextInput, TextArea, Select } from "@/components/admin/ui/FormField"
import { RESOURCE_TYPES } from "@/types/community"
import type { DataTableColumn } from "@/components/admin/ui/AdminDataTable"
import type { Database } from "@/types/database"

type Resource = Database["public"]["Tables"]["creator_resources"]["Row"]

const CATEGORIES = ["photography", "editing", "filmmaking", "color_grading", "business", "gear", "community", "learning", "other"]

type Draft = {
  title: string; description: string; url: string; category: string
  resource_type: string; source: string; tags: string; icon: string
  is_featured: boolean; display_order: string; status: string
}

const EMPTY: Draft = {
  title: "", description: "", url: "", category: "photography",
  resource_type: "tools", source: "external", tags: "", icon: "🔗",
  is_featured: false, display_order: "0", status: "published",
}

export default function AdminResourcesPage() {
  const [editing, setEditing] = useState<Resource | "new" | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null)

  function openNew() { setDraft(EMPTY); setEditing("new"); setError(null) }
  function openEdit(r: Resource) {
    setDraft({
      title: r.title, description: r.description, url: r.url, category: r.category,
      resource_type: r.resource_type, source: r.source, tags: r.tags.join(", "),
      icon: r.icon, is_featured: r.is_featured, display_order: String(r.display_order),
      status: r.status,
    })
    setEditing(r); setError(null)
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        url: draft.url.trim(),
        category: draft.category,
        resource_type: draft.resource_type,
        source: draft.source,
        tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
        icon: draft.icon.trim() || "🔗",
        is_featured: draft.is_featured,
        display_order: parseInt(draft.display_order, 10) || 0,
        status: draft.status,
      }
      if (!payload.title || !payload.url) {
        setError("Title and destination URL are required.")
        setSaving(false)
        return
      }
      const isNew = editing === "new"
      const res = await fetch(
        isNew ? "/api/admin/community/resources" : `/api/admin/community/resources/${(editing as Resource).id}`,
        { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      )
      const body = await res.json()
      if (!res.ok || !body.success) {
        setError(body.error ?? "Save failed.")
        setSaving(false)
        return
      }
      setEditing(null)
      window.location.reload()
    } catch {
      setError("Save failed.")
      setSaving(false)
    }
  }

  const columns: DataTableColumn<Resource>[] = [
    {
      key: "title", header: "Resource",
      render: (r) => (
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg shrink-0">{r.icon}</span>
          <div className="min-w-0">
            <p className="truncate font-medium text-white/85">{r.title}</p>
            <a href={r.url} target="_blank" rel="noreferrer" className="truncate block max-w-[260px] text-[0.7rem] text-gold/70 hover:text-gold">
              {r.url}
            </a>
          </div>
        </div>
      ),
    },
    { key: "resource_type", header: "Type", render: (r) => RESOURCE_TYPES.find((t) => t.id === r.resource_type)?.label ?? r.resource_type },
    {
      key: "source", header: "Source",
      render: (r) => r.source === "pxl"
        ? <StatusBadge label="PXL" tone="gold" />
        : <StatusBadge label="External" tone="neutral" />,
    },
    { key: "click_count", header: "Clicks", align: "right", render: (r) => r.click_count.toLocaleString() },
    {
      key: "status", header: "Status",
      render: (r) => (
        <div className="flex gap-1.5 flex-wrap">
          {r.status === "published" ? <StatusBadge label="Published" tone="success" /> : <StatusBadge label={r.status} tone="neutral" />}
          {r.is_featured && <StatusBadge label="Featured" tone="gold" />}
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="flex justify-end px-6 sm:px-8 pt-6 sm:pt-8 max-w-[1400px] mx-auto w-full">
        <button type="button" onClick={openNew}
          className="rounded-lg bg-gold px-4 py-2 text-[0.8125rem] font-semibold text-black hover:bg-gold/90 transition-colors">
          + Add Resource
        </button>
      </div>

      <AdminListPage<Resource>
        title="Creator Resources"
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Community", href: "/admin/community" }, { label: "Resources" }]}
        basePath="/api/admin/community/resources"
        columns={columns}
        getId={(r) => r.id}
        searchPlaceholder="Search resources…"
        filters={[
          { key: "source", label: "Source", options: [
            { value: "all", label: "All" }, { value: "pxl", label: "PXL" }, { value: "external", label: "External" },
          ] },
          { key: "status", label: "Status", options: [
            { value: "all", label: "All" }, { value: "published", label: "Published" },
            { value: "draft", label: "Draft" }, { value: "archived", label: "Archived" },
          ] },
        ]}
        rowActions={(r) => (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => openEdit(r)} className="text-[0.75rem] text-white/50 hover:text-gold transition-colors">Edit</button>
            <button type="button" onClick={() => setPendingDelete(r)} className="text-[0.75rem] text-white/35 hover:text-red-400 transition-colors">Delete</button>
          </div>
        )}
      />

      <AdminDrawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add Resource" : `Edit ${editing?.title ?? ""}`}
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} className="text-[0.8125rem] text-white/50 hover:text-white/85 transition-colors">Cancel</button>
            <button type="button" disabled={saving} onClick={() => void save()}
              className="rounded-lg bg-gold px-4 py-2 text-[0.8125rem] font-semibold text-black hover:bg-gold/90 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <p className="text-[0.8125rem] text-red-400">{error}</p>}

          <FormField label="Title" required>
            <TextInput value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
          </FormField>
          <FormField label="Destination URL" required hint="Where the resource actually lives — required, and unique across the directory">
            <TextInput value={draft.url} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} placeholder="https://…" />
          </FormField>
          <FormField label="Description" required>
            <TextArea rows={3} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
          </FormField>
          <FormField label="Source" hint="External = a third-party tool listed for discovery. The public directory labels it as such.">
            <Select value={draft.source} onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}>
              <option value="external">External (third party)</option>
              <option value="pxl">Built by PXL</option>
            </Select>
          </FormField>
          <FormField label="Type">
            <Select value={draft.resource_type} onChange={(e) => setDraft((d) => ({ ...d, resource_type: e.target.value }))}>
              {RESOURCE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Category">
            <Select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </Select>
          </FormField>
          <FormField label="Tags" hint="Comma-separated">
            <TextInput value={draft.tags} onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))} />
          </FormField>
          <FormField label="Icon" hint="A single emoji">
            <TextInput value={draft.icon} onChange={(e) => setDraft((d) => ({ ...d, icon: e.target.value }))} />
          </FormField>
          <FormField label="Display order">
            <TextInput type="number" value={draft.display_order} onChange={(e) => setDraft((d) => ({ ...d, display_order: e.target.value }))} />
          </FormField>
          <FormField label="Status">
            <Select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </Select>
          </FormField>
          <FormField label="Featured">
            <label className="flex items-center gap-2 text-[0.8125rem] text-white/70">
              <input type="checkbox" checked={draft.is_featured} onChange={(e) => setDraft((d) => ({ ...d, is_featured: e.target.checked }))} />
              Show in Featured Picks
            </label>
          </FormField>
        </div>
      </AdminDrawer>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return
          await fetch(`/api/admin/community/resources/${pendingDelete.id}`, { method: "DELETE" })
          window.location.reload()
        }}
        title="Delete this resource?"
        description="This permanently removes the entry. Consider setting it to Archived instead if you might restore it."
        confirmLabel="Delete"
      />
    </>
  )
}
