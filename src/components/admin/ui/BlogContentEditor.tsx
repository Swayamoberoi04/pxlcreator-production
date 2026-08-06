"use client"

/**
 * src/components/admin/ui/BlogContentEditor.tsx
 *
 * Block-based editor for a blog post's `content: ContentBlock[]` (see
 * src/types/blog.ts). The public blog already renders a TYPED block array
 * rather than raw HTML/markdown ("Easy to migrate to a CMS later" per the
 * original type comment) — this editor is that migration: it produces the
 * exact same block shapes the renderer in src/app/blog/[slug]/page.tsx
 * already knows how to display, including the newly added image/video/
 * code/table/cta block types.
 */

import { useState } from "react"
import type { ContentBlock } from "@/types/blog"
import { TextInput, TextArea } from "./FormField"
import { ImageUploader } from "./ImageUploader"
import { cn } from "@/lib/utils"

interface BlogContentEditorProps {
  value: ContentBlock[]
  onChange: (next: ContentBlock[]) => void
}

const BLOCK_LABELS: Record<ContentBlock["type"], string> = {
  paragraph: "Paragraph", heading: "Heading", subheading: "Subheading",
  list: "List", quote: "Quote", tip: "Tip", divider: "Divider",
  image: "Image", video: "Video", code: "Code", table: "Table", cta: "CTA",
}

function emptyBlock(type: ContentBlock["type"]): ContentBlock {
  switch (type) {
    case "paragraph":  return { type, text: "" }
    case "heading":    return { type, text: "" }
    case "subheading": return { type, text: "" }
    case "list":       return { type, items: [] }
    case "quote":      return { type, text: "", attribution: "" }
    case "tip":        return { type, label: "Tip", text: "" }
    case "divider":    return { type }
    case "image":      return { type, url: "", alt: "", caption: "" }
    case "video":      return { type, url: "", caption: "" }
    case "code":       return { type, code: "", language: "" }
    case "table":      return { type, headers: ["Column 1", "Column 2"], rows: [["", ""]] }
    case "cta":        return { type, title: "", buttonText: "Learn more", href: "/store" }
  }
}

export function BlogContentEditor({ value, onChange }: BlogContentEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  function addBlock(type: ContentBlock["type"]) {
    onChange([...value, emptyBlock(type)])
  }
  function updateBlock(i: number, block: ContentBlock) {
    onChange(value.map((b, idx) => (idx === i ? block : b)))
  }
  function removeBlock(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }
  function moveTo(from: number, to: number) {
    if (from === to) return
    const next = [...value]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {value.map((block, i) => (
        <div
          key={i}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (dragIndex !== null) moveTo(dragIndex, i); setDragIndex(null) }}
          className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-3.5 flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-white/40 cursor-grab active:cursor-grabbing">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="6" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>
              <span className="text-[0.6875rem] font-bold uppercase tracking-wide">{BLOCK_LABELS[block.type]}</span>
            </div>
            <button type="button" onClick={() => removeBlock(i)} className="text-white/30 hover:text-red-400 transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <BlockFields block={block} onChange={(next) => updateBlock(i, next)} />
        </div>
      ))}

      <div className="flex flex-wrap gap-1.5 pt-1">
        {(Object.keys(BLOCK_LABELS) as ContentBlock["type"][]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => addBlock(type)}
            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[0.7rem] text-white/55 hover:text-white/90 hover:border-gold/30 transition-colors"
          >
            + {BLOCK_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  )
}

function BlockFields({ block, onChange }: { block: ContentBlock; onChange: (next: ContentBlock) => void }) {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "subheading":
      return block.type === "paragraph" ? (
        <TextArea rows={4} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Paragraph text…" />
      ) : (
        <TextInput value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder={`${block.type === "heading" ? "Heading" : "Subheading"} text`} />
      )

    case "list":
      return (
        <TextArea
          rows={4}
          value={block.items.join("\n")}
          onChange={(e) => onChange({ ...block, items: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          placeholder={"One item per line"}
        />
      )

    case "quote":
      return (
        <div className="flex flex-col gap-2">
          <TextArea rows={3} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Quote text…" />
          <TextInput value={block.attribution ?? ""} onChange={(e) => onChange({ ...block, attribution: e.target.value })} placeholder="Attribution (optional)" />
        </div>
      )

    case "tip":
      return (
        <div className="flex flex-col gap-2">
          <TextInput value={block.label} onChange={(e) => onChange({ ...block, label: e.target.value })} placeholder="Label, e.g. Fix it" />
          <TextArea rows={3} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Tip text…" />
        </div>
      )

    case "divider":
      return <p className="text-[0.75rem] text-white/30 italic">No fields — renders as a visual break.</p>

    case "image":
      return (
        <div className="flex flex-col gap-2">
          <ImageUploader value={block.url} onChange={(url) => onChange({ ...block, url })} folder="blogs" aspect="video" />
          <TextInput value={block.alt ?? ""} onChange={(e) => onChange({ ...block, alt: e.target.value })} placeholder="Alt text" />
          <TextInput value={block.caption ?? ""} onChange={(e) => onChange({ ...block, caption: e.target.value })} placeholder="Caption (optional)" />
        </div>
      )

    case "video":
      return (
        <div className="flex flex-col gap-2">
          <TextInput value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="YouTube, Vimeo, or direct video URL" />
          <TextInput value={block.caption ?? ""} onChange={(e) => onChange({ ...block, caption: e.target.value })} placeholder="Caption (optional)" />
        </div>
      )

    case "code":
      return (
        <div className="flex flex-col gap-2">
          <TextInput value={block.language ?? ""} onChange={(e) => onChange({ ...block, language: e.target.value })} placeholder="Language (optional), e.g. bash" />
          <TextArea rows={5} value={block.code} onChange={(e) => onChange({ ...block, code: e.target.value })} placeholder="Code…" className="font-mono text-[0.8125rem]" />
        </div>
      )

    case "table":
      return <TableBlockFields block={block} onChange={onChange} />

    case "cta":
      return (
        <div className="grid grid-cols-2 gap-2">
          <TextInput value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} placeholder="Title" className="col-span-2" />
          <TextInput value={block.buttonText} onChange={(e) => onChange({ ...block, buttonText: e.target.value })} placeholder="Button text" />
          <TextInput value={block.href} onChange={(e) => onChange({ ...block, href: e.target.value })} placeholder="Link (e.g. /store)" />
        </div>
      )
  }
}

function TableBlockFields({ block, onChange }: { block: Extract<ContentBlock, { type: "table" }>; onChange: (next: ContentBlock) => void }) {
  function updateHeader(i: number, val: string) {
    onChange({ ...block, headers: block.headers.map((h, idx) => (idx === i ? val : h)) })
  }
  function updateCell(r: number, c: number, val: string) {
    onChange({ ...block, rows: block.rows.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? val : cell)) : row)) })
  }
  function addColumn() {
    onChange({ ...block, headers: [...block.headers, `Column ${block.headers.length + 1}`], rows: block.rows.map((r) => [...r, ""]) })
  }
  function addRow() {
    onChange({ ...block, rows: [...block.rows, block.headers.map(() => "")] })
  }
  function removeRow(r: number) {
    onChange({ ...block, rows: block.rows.filter((_, ri) => ri !== r) })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${block.headers.length}, 1fr) auto` }}>
        {block.headers.map((h, i) => (
          <TextInput key={i} value={h} onChange={(e) => updateHeader(i, e.target.value)} className="font-semibold text-[0.8125rem]" />
        ))}
        <span />
        {block.rows.map((row, ri) => (
          <div key={ri} className="contents">
            {row.map((cell, ci) => (
              <TextInput key={ci} value={cell} onChange={(e) => updateCell(ri, ci, e.target.value)} className="text-[0.8125rem]" />
            ))}
            <button type="button" onClick={() => removeRow(ri)} className="text-white/30 hover:text-red-400 transition-colors px-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={addColumn} className={cn("text-[0.7rem] text-gold/80 hover:text-gold transition-colors")}>+ Column</button>
        <button type="button" onClick={addRow} className="text-[0.7rem] text-gold/80 hover:text-gold transition-colors">+ Row</button>
      </div>
    </div>
  )
}
