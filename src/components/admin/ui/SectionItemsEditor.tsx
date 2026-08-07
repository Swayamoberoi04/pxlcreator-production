"use client"

/**
 * src/components/admin/ui/SectionItemsEditor.tsx
 *
 * ONE generic drag-reorderable list editor for "repeatable sub-content"
 * sections — testimonials, FAQ entries, stat tiles, feature cards, video
 * links. Every item shares the same flexible shape:
 *
 *   { title?, subtitle?, image_url?, link_href?, link_label? }
 *
 * which covers each use case without a bespoke editor per section type
 * (a testimonial's quote is `subtitle`, a FAQ's answer is `subtitle`, a
 * stat's number is `title` and its label is `subtitle`, etc.) — reused by
 * Homepage now, and by any future module with the same "list of small
 * cards" shape.
 */

import { useState } from "react"
import { TextInput, TextArea } from "./FormField"
import { ImageUploader } from "./ImageUploader"

export interface SectionItem {
  title?: string
  subtitle?: string
  image_url?: string
  link_href?: string
  link_label?: string
}

interface SectionItemsEditorProps {
  value: SectionItem[]
  onChange: (next: SectionItem[]) => void
  /** Field labels tailored to what this section actually represents, e.g. {title: "Quote", subtitle: "Author"}. */
  labels?: Partial<Record<keyof SectionItem, string>>
  /** Which generic fields to show — omit ones a given section doesn't need (e.g. FAQ doesn't need an image). */
  fields?: (keyof SectionItem)[]
  mediaFolder?: string
}

const DEFAULT_LABELS: Record<keyof SectionItem, string> = {
  title: "Title", subtitle: "Text", image_url: "Image", link_href: "Link", link_label: "Link Label",
}
const DEFAULT_FIELDS: (keyof SectionItem)[] = ["title", "subtitle", "image_url", "link_href", "link_label"]

export function SectionItemsEditor({
  value, onChange, labels = {}, fields = DEFAULT_FIELDS, mediaFolder = "general",
}: SectionItemsEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const L = { ...DEFAULT_LABELS, ...labels }

  function update(i: number, patch: Partial<SectionItem>) {
    onChange(value.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }
  function add() {
    onChange([...value, {}])
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
      {value.map((item, i) => (
        <div
          key={i}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (dragIndex !== null) moveTo(dragIndex, i); setDragIndex(null) }}
          className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-3.5 flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/40 cursor-grab active:cursor-grabbing">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="6" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>
              <span className="text-[0.6875rem] font-bold uppercase tracking-wide">Item {i + 1}</span>
            </div>
            <button type="button" onClick={() => remove(i)} className="text-white/30 hover:text-red-400 transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {fields.includes("image_url") && (
            <ImageUploader value={item.image_url ?? ""} onChange={(url) => update(i, { image_url: url })} folder={mediaFolder} aspect="square" />
          )}
          {fields.includes("title") && (
            <TextInput value={item.title ?? ""} onChange={(e) => update(i, { title: e.target.value })} placeholder={L.title} />
          )}
          {fields.includes("subtitle") && (
            <TextArea rows={2} value={item.subtitle ?? ""} onChange={(e) => update(i, { subtitle: e.target.value })} placeholder={L.subtitle} />
          )}
          {(fields.includes("link_href") || fields.includes("link_label")) && (
            <div className="grid grid-cols-2 gap-2">
              {fields.includes("link_label") && (
                <TextInput value={item.link_label ?? ""} onChange={(e) => update(i, { link_label: e.target.value })} placeholder={L.link_label} />
              )}
              {fields.includes("link_href") && (
                <TextInput value={item.link_href ?? ""} onChange={(e) => update(i, { link_href: e.target.value })} placeholder={L.link_href} />
              )}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="self-start rounded-lg border border-white/10 px-3.5 py-2 text-[0.8125rem] text-white/60 hover:text-white/90 hover:border-white/25 transition-colors"
      >
        + Add item
      </button>
    </div>
  )
}
