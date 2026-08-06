"use client"

/**
 * src/hooks/admin/useAdminShortcuts.ts
 *
 * Small, generic keyboard-shortcut hook for admin list pages.
 * "/" is handled by SearchBar itself (autoFocusKey prop); this hook covers
 * page-level actions like "n" for new / "Esc" to close a panel.
 *
 * Usage:
 *   useAdminShortcuts({ n: () => router.push("/admin/courses/new") })
 */
import { useEffect } from "react"

export function useAdminShortcuts(bindings: Record<string, () => void>) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable
      if (isTyping) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const handler = bindings[e.key]
      if (handler) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [bindings])
}
