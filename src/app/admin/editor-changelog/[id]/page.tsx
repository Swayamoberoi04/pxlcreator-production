"use client"

/**
 * src/app/admin/editor-changelog/[id]/page.tsx
 */

import { useParams, useRouter } from "next/navigation"
import { AdminEditShell } from "@/components/admin/AdminEditShell"
import { FormField, FormSection, TextInput, TextArea } from "@/components/admin/ui/FormField"
import { ToggleSwitch } from "@/components/admin/ui/ToggleSwitch"
import { useAdminResourceItem } from "@/hooks/admin/useAdminResourceItem"
import type { Database } from "@/types/database"

type ChangelogEntry = Database["public"]["Tables"]["editor_changelog"]["Row"]

const EMPTY_ENTRY = {
  version_label: "", title: "", description: "",
  released_at: new Date().toISOString(), is_published: true,
} as unknown as ChangelogEntry

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10)
}

export default function ChangelogEditPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const isNew = id === "new"

  const item = useAdminResourceItem<ChangelogEntry>({
    basePath: "/api/admin/editor-changelog",
    id,
    emptyDraft: EMPTY_ENTRY,
    statusField: "is_published",
  })
  const d = item.draft

  async function handleSave() {
    const saved = await item.save()
    if (saved && isNew) router.replace(`/admin/editor-changelog/${saved.id}`)
  }

  async function handleDelete() {
    const ok = await item.remove()
    if (ok) router.push("/admin/editor-changelog")
  }

  return (
    <AdminEditShell
      title={d?.title || (isNew ? "New Entry" : "Entry")}
      breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Editor Changelog", href: "/admin/editor-changelog" }, { label: d?.title || "New" }]}
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
      onDelete={!isNew ? handleDelete : undefined}
    >
      {d && (
        <FormSection title="Entry">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Version Label" required hint="e.g. Phase 5, v2.1">
              <TextInput value={d.version_label} onChange={(e) => item.setField("version_label", e.target.value)} />
            </FormField>
            <FormField label="Released">
              <TextInput
                type="date"
                value={toDateInputValue(d.released_at)}
                onChange={(e) => item.setField("released_at", new Date(e.target.value).toISOString())}
              />
            </FormField>
          </div>
          <FormField label="Title" required>
            <TextInput value={d.title} onChange={(e) => item.setField("title", e.target.value)} />
          </FormField>
          <FormField label="Description">
            <TextArea rows={4} value={d.description ?? ""} onChange={(e) => item.setField("description", e.target.value)} />
          </FormField>
          <ToggleSwitch label="Published" checked={d.is_published} onChange={(v) => item.setField("is_published", v)} />
        </FormSection>
      )}
    </AdminEditShell>
  )
}
