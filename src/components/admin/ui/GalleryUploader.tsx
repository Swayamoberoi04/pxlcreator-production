"use client"

import { useState } from "react"
import Image from "next/image"
import { DragDropUploader } from "./DragDropUploader"
import type { MediaFolder } from "@/lib/admin/media-constants"

interface GalleryUploaderProps {
  value: string[]
  onChange: (urls: string[]) => void
  folder: MediaFolder | string
  max?: number
}

/** Multi-image field with drag-to-reorder — used for course/preset/blog galleries. */
export function GalleryUploader({ value, onChange, folder, max = 20 }: GalleryUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  async function uploadFiles(files: File[]) {
    if (value.length + files.length > max) {
      setError(`Maximum ${max} images.`)
      return
    }
    setUploading(true)
    setError(null)
    try {
      const uploaded: string[] = []
      for (const file of files) {
        const form = new FormData()
        form.append("file", file)
        form.append("folder", folder)
        const res = await fetch("/api/admin/media", { method: "POST", body: form })
        const json = await res.json()
        if (!res.ok || !json.success) {
          setError(json.error ?? "Upload failed.")
          continue
        }
        uploaded.push(json.data.public_url as string)
      }
      if (uploaded.length) onChange([...value, ...uploaded])
    } finally {
      setUploading(false)
    }
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  function moveTo(from: number, to: number) {
    if (from === to) return
    const next = [...value]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {value.map((url, i) => (
            <div
              key={url + i}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragIndex !== null) moveTo(dragIndex, i); setDragIndex(null) }}
              className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/30 cursor-grab active:cursor-grabbing"
            >
              <Image src={url} alt="" fill className="object-cover" sizes="160px" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Remove image"
                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white/70 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <span className="absolute bottom-1 left-1 text-[0.6rem] font-bold text-white/50 bg-black/50 rounded px-1">{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      {value.length < max && (
        <DragDropUploader
          multiple
          label={uploading ? "Uploading…" : "Drag & drop images, or click to add"}
          hint={`${value.length}/${max} images — drag thumbnails to reorder`}
          disabled={uploading}
          onFiles={(files) => void uploadFiles(files)}
        />
      )}
      {error && <p className="text-[0.75rem] text-red-400">{error}</p>}
    </div>
  )
}
