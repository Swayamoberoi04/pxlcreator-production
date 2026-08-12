"use client"

/**
 * WhatsNewPanel — admin-managed changelog, matching AIAssistant's
 * absolutely-positioned panel pattern (this editor shell isn't a portal
 * boundary case like AdminDrawer needs — it's already inside one).
 */

import { useEffect, useState } from "react"

interface ChangelogEntry {
  id: string
  version_label: string
  title: string
  description: string | null
  released_at: string
}

export function WhatsNewButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg px-2.5 py-1.5 text-[0.75rem] font-medium text-muted transition-colors hover:text-foreground"
        title="What's New"
      >
        What&apos;s New
      </button>
      {open && <WhatsNewPanel onClose={() => setOpen(false)} />}
    </>
  )
}

function WhatsNewPanel({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/editor/changelog")
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setEntries(json.success ? json.data : []) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="absolute inset-y-0 right-0 z-30 flex w-full max-w-[360px] flex-col border-l border-gold/15 bg-surface/95 shadow-[-8px_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <p className="font-display text-[0.9375rem] tracking-wide text-foreground/92">What&apos;s New</p>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted transition-colors hover:text-foreground">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <p className="text-[0.8125rem] text-muted/70">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-[0.8125rem] text-muted/70">No updates yet.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {entries.map((e) => (
              <div key={e.id} className="flex flex-col gap-1.5 border-l-2 border-gold/30 pl-3.5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-gold">{e.version_label}</span>
                  <span className="text-[0.6875rem] text-muted/60">{new Date(e.released_at).toLocaleDateString()}</span>
                </div>
                <p className="text-[0.8125rem] font-semibold text-foreground/92">{e.title}</p>
                {e.description && <p className="text-[0.75rem] leading-relaxed text-muted/85">{e.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
