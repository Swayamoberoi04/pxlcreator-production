"use client"

import { useEffect, useRef, useState } from "react"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Debounce in ms before onChange fires. Default 300. */
  debounceMs?: number
  autoFocusKey?: string // e.g. "/" — registers a global shortcut to focus this bar
  className?: string
}

/** Debounced search input, shared by every admin list page. */
export function SearchBar({ value, onChange, placeholder = "Search…", debounceMs = 300, autoFocusKey, className }: SearchBarProps) {
  const [local, setLocal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setLocal(value), 0)
    return () => clearTimeout(t)
  }, [value])

  useEffect(() => {
    const t = setTimeout(() => { if (local !== value) onChange(local) }, debounceMs)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local])

  useEffect(() => {
    if (!autoFocusKey) return
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isTyping = ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable
      if (isTyping) return
      if (e.key === autoFocusKey) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [autoFocusKey])

  return (
    <div className={className}>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <input
          ref={inputRef}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder={placeholder}
          className="admin-input pl-9 pr-8"
        />
        {local && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => { setLocal(""); onChange("") }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
        {autoFocusKey && !local && (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.625rem] text-white/25 border border-white/10 rounded px-1.5 py-0.5 pointer-events-none">
            {autoFocusKey}
          </kbd>
        )}
      </div>
    </div>
  )
}
