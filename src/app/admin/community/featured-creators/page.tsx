"use client"

/**
 * src/app/admin/community/featured-creators/page.tsx
 *
 * Admin CRUD for external "Featured Creator / Inspiration" entities — real
 * photographers/creators who are NOT PXL members. This is the no-code path
 * to add one: fill the form, Discover picks it up immediately via
 * GET /api/community/featured-creators.
 *
 * Deliberately NOT a community_profiles row — no login, no follow graph, no
 * PXL membership implied. `source_url` is required so every entry points at
 * verifiable public work.
 */

import { useState } from "react"
import { AdminListPage } from "@/components/admin/AdminListPage"
import { StatusBadge } from "@/components/admin/ui/StatusBadge"
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog"
import { AdminDrawer } from "@/components/admin/ui/AdminDrawer"
import { FormField, TextInput, TextArea } from "@/components/admin/ui/FormField"
import type { DataTableColumn } from "@/components/admin/ui/AdminDataTable"
import type { Database } from "@/types/database"

type FeaturedCreator = Database["public"]["Tables"]["featured_creators"]["Row"]

type DraftState = {
  name: string
  handle: string
  bio: string
  avatar_url: string
  source_url: string
  platform: string
  role_tags: string
  style_tags: string
  source_note: string
  is_active: boolean
}

const EMPTY_DRAFT: DraftState = {
  name: "", handle: "", bio: "", avatar_url: "", source_url: "", platform: "",
  role_tags: "", style_tags: "", source_note: "", is_active: true,
}

function toDraft(c: FeaturedCreator): DraftState {
  return {
    name: c.name, handle: c.handle ?? "", bio: c.bio, avatar_url: c.avatar_url ?? "",
    source_url: c.source_url, platform: c.platform,
    role_tags: c.role_tags.join(", "), style_tags: c.style_tags.join(", "),
    source_note: c.source_note, is_active: c.is_active,
  }
}

function toPayload(d: DraftState) {
  return {
    name: d.name.trim(),
    handle: d.handle.trim() || null,
    bio: d.bio.trim(),
    avatar_url: d.avatar_url.trim() || null,
    source_url: d.source_url.trim(),
    platform: d.platform.trim(),
    role_tags: d.role_tags.split(",").map((s) => s.trim()).filter(Boolean),
    style_tags: d.style_tags.split(",").map((s) => s.trim()).filter(Boolean),
    source_note: d.source_note.trim(),
    is_active: d.is_active,
  }
}

export default function FeaturedCreatorsPage() {
  const [editing, setEditing] = useState<FeaturedCreator | "new" | null>(null)
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<FeaturedCreator | null>(null)

  function openNew() { setDraft(EMPTY_DRAFT); setEditing("new"); setError(null) }
  function openEdit(c: FeaturedCreator) { setDraft(toDraft(c)); setEditing(c); setError(null) }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const payload = toPayload(draft)
      if (!payload.name || !payload.source_url) {
        setError("Name and source URL are required.")
        setSaving(false)
        return
      }
      const isNew = editing === "new"
      const url = isNew
        ? "/api/admin/community/featured-creators"
        : `/api/admin/community/featured-creators/${(editing as FeaturedCreator).id}`
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
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

  const columns: DataTableColumn<FeaturedCreator>[] = [
    {
      key: "name", header: "Creator",
      render: (c) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/30">
            {c.avatar_url && <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-white/85">{c.name}</p>
            <p className="truncate text-[0.7rem] text-white/35">{c.handle ? `@${c.handle}` : c.platform || "—"}</p>
          </div>
        </div>
      ),
    },
    { key: "source_url", header: "Source", render: (c) => (
      <a href={c.source_url} target="_blank" rel="noreferrer" className="text-[0.75rem] text-gold/80 hover:text-gold underline underline-offset-2 truncate block max-w-[220px]">
        {c.source_url}
      </a>
    ) },
    {
      key: "status", header: "Status",
      render: (c) => c.is_active
        ? <StatusBadge label="Active" tone="gold" />
        : <StatusBadge label="Hidden" tone="neutral" />,
    },
  ]

  return (
    <>
      <div className="flex justify-end px-6 sm:px-8 pt-6 sm:pt-8 max-w-[1400px] mx-auto w-full">
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-gold px-4 py-2 text-[0.8125rem] font-semibold text-black hover:bg-gold/90 transition-colors"
        >
          + Add Featured Creator
        </button>
      </div>

      <AdminListPage<FeaturedCreator>
        title="Featured Creators (Inspiration)"
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Community", href: "/admin/community" }, { label: "Featured Creators" }]}
        basePath="/api/admin/community/featured-creators"
        columns={columns}
        getId={(c) => c.id}
        searchPlaceholder="Search featured creators…"
        filters={[
          { key: "is_active", label: "Status", options: [
            { value: "all", label: "All" }, { value: "true", label: "Active" }, { value: "false", label: "Hidden" },
          ] },
        ]}
        rowActions={(c) => (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => openEdit(c)} className="text-[0.75rem] text-white/50 hover:text-gold transition-colors">
              Edit
            </button>
            <button type="button" onClick={() => setPendingDelete(c)} className="text-[0.75rem] text-white/35 hover:text-red-400 transition-colors">
              Delete
            </button>
          </div>
        )}
      />

      <AdminDrawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add Featured Creator" : `Edit ${editing?.name ?? ""}`}
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} className="text-[0.8125rem] text-white/50 hover:text-white/85 transition-colors">
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-gold px-4 py-2 text-[0.8125rem] font-semibold text-black hover:bg-gold/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-[0.75rem] text-white/40 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            This is NOT a PXL account — it never gets a login, cannot be followed, and Discover always labels it
            &quot;Inspiration&quot;, distinct from real members.
          </p>

          {error && <p className="text-[0.8125rem] text-red-400">{error}</p>}

          <FormField label="Name" required>
            <TextInput value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="e.g. Annie Leibovitz" />
          </FormField>
          <FormField label="Public handle" hint="Shown as @handle — not a login">
            <TextInput value={draft.handle} onChange={(e) => setDraft((d) => ({ ...d, handle: e.target.value }))} placeholder="e.g. annieleibovitz" />
          </FormField>
          <FormField label="Source URL" required hint="Where their real public profile/work lives — required so every entry is verifiable">
            <TextInput value={draft.source_url} onChange={(e) => setDraft((d) => ({ ...d, source_url: e.target.value }))} placeholder="https://instagram.com/…" />
          </FormField>
          <FormField label="Platform">
            <TextInput value={draft.platform} onChange={(e) => setDraft((d) => ({ ...d, platform: e.target.value }))} placeholder="Instagram, YouTube, personal site…" />
          </FormField>
          <FormField label="Avatar URL">
            <TextInput value={draft.avatar_url} onChange={(e) => setDraft((d) => ({ ...d, avatar_url: e.target.value }))} placeholder="https://…" />
          </FormField>
          <FormField label="Bio">
            <TextArea rows={3} value={draft.bio} onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))} placeholder="Only verified public information" />
          </FormField>
          <FormField label="Role tags" hint="Comma-separated, from the same vocabulary as member roles (e.g. photographer, filmmaker)">
            <TextInput value={draft.role_tags} onChange={(e) => setDraft((d) => ({ ...d, role_tags: e.target.value }))} />
          </FormField>
          <FormField label="Style tags" hint="Comma-separated (e.g. portrait, cinematic)">
            <TextInput value={draft.style_tags} onChange={(e) => setDraft((d) => ({ ...d, style_tags: e.target.value }))} />
          </FormField>
          <FormField label="Source note" hint="Internal only — where/when this info was verified. Never shown publicly.">
            <TextArea rows={2} value={draft.source_note} onChange={(e) => setDraft((d) => ({ ...d, source_note: e.target.value }))} placeholder="e.g. Bio drawn from public Instagram profile, 2026-09" />
          </FormField>
          <FormField label="Visible on Discover">
            <label className="flex items-center gap-2 text-[0.8125rem] text-white/70">
              <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))} />
              Active
            </label>
          </FormField>
        </div>
      </AdminDrawer>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return
          await fetch(`/api/admin/community/featured-creators/${pendingDelete.id}`, { method: "DELETE" })
          window.location.reload()
        }}
        title="Delete this featured creator?"
        description="This permanently removes the entry. Consider hiding it (Active toggle) instead if you might restore it later."
        confirmLabel="Delete"
      />
    </>
  )
}
