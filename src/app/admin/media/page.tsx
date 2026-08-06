"use client"

/**
 * src/app/admin/media/page.tsx
 *
 * Media Library — the first real CMS module, built entirely on the Phase 1
 * foundation (AdminDataTable-adjacent grid, SearchBar, DragDropUploader,
 * ConfirmDialog, useAdminListState, permission-gated API). Every future
 * module's ImageUploader/GalleryUploader/FilePicker reads from this same
 * `/api/admin/media` backend.
 */

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { Breadcrumbs }        from "@/components/admin/ui/Breadcrumbs"
import { SearchBar }          from "@/components/admin/ui/SearchBar"
import { DragDropUploader }   from "@/components/admin/ui/DragDropUploader"
import { ConfirmDialog }      from "@/components/admin/ui/ConfirmDialog"
import { AdminDrawer }        from "@/components/admin/ui/AdminDrawer"
import { Pagination }         from "@/components/admin/ui/Pagination"
import { GridSkeleton }       from "@/components/admin/ui/Skeleton"
import { FormField, TextInput, Select } from "@/components/admin/ui/FormField"
import { useAdminListState }  from "@/hooks/admin/useAdminListState"
import { MEDIA_FOLDERS }      from "@/lib/admin/media-constants"
import { cn } from "@/lib/utils"

interface MediaAsset {
  id: string
  file_name: string
  public_url: string | null
  folder: string
  mime_type: string | null
  file_size: number | null
  width: number | null
  height: number | null
  alt_text: string | null
  created_at: string
}

const PAGE_SIZE = 48

export default function MediaLibraryPage() {
  const list = useAdminListState({ q: "", folder: "all", page: 1 })

  const [assets, setAssets]   = useState<MediaAsset[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected]   = useState<MediaAsset | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MediaAsset | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      folder: list.state.folder,
      q: list.state.q,
      page: String(list.state.page),
      pageSize: String(PAGE_SIZE),
    })
    const res  = await fetch(`/api/admin/media?${params}`, { cache: "no-store" })
    const json = await res.json()
    if (json.success) {
      setAssets(json.data)
      setTotal(json.meta?.total ?? 0)
    }
    setLoading(false)
  }, [list.state.folder, list.state.q, list.state.page])

  useEffect(() => {
    const t = setTimeout(() => { void load() }, 0)
    return () => clearTimeout(t)
  }, [load])

  async function handleUpload(files: File[]) {
    setUploading(true)
    for (const file of files) {
      const form = new FormData()
      form.append("file", file)
      form.append("folder", list.state.folder === "all" ? "general" : list.state.folder)
      await fetch("/api/admin/media", { method: "POST", body: form })
    }
    setUploading(false)
    void load()
  }

  async function handleDelete() {
    if (!pendingDelete) return
    await fetch(`/api/admin/media/${pendingDelete.id}`, { method: "DELETE" })
    setPendingDelete(null)
    setSelected(null)
    void load()
  }

  async function handleSave(patch: { folder?: string; altText?: string }) {
    if (!selected) return
    const res = await fetch(`/api/admin/media/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    const json = await res.json()
    if (json.success) {
      setSelected(json.data)
      void load()
    }
  }

  function copyUrl(asset: MediaAsset) {
    if (!asset.public_url) return
    navigator.clipboard?.writeText(asset.public_url)
    setCopiedId(asset.id)
    setTimeout(() => setCopiedId((cur) => (cur === asset.id ? null : cur)), 1500)
  }

  return (
    <div className="flex flex-col gap-6 px-6 sm:px-8 py-6 sm:py-8 max-w-[1400px] mx-auto w-full">

      <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Media Library" }]} />

      <div className="flex flex-col gap-1">
        <h1 className="text-[1.375rem] font-bold text-white/95">Media Library</h1>
        <p className="text-[0.8125rem] text-white/45">
          Every image field across the admin reads from here. Upload once, reuse everywhere.
        </p>
      </div>

      {/* ── Toolbar — sticky ── */}
      <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#0d0d0d]/95 backdrop-blur-md p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            value={list.state.q}
            onChange={(q) => list.set({ q, page: 1 })}
            placeholder="Search by file name…"
            autoFocusKey="/"
            className="min-w-[240px] flex-1"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["all", ...MEDIA_FOLDERS].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => list.set({ folder: f, page: 1 })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[0.75rem] font-medium capitalize transition-colors",
                list.state.folder === f
                  ? "bg-gold/10 text-gold border-gold/30"
                  : "bg-white/[0.03] text-white/50 border-white/10 hover:text-white/80"
              )}
            >
              {f.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* ── Upload zone ── */}
      <DragDropUploader
        multiple
        label={uploading ? "Uploading…" : `Drag & drop into "${list.state.folder === "all" ? "general" : list.state.folder}", or click to upload`}
        hint="Images are optimized to WebP automatically. PDFs and videos are stored as-is."
        accept="image/*,video/*,application/pdf"
        disabled={uploading}
        onFiles={handleUpload}
      />

      {/* ── Grid ── */}
      {loading ? (
        <GridSkeleton count={12} />
      ) : assets.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] py-16 text-center text-[0.8125rem] text-white/40">
          No media yet — drag files above to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {assets.map((a) => (
            <div
              key={a.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/30 cursor-pointer hover:border-gold/40 transition-colors"
              onClick={() => setSelected(a)}
            >
              {a.public_url && a.mime_type?.startsWith("image/") ? (
                <Image src={a.public_url} alt={a.alt_text ?? a.file_name} fill className="object-cover" sizes="200px" />
              ) : (
                <div className="flex h-full items-center justify-center text-[0.65rem] text-white/40 uppercase">
                  {a.mime_type?.split("/")[1] ?? "file"}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="truncate text-[0.65rem] text-white/85">{a.file_name}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); copyUrl(a) }}
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white/70 opacity-0 group-hover:opacity-100 hover:text-gold transition-opacity"
                aria-label="Copy URL"
              >
                {copiedId === a.id ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <Pagination page={list.state.page} pageSize={PAGE_SIZE} total={total} onPageChange={(page) => list.set({ page })} />

      {/* ── Detail drawer ── */}
      <AdminDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.file_name}
        footer={
          selected && (
            <>
              <button
                type="button"
                onClick={() => setPendingDelete(selected)}
                className="mr-auto text-[0.8125rem] text-red-400 hover:text-red-300 transition-colors"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg bg-gold px-4 py-2 text-[0.8125rem] font-semibold text-background hover:bg-gold/90 transition-colors"
              >
                Done
              </button>
            </>
          )
        }
      >
        {selected && (
          <div className="flex flex-col gap-5">
            {selected.public_url && selected.mime_type?.startsWith("image/") && (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
                <Image src={selected.public_url} alt={selected.alt_text ?? ""} fill className="object-contain" sizes="480px" />
              </div>
            )}

            <FormField label="Alt Text" hint="Describes the image for accessibility and SEO">
              <TextInput
                defaultValue={selected.alt_text ?? ""}
                onBlur={(e) => handleSave({ altText: e.target.value })}
              />
            </FormField>

            <FormField label="Folder">
              <Select
                defaultValue={selected.folder}
                onChange={(e) => handleSave({ folder: e.target.value })}
              >
                {MEDIA_FOLDERS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="URL">
              <div className="flex gap-2">
                <TextInput readOnly value={selected.public_url ?? ""} className="font-mono text-[0.75rem]" />
                <button
                  type="button"
                  onClick={() => copyUrl(selected)}
                  className="shrink-0 rounded-lg border border-white/10 px-3 text-[0.75rem] text-white/60 hover:text-white/90 hover:border-white/25 transition-colors"
                >
                  Copy
                </button>
              </div>
            </FormField>

            <div className="grid grid-cols-2 gap-3 text-[0.75rem] text-white/45">
              {selected.width && selected.height && <span>{selected.width}×{selected.height}px</span>}
              {selected.file_size && <span>{(selected.file_size / 1024).toFixed(0)} KB</span>}
              <span>{selected.mime_type}</span>
              <span>{new Date(selected.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </AdminDrawer>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete this file?"
        description="This removes it from storage permanently. Any page still referencing this URL will show a broken image."
        confirmLabel="Delete"
      />
    </div>
  )
}
