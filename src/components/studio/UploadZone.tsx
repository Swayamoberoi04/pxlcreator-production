"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { prepareImageForUpload } from "@/lib/studio/client-image-prep"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE_MB    = 10

interface UploadZoneProps {
  file:           File | null
  previewUrl:     string | null
  onFileSelect:   (file: File) => void
  onClear:        () => void
}

export function UploadZone({ file, previewUrl, onFileSelect, onClear }: UploadZoneProps) {
  const inputRef    = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver]   = useState(false)
  const [fileError, setFileError]     = useState<string | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)

  /* ── dragCounter prevents the flicker caused by dragleave
     firing when the pointer moves over a child element.
     Increment on enter, decrement on leave — only hide
     the drag-over state when counter reaches zero.        ── */
  const dragCounter = useRef(0)

  async function validateAndSelect(f: File) {
    setFileError(null)
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setFileError("Please upload a JPEG, PNG, or WebP image.")
      return
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`)
      return
    }

    /* Resize + re-encode in the browser before it ever reaches the
       network — see client-image-prep.ts for why this is required. */
    setIsPreparing(true)
    try {
      const prepared = await prepareImageForUpload(f)
      onFileSelect(prepared.file)
    } catch {
      setFileError("Could not process this image. Please try a different photo.")
    } finally {
      setIsPreparing(false)
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current++
    setIsDragOver(true)
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault() // required to allow drop
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragOver(false)
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) void validateAndSelect(dropped)
  }
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (picked) void validateAndSelect(picked)
    e.target.value = "" // reset so re-selecting same file works
  }

  /* ── Showing a preview ── */
  if (file && previewUrl) {
    return (
      <div className="flex flex-col gap-3 h-full">
        <div className="relative flex-1 min-h-[280px] rounded-2xl overflow-hidden border border-border bg-surface group">
          {/* Preview image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Your uploaded photo"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Overlay on hover — shows clear button */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200 flex items-center justify-center">
            <button
              type="button"
              onClick={onClear}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2 rounded-full border border-white/30 bg-black/60 backdrop-blur-sm px-4 py-2 text-[0.8125rem] font-medium text-white hover:bg-black/80"
            >
              <SwapIcon />
              Change photo
            </button>
          </div>
          {/* BEFORE label */}
          <div className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-sm border border-white/15 px-2.5 py-1">
            <span className="text-[0.7rem] font-semibold text-white/85 tracking-widest uppercase">
              Original
            </span>
          </div>
        </div>

        {/* File meta */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <ImageIcon className="text-muted/85 shrink-0" />
            <span className="text-[0.8125rem] text-muted truncate">{file.name}</span>
          </div>
          <span className="text-[0.8125rem] text-muted/85 shrink-0">
            {(file.size / 1024 / 1024).toFixed(1)} MB
          </span>
        </div>
      </div>
    )
  }

  /* ── Empty drop zone ── */
  return (
    <div className="flex flex-col gap-3 h-full">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload photo — click or drag and drop"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={isPreparing ? undefined : handleDrop}
        onClick={() => !isPreparing && inputRef.current?.click()}
        onKeyDown={(e) => !isPreparing && (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        aria-busy={isPreparing}
        className={cn(
          "relative flex flex-col items-center justify-center gap-5 min-h-[320px] rounded-2xl",
          "border-2 border-dashed select-none",
          isPreparing ? "cursor-wait" : "cursor-pointer",
          "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isDragOver
            ? "border-gold/60 bg-gold/5 shadow-[0_0_40px_rgba(255,214,10,0.08)]"
            : "border-border bg-surface hover:border-border/80 hover:bg-surface-2"
        )}
      >
        {/* Animated icon ring */}
        <div className={cn(
          "flex items-center justify-center w-16 h-16 rounded-full border-2 transition-all duration-200",
          isDragOver
            ? "border-gold/50 bg-gold/10 scale-110"
            : "border-border bg-background"
        )}>
          {isPreparing
            ? <SpinnerIcon className="text-gold animate-spin" />
            : <UploadIcon className={isDragOver ? "text-gold" : "text-muted/85"} />
          }
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center px-8">
          <p className="text-[0.9375rem] font-medium text-foreground/92">
            {isPreparing ? "Optimizing photo…" : isDragOver ? "Drop your photo here" : "Upload your photo"}
          </p>
          <p className="text-[0.8125rem] text-muted/85">
            {isPreparing ? (
              "Resizing and preparing for upload"
            ) : (
              <>
                Drag & drop or{" "}
                <span className="text-gold underline underline-offset-2">browse files</span>
              </>
            )}
          </p>
          {!isPreparing && (
            <p className="text-[0.75rem] text-muted/70 mt-1">
              JPEG · PNG · WebP · up to {MAX_SIZE_MB} MB
            </p>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleInputChange}
          disabled={isPreparing}
          className="sr-only"
          aria-hidden="true"
          suppressHydrationWarning
        />
      </div>

      {/* Inline validation error */}
      {fileError && (
        <p className="text-[0.8125rem] text-red-400 px-1" role="alert">{fileError}</p>
      )}
    </div>
  )
}

/* ── Icons ── */
function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  )
}
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
function SwapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  )
}
function ImageIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}

