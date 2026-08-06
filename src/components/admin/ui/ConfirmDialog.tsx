"use client"

import { useState } from "react"
import { AdminModal } from "./AdminModal"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title?: string
  description?: string
  /** Type this exact text to confirm — used for destructive delete. Omit for a simple yes/no. */
  requireTypedConfirmation?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: "danger" | "default"
}

/**
 * Replaces every native `confirm()` call across the admin (presets, bundles,
 * media, and future modules). Supports optional "type DELETE to confirm"
 * for destructive/irreversible actions.
 */
export function ConfirmDialog({
  open, onClose, onConfirm,
  title = "Are you sure?",
  description,
  requireTypedConfirmation,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
}: ConfirmDialogProps) {
  const [typed, setTyped]     = useState("")
  const [busy, setBusy]       = useState(false)

  const locked = Boolean(requireTypedConfirmation) && typed.trim() !== requireTypedConfirmation

  async function handleConfirm() {
    setBusy(true)
    try {
      await onConfirm()
      setTyped("")
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-[0.8125rem] font-medium text-white/60 hover:text-white/90 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={locked || busy}
            onClick={handleConfirm}
            className={cn(
              "rounded-lg px-4 py-2 text-[0.8125rem] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed",
              tone === "danger"
                ? "bg-red-500/90 text-white hover:bg-red-500"
                : "bg-gold text-background hover:bg-gold/90"
            )}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      {requireTypedConfirmation && (
        <div className="flex flex-col gap-2">
          <p className="text-[0.8125rem] text-white/60">
            Type <span className="font-mono font-semibold text-white/85">{requireTypedConfirmation}</span> to confirm.
          </p>
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="admin-input"
            placeholder={requireTypedConfirmation}
          />
        </div>
      )}
    </AdminModal>
  )
}
