"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { validateUpload } from "@/lib/admin/validation"

interface DragDropUploaderProps {
  onFiles: (files: File[]) => void
  accept?: string
  multiple?: boolean
  disabled?: boolean
  label?: string
  hint?: string
  className?: string
}

/**
 * Generic drag-and-drop drop-zone. Used directly by the Media Library, and
 * wrapped by ImageUploader/GalleryUploader for single/multi image fields.
 */
export function DragDropUploader({
  onFiles, accept = "image/*", multiple = false, disabled, label = "Drag & drop or click to upload", hint, className,
}: DragDropUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)
    for (const f of files) {
      const check = validateUpload({ type: f.type, size: f.size, name: f.name })
      if (!check.ok) { setError(check.error ?? "Invalid file."); return }
    }
    setError(null)
    onFiles(multiple ? files : [files[0]])
  }

  return (
    <div className={className}>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors",
          dragging ? "border-gold/60 bg-gold/[0.04]" : "border-white/12 hover:border-white/25 bg-white/[0.015]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="text-white/30">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </span>
        <span className="text-[0.8125rem] font-medium text-white/65">{label}</span>
        {hint && <span className="text-[0.7rem] text-white/35">{hint}</span>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
      {error && <p className="mt-1.5 text-[0.75rem] text-red-400">{error}</p>}
    </div>
  )
}
