"use client"

import { useState } from "react"
import Image from "next/image"
import { DragDropUploader } from "./DragDropUploader"
import { FilePicker } from "./FilePicker"
import { cn } from "@/lib/utils"
import type { MediaFolder } from "@/lib/admin/media-constants"

interface ImageUploaderProps {
  value: string            // current image URL (empty string = none)
  onChange: (url: string) => void
  folder: MediaFolder | string
  aspect?: "square" | "video" | "portrait" | "banner"
  className?: string
}

const ASPECT_CLASSES: Record<NonNullable<ImageUploaderProps["aspect"]>, string> = {
  square:  "aspect-square",
  video:   "aspect-video",
  portrait: "aspect-[3/4]",
  banner:  "aspect-[21/9]",
}

/**
 * Single-image field: upload new / replace / pick from Media Library / clear.
 * Replaces every "paste a URL" text input across the admin (presets,
 * bundles, and every future module).
 */
export function ImageUploader({ value, onChange, folder, aspect = "video", className }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  async function upload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("folder", folder)
      const res = await fetch("/api/admin/media", { method: "POST", body: form })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error ?? "Upload failed.")
        return
      }
      onChange(json.data.public_url as string)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.")
    } finally {
      setUploading(false)
    }
  }

  if (value) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className={cn("relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/30", ASPECT_CLASSES[aspect])}>
          <Image src={value} alt="" fill className="object-cover" sizes="320px" unoptimized={value.startsWith("blob:")} />
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 bg-black/60 transition-opacity">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-[0.75rem] font-medium text-white hover:bg-white/20 transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-lg bg-red-500/20 px-3 py-1.5 text-[0.75rem] font-medium text-red-300 hover:bg-red-500/30 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
        {error && <p className="text-[0.75rem] text-red-400">{error}</p>}
        <FilePicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(url) => { onChange(url); setPickerOpen(false) }}
          folder={folder}
        />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <DragDropUploader
        label={uploading ? "Uploading…" : "Drag & drop an image, or click to upload"}
        hint="JPG, PNG, WEBP, AVIF, GIF — optimized automatically"
        disabled={uploading}
        onFiles={(files) => { if (files[0]) void upload(files[0]) }}
      />
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="self-start text-[0.75rem] text-gold/80 hover:text-gold transition-colors"
      >
        Choose from Media Library
      </button>
      {error && <p className="text-[0.75rem] text-red-400">{error}</p>}
      <FilePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => { onChange(url); setPickerOpen(false) }}
        folder={folder}
      />
    </div>
  )
}
