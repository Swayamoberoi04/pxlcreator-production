"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { AdminModal } from "./AdminModal"
import { SearchBar } from "./SearchBar"
import { GridSkeleton } from "./Skeleton"
import { cn } from "@/lib/utils"
import { MEDIA_FOLDERS, type MediaFolder } from "@/lib/admin/media-constants"

interface MediaAsset {
  id: string
  file_name: string
  public_url: string | null
  folder: string
  width: number | null
  height: number | null
}

interface FilePickerProps {
  open: boolean
  onClose: () => void
  onSelect: (url: string) => void
  /** Pre-filters to this folder on open (still switchable). */
  folder?: MediaFolder | string
}

/** Modal picker over the Media Library — used by ImageUploader's "Choose from Media Library". */
export function FilePicker({ open, onClose, onSelect, folder }: FilePickerProps) {
  const [activeFolder, setActiveFolder] = useState(folder ?? "all")
  const [q, setQ]           = useState("")
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => setActiveFolder(folder ?? "all"), 0)
    return () => clearTimeout(t)
  }, [open, folder])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      setLoading(true)
      const params = new URLSearchParams({ folder: activeFolder, q, pageSize: "60" })
      fetch(`/api/admin/media?${params}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((json) => setAssets(json.success ? json.data : []))
        .finally(() => setLoading(false))
    }, 0)
    return () => clearTimeout(t)
  }, [open, activeFolder, q])

  return (
    <AdminModal open={open} onClose={onClose} title="Media Library" size="xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar value={q} onChange={setQ} placeholder="Search media…" className="min-w-[220px]" />
          <div className="flex flex-wrap gap-1.5">
            {["all", ...MEDIA_FOLDERS].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFolder(f)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[0.7rem] font-medium capitalize transition-colors",
                  activeFolder === f
                    ? "bg-gold/10 text-gold border-gold/30"
                    : "bg-white/[0.03] text-white/50 border-white/10 hover:text-white/80"
                )}
              >
                {f.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <GridSkeleton count={12} />
        ) : assets.length === 0 ? (
          <div className="py-16 text-center text-[0.8125rem] text-white/40">
            No media found. Upload from a module&apos;s image field first.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-[50vh] overflow-y-auto">
            {assets.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => a.public_url && onSelect(a.public_url)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 hover:border-gold/50 transition-colors"
                title={a.file_name}
              >
                {a.public_url && (
                  <Image src={a.public_url} alt={a.file_name} fill className="object-cover" sizes="160px" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </AdminModal>
  )
}
