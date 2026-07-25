"use client"

/**
 * /admin/pricing — Set prices by category
 *
 * Loads all categories with their REAL is_free + price state from the DB,
 * lets the admin set a price per category, then applies in one batch.
 *
 * Rules:
 *  - Toggle "Free"  → price=0, is_free=true
 *  - Toggle "Paid" + enter price → price=X, is_free=false
 *  - Toggle "Paid" + blank price → row is SKIPPED (no changes saved)
 */

import { useState, useEffect } from "react"
import Link                    from "next/link"
import { cn }                  from "@/lib/utils"

interface CategoryApiRow {
  id:            string
  name:          string
  slug:          string
  presetCount:   number
  currentPrice:  number
  currentIsFree: boolean
}

interface PriceEntry {
  category_id: string | null
  name:        string
  count:       number
  price:       string   // controlled input value
  is_free:     boolean
  // track original DB state so we can detect "no change"
  _origPrice:  number
  _origIsFree: boolean
}

export default function AdminPricingPage() {
  const [entries,  setEntries]  = useState<PriceEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [result,   setResult]   = useState<{ updated: number; skipped: number } | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/presets/bulk-price")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) { setError(j.error); return }

        const rows: PriceEntry[] = (j.categories as CategoryApiRow[]).map((c) => ({
          category_id:  c.id,
          name:         c.name,
          count:        c.presetCount,
          // Initialise from REAL DB values — not derived from price===0
          price:        c.currentIsFree ? "" : (c.currentPrice > 0 ? String(c.currentPrice) : ""),
          is_free:      c.currentIsFree,
          _origPrice:   c.currentPrice,
          _origIsFree:  c.currentIsFree,
        }))

        if (j.uncategorizedCount > 0) {
          rows.push({
            category_id:  null,
            name:         "Uncategorized",
            count:        j.uncategorizedCount,
            price:        j.uncategorizedIsFree ? "" : (j.uncategorizedPrice > 0 ? String(j.uncategorizedPrice) : ""),
            is_free:      j.uncategorizedIsFree,
            _origPrice:   j.uncategorizedPrice,
            _origIsFree:  j.uncategorizedIsFree,
          })
        }

        setEntries(rows)
      })
      .catch(() => setError("Failed to load categories."))
      .finally(() => setLoading(false))
  }, [])

  /* Typing a price does NOT auto-flip the is_free toggle */
  function handlePriceChange(idx: number, value: string) {
    setEntries((prev) =>
      prev.map((e, i) => i === idx ? { ...e, price: value } : e)
    )
  }

  /* Explicit Free/Paid toggle */
  function handleFreeToggle(idx: number, free: boolean) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === idx
          ? { ...e, is_free: free, price: free ? "" : e.price }
          : e
      )
    )
  }

  /* "Apply one price to all" shortcut */
  function applyToAll(value: string) {
    setEntries((prev) =>
      prev.map((e) => ({
        ...e,
        price:   value,
        is_free: false,   // typing a price always means "Paid"
      }))
    )
  }

  async function handleSave() {
    setSaving(true)
    setResult(null)
    setError(null)

    const toUpdate: { category_id: string | null; price: number; is_free: boolean }[] = []
    let skipped = 0

    for (const e of entries) {
      if (e.count === 0) continue

      if (e.is_free) {
        // Explicitly marked Free
        toUpdate.push({ category_id: e.category_id, price: 0, is_free: true })
        continue
      }

      const parsedPrice = parseFloat(e.price)
      if (!e.price.trim() || isNaN(parsedPrice) || parsedPrice <= 0) {
        // Paid toggle but no valid price entered — skip this category
        skipped++
        continue
      }

      toUpdate.push({
        category_id: e.category_id,
        price:       Math.round(parsedPrice * 100) / 100,  // round to 2 dp
        is_free:     false,
      })
    }

    if (toUpdate.length === 0) {
      setError(
        skipped > 0
          ? `${skipped} categor${skipped !== 1 ? "ies" : "y"} skipped — enter a price for Paid categories.`
          : "Nothing to update."
      )
      setSaving(false)
      return
    }

    try {
      const res  = await fetch("/api/admin/presets/bulk-price", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ updates: toUpdate }),
      })
      const json = await res.json()
      if (json.success) {
        setResult({ updated: json.updated, skipped })
        // Sync _orig state so the next save is relative to the new DB state
        setEntries((prev) =>
          prev.map((e) => {
            const applied = toUpdate.find((u) => u.category_id === e.category_id)
            if (!applied) return e
            return { ...e, _origPrice: applied.price, _origIsFree: applied.is_free }
          })
        )
      } else {
        setError(json.error ?? "Save failed.")
      }
    } catch {
      setError("Network error — could not reach the API.")
    } finally {
      setSaving(false)
    }
  }

  const totalPresets   = entries.reduce((s, e) => s + e.count, 0)
  const hasValidUpdate = entries.some((e) => {
    if (e.count === 0) return false
    if (e.is_free) return true
    const p = parseFloat(e.price)
    return !!e.price.trim() && !isNaN(p) && p > 0
  })

  return (
    <div className="flex flex-col gap-8 p-8 max-w-3xl">

      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-px w-5 bg-gold/50" />
          <span className="text-[0.7rem] text-gold/60 tracking-widest">( BULK PRICING )</span>
        </div>
        <h1 className="font-display font-black text-[1.75rem] text-white/90">
          Set Prices by Category
        </h1>
        <p className="text-[0.875rem] text-white/70 max-w-lg">
          Set a price for each category — every preset in that category updates at once.
          Toggle <span className="text-emerald-400/70">Free</span> for free downloads,
          or enter a price with <span className="text-white/85">Paid</span> selected.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-[72px] rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Apply all shortcut ── */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex items-center gap-4">
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-[0.875rem] font-semibold text-white/92">Set same price for all categories</span>
              <span className="text-[0.75rem] text-white/70">
                Fills every row at once — toggle individual rows to Free afterwards if needed
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white/70 text-[0.875rem]">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g. 9.99"
                onChange={(e) => applyToAll(e.target.value)}
                className="w-28 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.875rem] text-white/92 placeholder:text-white/70 focus:outline-none focus:border-gold/40 transition-colors text-right"
              />
            </div>
          </div>

          {/* ── Category rows ── */}
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            {entries.map((entry, i) => {
              const priceNum       = parseFloat(entry.price)
              const missingPrice   = !entry.is_free && (!entry.price.trim() || isNaN(priceNum) || priceNum <= 0)
              return (
                <div
                  key={entry.category_id ?? "__none__"}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.01]",
                    i !== 0 && "border-t border-white/[0.06]"
                  )}
                >
                  {/* Category info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.875rem] font-semibold text-white/92">{entry.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[0.75rem] text-white/70">
                        {entry.count} preset{entry.count !== 1 ? "s" : ""}
                        {entry.count === 0 && " — nothing to update"}
                      </span>
                      {/* Show current DB price as hint */}
                      {entry._origIsFree ? (
                        <span className="text-[0.65rem] text-emerald-400/50 bg-emerald-500/[0.06] rounded-full px-2 py-px">
                          currently Free
                        </span>
                      ) : entry._origPrice > 0 ? (
                        <span className="text-[0.65rem] text-white/70 bg-white/[0.04] rounded-full px-2 py-px">
                          currently ${entry._origPrice}
                        </span>
                      ) : (
                        <span className="text-[0.65rem] text-white/70 bg-white/[0.03] rounded-full px-2 py-px">
                          price not set
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Free/Paid toggle */}
                  <button
                    type="button"
                    onClick={() => handleFreeToggle(i, !entry.is_free)}
                    disabled={entry.count === 0}
                    title={entry.is_free ? "Click to switch to Paid" : "Click to mark as Free"}
                    className={cn(
                      "shrink-0 h-7 px-3 rounded-full text-[0.7rem] font-medium transition-all border",
                      entry.is_free
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                        : "bg-white/[0.04] text-white/70 border-white/10 hover:border-white/20 hover:text-white/85"
                    )}
                  >
                    {entry.is_free ? "Free" : "Paid"}
                  </button>

                  {/* Price input */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn("text-[0.875rem]", entry.is_free || entry.count === 0 ? "text-white/70" : "text-white/70")}>$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={entry.price}
                      disabled={entry.is_free || entry.count === 0}
                      onChange={(e) => handlePriceChange(i, e.target.value)}
                      placeholder="0.00"
                      className={cn(
                        "w-24 rounded-xl border px-3 py-2 text-[0.875rem] text-right transition-colors focus:outline-none",
                        entry.is_free || entry.count === 0
                          ? "border-white/[0.04] bg-white/[0.02] text-white/70 cursor-not-allowed"
                          : missingPrice
                          ? "border-amber-500/30 bg-amber-500/[0.04] text-amber-400/70 placeholder:text-amber-500/20 focus:border-amber-400/50"
                          : "border-white/10 bg-white/[0.04] text-white/92 placeholder:text-white/70 focus:border-gold/40"
                      )}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Validation hint ── */}
          {entries.some((e) => !e.is_free && e.count > 0 && (!e.price.trim() || parseFloat(e.price) <= 0)) && (
            <p className="text-[0.8rem] text-amber-400/60 bg-amber-500/[0.04] border border-amber-500/15 rounded-xl px-4 py-3">
              Rows with an amber price field will be <strong>skipped</strong> — enter a price or toggle to Free to include them.
            </p>
          )}

          {/* ── Feedback ── */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-[0.8125rem] text-red-400">
              {error}
            </div>
          )}
          {result && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3 text-[0.8125rem] text-emerald-400 flex items-center gap-3">
              <span>
                {result.updated} preset{result.updated !== 1 ? "s" : ""} updated.
              </span>
              {result.skipped > 0 && (
                <span className="text-amber-400/70">
                  {result.skipped} categor{result.skipped !== 1 ? "ies" : "y"} skipped (no price entered).
                </span>
              )}
              <Link href="/store" target="_blank" className="ml-auto text-white/70 hover:text-gold transition-colors text-[0.75rem]">
                View store →
              </Link>
            </div>
          )}

          {/* ── Save button ── */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-[0.8125rem] text-white/70">
              {totalPresets} presets · {entries.filter((e) => e.count > 0).length} categories
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasValidUpdate}
              className={cn(
                "inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[0.875rem] font-semibold transition-all",
                saving || !hasValidUpdate
                  ? "bg-white/[0.06] text-white/70 cursor-not-allowed"
                  : "bg-gold text-black hover:bg-gold/90 active:scale-[0.98]"
              )}
            >
              {saving ? <SpinIcon /> : <SaveIcon />}
              {saving ? "Saving…" : "Apply Prices"}
            </button>
          </div>
        </>
      )}

    </div>
  )
}

/* ── Icons ── */
function SaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  )
}
function SpinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
