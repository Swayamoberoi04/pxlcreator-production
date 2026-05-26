"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface DownloadButtonProps {
  dataUrl:   string          // base64 data URI from the API
  className?: string
}

export function DownloadButton({ dataUrl, className }: DownloadButtonProps) {
  const [state, setState] = useState<"idle" | "done">("idle")

  function handleDownload() {
    /* Create a temporary anchor and programmatically click it.
       The browser triggers a file-save dialog for data: URIs
       when the `download` attribute is present.              */
    const a   = document.createElement("a")
    a.href    = dataUrl
    a.download = `pxl-studio-edit-${Date.now()}.jpg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    setState("done")
    setTimeout(() => setState("idle"), 3000)
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className={cn(
        "flex items-center justify-center gap-2.5 rounded-xl border py-3.5 text-[0.9375rem] font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        state === "done"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-border hover:border-gold/40 hover:bg-surface-2 text-foreground",
        className
      )}
    >
      {state === "done" ? <CheckIcon /> : <DownloadIcon />}
      {state === "done" ? "Saved to downloads" : "Download edited photo"}
    </button>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
