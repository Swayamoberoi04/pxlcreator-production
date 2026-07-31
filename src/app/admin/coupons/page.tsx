"use client"

/**
 * /admin/coupons — Coupon management
 *
 * Create, toggle, and delete coupon codes.
 * Supports: percentage off, fixed INR off, fixed USD off.
 */

import { useState, useEffect } from "react"
import { cn }                  from "@/lib/utils"

type DiscountType = "percentage" | "fixed_inr" | "fixed_usd"

interface Coupon {
  id:             string
  code:           string
  discount_type:  DiscountType
  discount_value: number
  min_order_inr:  number | null
  max_uses:       number | null
  used_count:     number
  expires_at:     string | null
  is_active:      boolean
  created_at:     string
}

const EMPTY_FORM = {
  code:           "",
  discount_type:  "percentage" as DiscountType,
  discount_value: "",
  min_order_inr:  "",
  max_uses:       "",
  expires_at:     "",
}

export default function AdminCouponsPage() {
  const [coupons,  setCoupons]  = useState<Coupon[]>([])
  const [loading,  setLoading]  = useState(true)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [acting,   setActing]   = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)

  /* ── Load coupons ── */
  useEffect(() => {
    fetch("/api/admin/coupons")
      .then((r) => r.json())
      .then((j) => setCoupons(j.coupons ?? []))
      .catch(() => setError("Failed to load coupons"))
      .finally(() => setLoading(false))
  }, [])

  /* ── Create coupon ── */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const value = parseFloat(form.discount_value)
    if (!form.code.trim())        { setError("Code is required"); setSaving(false); return }
    if (isNaN(value) || value <= 0) { setError("Enter a valid discount value"); setSaving(false); return }

    try {
      const res  = await fetch("/api/admin/coupons", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          code:           form.code.trim().toUpperCase(),
          discount_type:  form.discount_type,
          discount_value: value,
          min_order_inr:  form.min_order_inr ? parseFloat(form.min_order_inr) : null,
          max_uses:       form.max_uses ? parseInt(form.max_uses) : null,
          expires_at:     form.expires_at || null,
        }),
      })
      const json = await res.json()

      if (!res.ok) { setError(json.error ?? "Failed to create"); return }

      setCoupons((prev) => [json.coupon, ...prev])
      setForm(EMPTY_FORM)
      setSuccess(`Coupon "${json.coupon.code}" created!`)
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  /* ── Toggle active ── */
  async function handleToggle(coupon: Coupon) {
    setActing(coupon.id)
    try {
      const res  = await fetch("/api/admin/coupons", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: coupon.id, is_active: !coupon.is_active }),
      })
      const json = await res.json()
      if (res.ok) {
        setCoupons((prev) => prev.map((c) => c.id === coupon.id ? json.coupon : c))
      }
    } finally {
      setActing(null)
    }
  }

  /* ── Delete coupon ── */
  async function handleDelete(id: string, code: string) {
    if (!confirm(`Delete coupon "${code}"? This cannot be undone.`)) return
    setActing(id)
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => c.id !== id))
      }
    } finally {
      setActing(null)
    }
  }

  /* ── Format discount label ── */
  function formatDiscount(c: Coupon) {
    if (c.discount_type === "percentage") return `${c.discount_value}% off`
    if (c.discount_type === "fixed_inr")  return `₹${c.discount_value} off`
    if (c.discount_type === "fixed_usd")  return `$${c.discount_value} off`
    return ""
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-4xl">

      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-px w-5 bg-gold/50" />
          <span className="text-[0.7rem] text-gold/60 tracking-widest">( PROMOTIONS )</span>
        </div>
        <h1 className="font-display font-bold text-[1.75rem] text-white/90">
          Coupon Codes
        </h1>
        <p className="text-[0.875rem] text-white/70 max-w-lg">
          Create discount codes for your store. Customers enter them at checkout.
        </p>
      </div>

      {/* ── Create form ── */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 flex flex-col gap-5"
      >
        <h2 className="text-[0.9375rem] font-semibold text-white/92">New coupon</h2>

        <div className="grid sm:grid-cols-2 gap-4">

          {/* Code */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.75rem] text-white/70">Code</label>
            <input
              type="text"
              placeholder="e.g. SUMMER20"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.875rem] text-white/92 placeholder:text-white/70 focus:outline-none focus:border-gold/40 transition-colors font-mono tracking-widest"
            />
          </div>

          {/* Discount type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.75rem] text-white/70">Discount type</label>
            <select
              value={form.discount_type}
              onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as DiscountType }))}
              className="rounded-xl border border-white/10 bg-[#111] px-3 py-2 text-[0.875rem] text-white/92 focus:outline-none focus:border-gold/40 transition-colors"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed_inr">Fixed amount (₹ INR)</option>
              <option value="fixed_usd">Fixed amount ($ USD)</option>
            </select>
          </div>

          {/* Discount value */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.75rem] text-white/70">
              {form.discount_type === "percentage" ? "Percentage off" :
               form.discount_type === "fixed_inr"  ? "Amount off (₹)" : "Amount off ($)"}
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              placeholder={form.discount_type === "percentage" ? "e.g. 20" : "e.g. 500"}
              value={form.discount_value}
              onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.875rem] text-white/92 placeholder:text-white/70 focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>

          {/* Min order */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.75rem] text-white/70">Min order (₹) <span className="text-white/70">— optional</span></label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 999"
              value={form.min_order_inr}
              onChange={(e) => setForm((f) => ({ ...f, min_order_inr: e.target.value }))}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.875rem] text-white/92 placeholder:text-white/70 focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>

          {/* Max uses */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.75rem] text-white/70">Max uses <span className="text-white/70">— optional</span></label>
            <input
              type="number"
              min="1"
              placeholder="Unlimited"
              value={form.max_uses}
              onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.875rem] text-white/92 placeholder:text-white/70 focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>

          {/* Expiry */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.75rem] text-white/70">Expires on <span className="text-white/70">— optional</span></label>
            <input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.875rem] text-white/85 focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>

        </div>

        {/* Feedback */}
        {error && (
          <p className="text-[0.8125rem] text-red-400 bg-red-500/[0.06] border border-red-500/15 rounded-xl px-4 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-[0.8125rem] text-emerald-400 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl px-4 py-2">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="self-end inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold text-black text-[0.875rem] font-semibold hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <SpinIcon /> : <PlusIcon />}
          {saving ? "Creating…" : "Create Coupon"}
        </button>
      </form>

      {/* ── Coupon list ── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center">
          <p className="text-[0.875rem] text-white/70">No coupons yet. Create one above.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/[0.06] text-[0.7rem] text-white/70 tracking-widest">
            <span>CODE</span>
            <span className="text-right">DISCOUNT</span>
            <span className="text-right">USES</span>
            <span className="text-right">EXPIRES</span>
            <span />
          </div>

          {coupons.map((coupon, i) => {
            const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date()
            const isExhausted = coupon.max_uses !== null && coupon.used_count >= coupon.max_uses

            return (
              <div
                key={coupon.id}
                className={cn(
                  "grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 transition-colors hover:bg-white/[0.01]",
                  i !== 0 && "border-t border-white/[0.06]",
                  !coupon.is_active && "opacity-50"
                )}
              >
                {/* Code + badges */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[0.875rem] font-semibold text-white/92 tracking-widest">
                    {coupon.code}
                  </span>
                  {coupon.is_active && !isExpired && !isExhausted && (
                    <span className="text-[0.65rem] text-emerald-400/70 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-full px-2 py-px">
                      Active
                    </span>
                  )}
                  {(isExpired || isExhausted) && (
                    <span className="text-[0.65rem] text-white/70 bg-white/[0.04] rounded-full px-2 py-px">
                      {isExpired ? "Expired" : "Exhausted"}
                    </span>
                  )}
                  {!coupon.is_active && !isExpired && !isExhausted && (
                    <span className="text-[0.65rem] text-white/70 bg-white/[0.04] rounded-full px-2 py-px">
                      Paused
                    </span>
                  )}
                  {coupon.min_order_inr && (
                    <span className="text-[0.65rem] text-white/70">min ₹{coupon.min_order_inr}</span>
                  )}
                </div>

                {/* Discount */}
                <span className="text-[0.875rem] font-semibold text-gold/70 text-right whitespace-nowrap">
                  {formatDiscount(coupon)}
                </span>

                {/* Uses */}
                <span className="text-[0.8125rem] text-white/70 text-right whitespace-nowrap">
                  {coupon.used_count}{coupon.max_uses !== null ? `/${coupon.max_uses}` : ""}
                </span>

                {/* Expires */}
                <span className="text-[0.8125rem] text-white/70 text-right whitespace-nowrap">
                  {coupon.expires_at
                    ? new Date(coupon.expires_at).toLocaleDateString()
                    : "—"}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1.5 justify-end">
                  {/* Toggle active */}
                  <button
                    onClick={() => handleToggle(coupon)}
                    disabled={acting === coupon.id}
                    title={coupon.is_active ? "Pause coupon" : "Activate coupon"}
                    className={cn(
                      "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
                      coupon.is_active
                        ? "text-emerald-400/60 hover:bg-emerald-500/10 hover:text-emerald-400"
                        : "text-white/70 hover:bg-white/[0.06] hover:text-white/85"
                    )}
                  >
                    {acting === coupon.id ? <SpinIcon /> : coupon.is_active ? <PauseIcon /> : <PlayIcon />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(coupon.id, coupon.code)}
                    disabled={acting === coupon.id}
                    title="Delete coupon"
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-white/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}

/* ── Icons ── */
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
}
function SpinIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
}
function PauseIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
}
function PlayIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
}
