"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Script from "next/script"
import { useCartStore, selectTotal, selectItemCount } from "@/store/cart"
import { useCurrencyStore }                           from "@/store/currency"
import { Container }                                  from "@/components/layout/Container"
import { formatPrice, toInr }                         from "@/lib/currency/format"
import { cn }                                         from "@/lib/utils"
import type { DownloadTokenResult, CouponValidationResult } from "@/types/commerce"
import { useAuth }                                    from "@/contexts/AuthContext"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

/* Razorpay checkout.js type declaration */
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}
interface RazorpayOptions {
  key:          string
  amount:       number
  currency:     string
  order_id:     string
  name:         string
  description:  string
  prefill?:     { email?: string; name?: string }
  theme?:       { color?: string }
  handler:      (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void
  modal?:       { ondismiss?: () => void }
}
interface RazorpayInstance { open(): void }

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface FormState {
  email: string
  name:  string
}

const EMPTY_FORM: FormState = { email: "", name: "" }
type CheckoutStep = "form" | "processing" | "verifying" | "success"

/* ─────────────────────────────────────────
   Root component
───────────────────────────────────────── */
export function CheckoutClient() {
  const items     = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const total     = useCartStore(selectTotal)
  const itemCount = useCartStore(selectItemCount)
  const currency  = useCurrencyStore((s) => s.currency)
  const { user }  = useAuth()

  const [form, setForm]         = useState<FormState>(EMPTY_FORM)
  const [step, setStep]         = useState<CheckoutStep>("form")
  const [errors, setErrors]     = useState<Partial<FormState>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  /* ── Coupon state ── */
  const [couponCode,   setCouponCode]   = useState("")
  const [couponStatus, setCouponStatus] = useState<"idle" | "loading" | "applied" | "error">("idle")
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null)
  const [couponError,  setCouponError]  = useState("")

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHydrated(true), [])

  /* Pre-fill form from Firebase user */
  useEffect(() => {
    if (user && !form.email) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        email: user.email ?? "",
        name:  user.displayName ?? "",
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  /* ── Validation ── */
  function validate(): boolean {
    const errs: Partial<FormState> = {}
    if (!form.email.trim() || !form.email.includes("@"))
      errs.email = "Enter a valid email address"
    if (!form.name.trim())
      errs.name = "Full name is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  /* ── Coupon: validate code against current subtotal ── */
  async function handleCouponApply() {
    const code = couponCode.trim().toUpperCase()
    if (!code) return
    setCouponStatus("loading")
    setCouponError("")

    try {
      const res  = await fetch("/api/checkout/validate-coupon", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal_inr: toInr(total) }),
      })
      const data = await res.json()

      if (res.ok && data.valid) {
        setCouponResult(data as CouponValidationResult)
        setCouponStatus("applied")
      } else {
        setCouponError(data.error ?? "Invalid coupon code.")
        setCouponStatus("error")
        setCouponResult(null)
      }
    } catch {
      setCouponError("Could not validate coupon. Please try again.")
      setCouponStatus("error")
    }
  }

  function handleCouponRemove() {
    setCouponCode("")
    setCouponResult(null)
    setCouponStatus("idle")
    setCouponError("")
  }

  /* ── Main Razorpay payment flow ── */
  const handlePayment = useCallback(async () => {
    if (!validate()) return
    setApiError(null)
    setStep("processing")

    try {
      /* Step A: Create Razorpay order on our server */
      const createRes = await fetch("/api/checkout/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            preset_id: i.preset.id,
            quantity:  i.quantity,
          })),
          email:        form.email.toLowerCase().trim(),
          name:         form.name.trim(),
          firebase_uid: user?.uid ?? undefined,
          coupon_code:  couponResult?.code ?? undefined,
        }),
      })

      const createData = await createRes.json()
      if (!createRes.ok) {
        setApiError(createData.error ?? "Failed to initiate checkout")
        setStep("form")
        return
      }

      const { razorpay_order_id, amount_paise, key_id, our_order_id } = createData

      /* Step B: Open Razorpay modal */
      if (!window.Razorpay) {
        setApiError("Payment SDK failed to load. Please refresh and try again.")
        setStep("form")
        return
      }

      const rzp = new window.Razorpay({
        key:         key_id,
        amount:      amount_paise,
        currency:    "INR",
        order_id:    razorpay_order_id,
        name:        "PXL Creator",
        description: `${itemCount} preset${itemCount > 1 ? "s" : ""}`,
        prefill:     { email: form.email, name: form.name },
        theme:       { color: "#FFD60A" },

        handler: async (response) => {
          /* Step C: Verify payment on our server */
          setStep("verifying")
          try {
            const verifyRes = await fetch("/api/checkout/verify-payment", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_signature:  response.razorpay_signature,
                our_order_id,
              }),
            })

            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) {
              setApiError(verifyData.error ?? "Payment verification failed. Contact support.")
              setStep("form")
              return
            }

            /* Step D: Store tokens in sessionStorage, clear cart, go to success */
            sessionStorage.setItem(
              "pxl_checkout_success",
              JSON.stringify({
                order_id: verifyData.order_id,
                items:    verifyData.items as DownloadTokenResult[],
                email:    form.email,
              })
            )
            clearCart()
            window.location.href = `/checkout/success?order_id=${verifyData.order_id}`
          } catch {
            setApiError("Network error during verification. Contact support if charged.")
            setStep("form")
          }
        },

        modal: {
          ondismiss: () => {
            /* User closed modal — go back to form */
            setStep("form")
          },
        },
      })

      rzp.open()
    } catch {
      setApiError("Unexpected error. Please try again.")
      setStep("form")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, form, user, clearCart, itemCount, couponResult])

  /* ── Empty cart ── */
  if (hydrated && items.length === 0 && step !== "verifying") {
    return (
      <div className="relative w-full bg-background overflow-hidden min-h-[70vh] flex items-center justify-center">
        <LuminousEnvironment variant="gold" intensity={0.5} />
        <GrainOverlay opacity={0.013} zIndex={1} />
        <div className="relative z-10 flex flex-col items-center gap-5 text-center px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface border border-border text-muted">
            <BagIcon />
          </div>
          <div>
            <p className="font-semibold text-foreground text-lg">Your cart is empty</p>
            <p className="text-small text-muted mt-1">Add some presets before checking out.</p>
          </div>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-background hover:bg-gold-dim transition-colors"
          >
            Browse Store
          </Link>
        </div>
      </div>
    )
  }

  /* ── Processing / verifying overlay ── */
  if (step === "processing" || step === "verifying") {
    const msg = step === "verifying" ? "Verifying payment…" : "Preparing secure checkout…"
    return (
      <div className="relative w-full bg-background overflow-hidden min-h-[70vh] flex items-center justify-center">
        <LuminousEnvironment variant="gold" intensity={0.8} />
        <GrainOverlay opacity={0.013} animated zIndex={1} />
        <div className="relative z-10 flex flex-col items-center gap-5 text-center px-6">
          <div className="h-12 w-12 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
          <p className="font-medium text-foreground">{msg}</p>
          <p className="text-small text-muted">Please don&apos;t close this tab.</p>
        </div>
      </div>
    )
  }

  /* ─────────────────────────────────────────
     Main checkout layout
  ───────────────────────────────────────── */
  return (
    <>
      {/* Load Razorpay checkout.js */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onReady={() => setScriptReady(true)}
        strategy="afterInteractive"
      />

      <div className="relative w-full bg-background overflow-hidden">
        <LuminousEnvironment variant="gold" intensity={0.55} />
        <GrainOverlay opacity={0.013} zIndex={1} />
        <Container size="wide" className="relative z-10 py-10 sm:py-14">

          {/* ── Page header ── */}
          <div className="mb-10 flex items-center gap-4">
            <Link
              href="/store"
              className="flex items-center gap-1.5 text-small text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeftIcon />
              Back to store
            </Link>
            <span className="text-border" aria-hidden="true">|</span>
            <h1 className="font-display font-bold text-xl text-foreground">Checkout</h1>
          </div>

          {/* ── API error banner ── */}
          {apiError && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <AlertIcon />
              <p className="text-small text-red-400 leading-relaxed">{apiError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 xl:gap-12 items-start">

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                LEFT — Contact form
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            <div className="flex flex-col gap-6">

              <FormSection title="Contact Information" step={1}>
                <Field
                  label="Email address"
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  error={errors.email}
                  onChange={(v) => { setForm((p) => ({ ...p, email: v })); if (errors.email) setErrors((p) => ({ ...p, email: "" })) }}
                  autoComplete="email"
                />
                <Field
                  label="Full name"
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={form.name}
                  error={errors.name}
                  onChange={(v) => { setForm((p) => ({ ...p, name: v })); if (errors.name) setErrors((p) => ({ ...p, name: "" })) }}
                  autoComplete="name"
                />
              </FormSection>

              {/* ── Coupon code ── */}
              <div className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TagIcon size={15} className="text-muted" />
                  <span className="text-sm font-semibold text-foreground">Have a coupon?</span>
                </div>

                {couponStatus === "applied" && couponResult ? (
                  /* Applied state */
                  <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-emerald-400">{couponResult.code} applied!</p>
                      <p className="text-xs text-muted mt-0.5">
                        You save ₹{couponResult.discount_amount_inr.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCouponRemove}
                      className="text-xs text-muted hover:text-red-400 transition-colors underline underline-offset-2"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  /* Input state */
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase())
                          if (couponStatus === "error") setCouponStatus("idle")
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleCouponApply() } }}
                        placeholder="Enter coupon code"
                        disabled={couponStatus === "loading"}
                        className={cn(
                          "flex-1 rounded-lg border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted",
                          "outline-none transition-colors duration-150",
                          "focus:border-gold/60 focus:ring-2 focus:ring-gold/20",
                          couponStatus === "error" ? "border-red-500/50" : "border-border"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => void handleCouponApply()}
                        disabled={!couponCode.trim() || couponStatus === "loading"}
                        className={cn(
                          "rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          !couponCode.trim() || couponStatus === "loading"
                            ? "bg-surface-2 text-muted cursor-not-allowed border border-border"
                            : "bg-gold/15 text-gold hover:bg-gold/25 border border-gold/30"
                        )}
                      >
                        {couponStatus === "loading" ? (
                          <span className="flex items-center gap-1.5">
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
                            Checking…
                          </span>
                        ) : "Apply"}
                      </button>
                    </div>
                    {couponStatus === "error" && couponError && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <ErrorDotIcon />{couponError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Payment info notice */}
              <FormSection title="Payment" step={2}>
                <div className="flex items-start gap-3 rounded-xl bg-gold/5 border border-gold/15 px-4 py-4">
                  <LockIcon className="shrink-0 mt-0.5 text-gold" size={16} />
                  <div>
                    <p className="text-sm font-medium text-foreground">Secure checkout via Razorpay</p>
                    <p className="text-small text-muted mt-0.5 leading-relaxed">
                      Pay with UPI, Net Banking, Debit/Credit card, or Wallets.
                      You&apos;ll be redirected to Razorpay&apos;s secure payment modal.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["UPI", "Debit Card", "Credit Card", "Net Banking", "Wallets"].map((m) => (
                    <span key={m} className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
                      {m}
                    </span>
                  ))}
                </div>
              </FormSection>

            </div>

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                RIGHT — Order summary
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-24">

              <div className="rounded-2xl border border-border bg-surface overflow-hidden">

                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-semibold text-foreground text-sm">Order Summary</h2>
                  <span className="text-small text-muted">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
                </div>

                <ul className="divide-y divide-border">
                  {items.map(({ preset, quantity }) => (
                    <li key={preset.id} className="flex items-center gap-3 px-5 py-4">
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-surface-2 border border-border flex items-center justify-center">
                        <span className="text-[9px] font-bold text-muted text-center leading-tight px-1">
                          {preset.category.split(" ")[0].slice(0, 3).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                        <p className="text-sm font-medium text-foreground truncate">{preset.name}</p>
                        <p className="text-small text-muted">{preset.category}</p>
                      </div>
                      <span className="font-display font-bold text-sm text-gold shrink-0">
                        {formatPrice(preset.price * quantity, currency)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="px-5 py-4 border-t border-border flex flex-col gap-2.5">
                  <div className="flex justify-between text-small">
                    <span className="text-muted">Subtotal</span>
                    <span className="text-foreground">{formatPrice(total, currency)}</span>
                  </div>
                  {couponResult && (
                    <div className="flex justify-between text-small">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <TagIcon size={11} className="text-emerald-400" />
                        {couponResult.code}
                      </span>
                      <span className="text-emerald-400 font-medium">
                        −₹{couponResult.discount_amount_inr.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-small">
                    <span className="text-muted">Delivery</span>
                    <span className="text-gold font-medium">Free</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2.5 mt-1">
                    <span className="font-semibold text-foreground">Total</span>
                    <div className="text-right">
                      <div className="font-display font-bold text-xl text-gold">
                        ₹{(couponResult ? couponResult.final_total_inr : toInr(total)).toLocaleString("en-IN")}
                      </div>
                      {couponResult && (
                        <div className="text-xs text-muted line-through">
                          ₹{toInr(total).toLocaleString("en-IN")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* ── Pay button ── */}
              <button
                type="button"
                onClick={handlePayment}
                disabled={!scriptReady || step !== "form"}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !scriptReady || step !== "form"
                    ? "bg-gold/60 text-background/70 cursor-not-allowed"
                    : "bg-gold text-background hover:bg-gold-dim active:scale-[0.98]"
                )}
              >
                <LockIcon size={16} />
                Pay ₹{(couponResult ? couponResult.final_total_inr : toInr(total)).toLocaleString("en-IN")} securely
              </button>

              {!scriptReady && (
                <p className="text-center text-xs text-muted animate-pulse">Loading payment SDK…</p>
              )}

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
                {["SSL Secure", "Razorpay Powered", "Instant Download"].map((t) => (
                  <div key={t} className="flex items-center gap-1">
                    <CheckSmallIcon />
                    <span className="text-small text-muted">{t}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </Container>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */
function FormSection({ title, step, children }: { title: string; step: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-background text-xs font-bold">{step}</span>
        <h2 className="font-display font-bold text-base text-foreground">{title}</h2>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

interface FieldProps {
  label: string; id: string; type: string; placeholder: string
  value: string; error?: string; onChange: (v: string) => void
  autoComplete?: string
}

function Field({ label, id, type, placeholder, value, error, onChange, autoComplete }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-medium text-foreground">{label}</label>
      <input
        id={id} type={type} placeholder={placeholder} value={value}
        autoComplete={autoComplete} aria-invalid={!!error}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-lg border bg-surface-2 px-4 py-3 text-sm text-foreground placeholder:text-muted",
          "transition-colors duration-150 outline-none",
          "focus:border-gold/60 focus:ring-2 focus:ring-gold/20",
          error ? "border-destructive/60" : "border-border"
        )}
      />
      {error && <p role="alert" className="text-small text-red-400 flex items-center gap-1"><ErrorDotIcon />{error}</p>}
    </div>
  )
}

/* ─────────────────────────────────────────
   Icons
───────────────────────────────────────── */
function ArrowLeftIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
}
function BagIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
}
function LockIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
}
function CheckSmallIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}
function AlertIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
}
function ErrorDotIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="#ef4444" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg>
}
function TagIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
}

