"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface AdminDrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  width?: "sm" | "md" | "lg"
}

const WIDTH_CLASSES: Record<NonNullable<AdminDrawerProps["width"]>, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
}

/** Slide-in side panel — used for quick-edit / filter panels / media picker. Portaled to <body>. */
export function AdminDrawer({ open, onClose, title, children, footer, width = "md" }: AdminDrawerProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[300] transition-opacity duration-200",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onMouseDown={onClose}
      />
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-full bg-[#0d0d0d] border-l border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.6)]",
          "flex flex-col transition-transform duration-250 ease-out",
          WIDTH_CLASSES[width],
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-white/[0.06] shrink-0">
            <h2 className="text-[0.9375rem] font-semibold text-white/92">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/50 hover:text-white/85 hover:border-white/20 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
