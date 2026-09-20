"use client"

/**
 * Shows a creator's rank score together with the arithmetic that produced it.
 *
 * Phase 5.6 requirement 4: a ranking must be explainable wherever it appears.
 * This component never renders a bare number — every component of the score
 * is listed with the real counts behind it, and the weights come from the
 * same source of truth the server scored with (src/lib/community/ranking.ts,
 * echoed in the API response).
 */

import { useEffect, useState } from "react"

interface RankComponent {
  key: string
  label: string
  detail: string
  points: number
  max: number | null
}

interface RankResponse {
  total_score: number
  components: RankComponent[]
  computed_at: string
  explainer: {
    headline: string
    summary: string
    principles: string[]
  }
}

export function RankExplainer({ username, compact = false }: { username: string; compact?: boolean }) {
  const [data, setData] = useState<RankResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/community/ranking/${username}`)
        if (res.ok && !cancelled) setData(await res.json())
      } catch { /* the score is supplementary — never block the profile */ }
      finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [username])

  if (loading) {
    return <div className="h-6 w-24 rounded-full bg-surface-2 animate-pulse" />
  }
  if (!data) return null

  // A zero score with no components is an honest "nothing to score yet",
  // not a failure — say so rather than showing a bare 0.
  const hasActivity = data.components.some((c) => c.points > 0)

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 self-start rounded-full border border-gold/25 bg-gold/5 px-3 py-1 text-xs text-gold hover:bg-gold/10 transition-colors"
      >
        <span className="font-bold">{data.total_score}</span>
        <span className="text-gold/80">creator score</span>
        <span className="text-gold/60 text-[0.625rem]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3 max-w-md">
          <div>
            <p className="font-display font-bold text-sm text-foreground">{data.explainer.headline}</p>
            <p className="text-xs text-muted/85 mt-1 leading-relaxed">{data.explainer.summary}</p>
          </div>

          {hasActivity ? (
            <div className="flex flex-col gap-2">
              {data.components.map((c) => (
                <div key={c.key} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">{c.label}</span>
                    <span className={`text-xs font-bold ${c.points < 0 ? "text-red-400" : "text-gold"}`}>
                      {c.points > 0 ? "+" : ""}{c.points}
                      {c.max !== null && <span className="text-muted/50 font-normal"> / {c.max}</span>}
                    </span>
                  </div>
                  <p className="text-[0.6875rem] text-muted/70 leading-snug">{c.detail}</p>
                  {c.max !== null && (
                    <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
                      <div className="h-full bg-gold/50 rounded-full"
                        style={{ width: `${Math.min(100, (c.points / c.max) * 100)}%` }} />
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-xs font-bold text-foreground">Total</span>
                <span className="text-sm font-bold text-gold">{data.total_score}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted/70">
              Nothing to score yet — this creator hasn&apos;t published work or received
              engagement. The score rises as real activity happens, not over time.
            </p>
          )}

          {!compact && (
            <ul className="flex flex-col gap-1 border-t border-border pt-2">
              {data.explainer.principles.map((p) => (
                <li key={p} className="text-[0.6875rem] text-muted/70 leading-snug">· {p}</li>
              ))}
            </ul>
          )}

          <p className="text-[0.625rem] text-muted/50">
            Last calculated {new Date(data.computed_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}
