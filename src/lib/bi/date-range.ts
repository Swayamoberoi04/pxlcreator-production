/**
 * Shared date-range helpers for BI API routes.
 */

export interface DateRange {
  from: string
  to:   string
}

export function parseDateRange(searchParams: URLSearchParams): DateRange {
  const now  = new Date()
  const to   = searchParams.get("to")   ?? now.toISOString()
  const from = searchParams.get("from") ??
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  return { from, to }
}

/** Compute the mirror period of equal duration immediately before p_from. */
export function previousPeriod(range: DateRange): DateRange {
  const fromMs = new Date(range.from).getTime()
  const toMs   = new Date(range.to).getTime()
  const span   = toMs - fromMs
  return {
    from: new Date(fromMs - span).toISOString(),
    to:   new Date(fromMs).toISOString(),
  }
}

export function growthPct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
}
