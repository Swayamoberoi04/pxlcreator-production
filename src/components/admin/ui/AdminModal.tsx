"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface AdminModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<AdminModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
}

/**
 * Generic modal used across every admin module. Portaled to <body> — the
 * admin shell has no backdrop-filter ancestor issue, but portaling keeps
 * this safe if one is ever added (see backdrop-filter fixed-position note
 * in project memory).
 */
export function AdminModal({
  open, onClose, title, description, children, footer, size = "md", className,
}: AdminModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "admin-modal-title" : undefined}
    >
      <div
        ref={dialogRef}
        className={cn(
          "relative w-full rounded-2xl border border-white/10 bg-[#111111] shadow-[0_0_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[88vh]",
          SIZE_CLASSES[size],
          className
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/[0.06] shrink-0">
            <div className="flex flex-col gap-1">
              {title && <h2 id="admin-modal-title" className="text-[0.9375rem] font-semibold text-white/92">{title}</h2>}
              {description && <p className="text-[0.8125rem] text-white/50">{description}</p>}
            </div>
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
