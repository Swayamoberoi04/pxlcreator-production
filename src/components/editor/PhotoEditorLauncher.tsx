"use client"

/**
 * PhotoEditorLauncher — the "Continue Editing" entry point shown on the AI
 * result screen. The heavy editor bundle (WebGL engine, panels) is lazy-loaded
 * with `next/dynamic({ ssr: false })` and only fetched when the user actually
 * opens it, so the Studio result view stays light. WebGL is browser-only, hence
 * ssr:false — this file is already a Client Component, which is where Next
 * requires that option to live.
 */

import { useState } from "react"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"

const PhotoEditor = dynamic(
  () => import("./PhotoEditor").then((m) => m.PhotoEditor),
  { ssr: false }
)

interface PhotoEditorLauncherProps {
  /** The AI result as a data URI — becomes the editor's immutable source. */
  imageUrl: string
  className?: string
}

export function PhotoEditorLauncher({ imageUrl, className }: PhotoEditorLauncherProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center justify-center gap-2.5 rounded-xl bg-gold py-3.5 text-[0.9375rem] font-semibold text-black transition-all duration-200 hover:bg-gold-bright hover:shadow-[0_0_28px_rgba(201,168,76,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        <SlidersIcon />
        Continue editing
      </button>
      {open && <PhotoEditor imageUrl={imageUrl} onClose={() => setOpen(false)} />}
    </>
  )
}

function SlidersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  )
}
