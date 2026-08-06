"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
}

interface ToolbarAction {
  label: string
  icon: React.ReactNode
  apply: (selected: string) => { insert: string; cursorOffset?: number }
}

const ACTIONS: ToolbarAction[] = [
  { label: "Bold",      icon: <b>B</b>,   apply: (s) => ({ insert: `**${s || "bold text"}**` }) },
  { label: "Italic",    icon: <i>I</i>,   apply: (s) => ({ insert: `*${s || "italic text"}*` }) },
  { label: "Heading",   icon: <span>H</span>, apply: (s) => ({ insert: `\n## ${s || "Heading"}\n` }) },
  { label: "Quote",     icon: <span>&ldquo;</span>, apply: (s) => ({ insert: `\n> ${s || "Quote"}\n` }) },
  { label: "List",      icon: <span>•</span>, apply: (s) => ({ insert: `\n- ${s || "List item"}\n` }) },
  { label: "Link",      icon: <span>🔗</span>, apply: (s) => ({ insert: `[${s || "link text"}](https://)` }) },
  { label: "Code",      icon: <span>&lt;/&gt;</span>, apply: (s) => ({ insert: s ? `\`${s}\`` : "\n```\ncode block\n```\n" }) },
  { label: "CTA block", icon: <span>CTA</span>, apply: () => ({ insert: `\n:::cta\nTitle | Button text | /store\n:::\n` }) },
]

/** Very small, dependency-free markdown → HTML for the live preview only (not used for storage/rendering elsewhere). */
function markdownPreview(md: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  let html = escape(md)
  html = html.replace(/^## (.*)$/gm, "<h3>$1</h3>")
  html = html.replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>")
  html = html.replace(/^- (.*)$/gm, "<li>$1</li>")
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>")
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>")
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
  html = html.replace(/\n{2,}/g, "</p><p>")
  return `<p>${html}</p>`
}

/**
 * Lightweight, dependency-free rich text editor: a markdown textarea with a
 * formatting toolbar + live preview toggle. Content is stored as plain
 * markdown text (safe — no raw HTML capture/XSS surface), and the frontend
 * blog renderer is responsible for rendering that markdown.
 */
export function RichTextEditor({ value, onChange, placeholder, minHeight = 260 }: RichTextEditorProps) {
  const [mode, setMode] = useState<"write" | "preview">("write")
  const ref = useRef<HTMLTextAreaElement>(null)

  function applyAction(action: ToolbarAction) {
    const el = ref.current
    if (!el) return
    const { selectionStart: start, selectionEnd: end } = el
    const selected = value.slice(start, end)
    const { insert } = action.apply(selected)
    const next = value.slice(0, start) + insert + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + insert.length
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5">
          {ACTIONS.map((a) => (
            <button
              key={a.label}
              type="button"
              title={a.label}
              onClick={() => applyAction(a)}
              className="flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[0.7rem] font-semibold text-white/55 hover:bg-white/[0.06] hover:text-white/85 transition-colors"
            >
              {a.icon}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 p-0.5">
          {(["write", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded px-2.5 py-1 text-[0.7rem] font-medium capitalize transition-colors",
                mode === m ? "bg-gold/15 text-gold" : "text-white/45 hover:text-white/75"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === "write" ? (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ minHeight }}
          className="w-full resize-y bg-transparent px-4 py-3 text-[0.875rem] text-white/85 outline-none placeholder:text-white/25 font-mono leading-relaxed"
        />
      ) : (
        <div
          style={{ minHeight }}
          className="prose prose-invert prose-sm max-w-none px-4 py-3 text-white/80 [&_h3]:text-white/90 [&_h3]:font-bold [&_blockquote]:border-l-2 [&_blockquote]:border-gold/40 [&_blockquote]:pl-3 [&_blockquote]:text-white/60 [&_code]:bg-white/10 [&_code]:rounded [&_code]:px-1 [&_a]:text-gold"
          dangerouslySetInnerHTML={{ __html: markdownPreview(value || "*Nothing to preview yet.*") }}
        />
      )}
    </div>
  )
}
