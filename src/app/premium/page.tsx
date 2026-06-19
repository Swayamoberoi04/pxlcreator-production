"use client"

/**
 * src/app/premium/page.tsx
 *
 * Full client component — handles:
 *   • Billing cycle toggle (monthly ↔ yearly)
 *   • Auth gate (redirect to login if not signed in)
 *   • Razorpay subscription payment flow
 *   • Already-subscribed state detection
 *   • Loading / processing / verifying states
 *
 * Payment flow:
 *   1. Click plan CTA
 *   2. POST /api/subscriptions/create-order → get Razorpay order
 *   3. Open Razorpay modal
 *   4. On success → POST /api/subscriptions/verify-payment
 *   5. Redirect to /premium/success
 */

import { useState, useEffect, useCallback } from "react"
import { useRouter }    from "next/navigation"
import Link             from "next/link"
import Script           from "next/script"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth }      from "@/contexts/AuthContext"
import { Container }    from "@/components/layout/Container"
import { PLAN_LIST, yearlySavingsUsd, yearlySavingsPct } from "@/lib/subscriptions/plans"
import type { Plan, BillingCycle } from "@/lib/subscriptions/plans"
import { cn }           from "@/lib/utils"
import { LuminousEnvironment }  from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }         from "@/components/ui/GrainOverlay"
import { CinematicBackground }  from "@/components/ui/CinematicBackground"
import { CinematicReveal, CinematicStagger, CinematicItem } from "@/components/ui/CinematicReveal"

/* ── Razorpay type declarations ── */
declare global {
  interface Window {
    Razorpay: new (opts: RazorpayOptions) => RazorpayInstance
  }
}
interface RazorpayOptions {
  key: string; amount: number; currency: string; order_id: string
  name: string; description: string; prefill?: { email?: string; name?: string }
  theme?: { color?: string }
  handler: (r: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void
  modal?: { ondismiss?: () => void }
}
interface RazorpayInstance { open(): void }

/* ── Subscription status shape ── */
interface SubStatus {
  plan_id:            string | null
  current_period_end: string | null
}

/* ── Free plan row ── */
const FREE_FEATURES = [
  { label: "Browse all preset packs",          included: true  },
  { label: "Read all blog articles",            included: true  },
  { label: "Purchase individual presets",       included: true  },
  { label: "Access free course previews",       included: true  },
  { label: "All preset packs — unlimited",      included: false },
  { label: "Full course library",               included: false },
  { label: "Early access to new drops",         included: false },
  { label: "Monthly 1:1 feedback session",      included: false },
  { label: "Custom preset requests",            included: false },
]

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function PremiumPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [cycle,        setCycle]        = useState<BillingCycle>("monthly")
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [processing,   setProcessing]   = useState<string | null>(null)   // plan id being processed
  const [verifying,    setVerifying]    = useState(false)
  const [apiError,     setApiError]     = useState<string | null>(null)
  const [scriptReady,  setScriptReady]  = useState(false)
  const [subStatus,    setSubStatus]    = useState<SubStatus | null>(null)
  const [statusLoaded, setStatusLoaded] = useState(false)

  /* Fetch current subscription status — requires Firebase ID token in header */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!user) { setStatusLoaded(true); return }
    let cancelled = false

    user.getIdToken().then((token) =>
      fetch("/api/subscriptions/status", {
        headers: { Authorization: `Bearer ${token}` },
      })
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.subscription) {
          setSubStatus({
            plan_id:            data.subscription.plan_id,
            current_period_end: data.subscription.current_period_end,
          })
          setActivePlanId(data.subscription.plan_id)
        }
      })
      .catch(() => null)
      .finally(() => { if (!cancelled) setStatusLoaded(true) })

    return () => { cancelled = true }
  }, [user])

  /* ── Payment handler ── */
  const handlePlanClick = useCallback(async (plan: Plan) => {
    setApiError(null)

    /* Auth gate */
    if (!user) {
      router.push(`/login?from=/premium`)
      return
    }

    /* Already on this plan? */
    if (activePlanId === plan.id) return

    setProcessing(plan.id)

    try {
      /* Step A: Create Razorpay order on server */
      const createRes = await fetch("/api/subscriptions/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id:      plan.id,
          billing_cycle: cycle,
          firebase_uid: user.uid,
          email:        user.email  ?? "",
          name:         user.displayName ?? "",
        }),
      })
      const createData = await createRes.json()

      if (!createRes.ok) {
        setApiError(createData.error ?? "Failed to initiate checkout")
        setProcessing(null)
        return
      }

      const { razorpay_order_id, amount_paise, key_id, payment_id } = createData

      /* Step B: Open Razorpay modal */
      if (!window.Razorpay) {
        setApiError("Payment SDK failed to load. Please refresh and try again.")
        setProcessing(null)
        return
      }

      const rzp = new window.Razorpay({
        key:         key_id,
        amount:      amount_paise,
        currency:    "INR",
        order_id:    razorpay_order_id,
        name:        "PXL Creator",
        description: `${plan.name} — ${cycle === "yearly" ? "Annual" : "Monthly"} Plan`,
        prefill:     { email: user.email ?? "", name: user.displayName ?? "" },
        theme:       { color: "#C9A84C" },

        handler: async (response) => {
          /* Step C: Verify payment on our server */
          setProcessing(null)
          setVerifying(true)
          try {
            const verifyRes = await fetch("/api/subscriptions/verify-payment", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_signature:  response.razorpay_signature,
                payment_id,
              }),
            })

            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) {
              setApiError(verifyData.error ?? "Payment verification failed. Contact support.")
              setVerifying(false)
              return
            }

            /* Step D: Redirect to success */
            router.push(
              `/premium/success?plan=${verifyData.plan_id}&cycle=${verifyData.billing_cycle}&until=${encodeURIComponent(verifyData.current_period_end)}`
            )
          } catch {
            setApiError("Network error during verification. Contact support if charged.")
            setVerifying(false)
          }
        },

        modal: {
          ondismiss: () => {
            setProcessing(null)
          },
        },
      })

      rzp.open()
    } catch {
      setApiError("Unexpected error. Please try again.")
      setProcessing(null)
    }
  }, [user, cycle, activePlanId, router])

  /* ── Processing overlay ── */
  if (verifying) {
    return (
      <div className="w-full bg-background min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-5 text-center px-6">
          <div className="h-12 w-12 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
          <p className="font-semibold text-foreground text-lg">Activating your plan…</p>
          <p className="text-small text-muted">Please don&apos;t close this tab.</p>
        </div>
      </div>
    )
  }

  /* ─────────────────────────────────────────
     Main layout
  ───────────────────────────────────────── */
  return (
    <div className="w-full bg-background">

      {/* Load Razorpay SDK */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onReady={() => setScriptReady(true)}
        strategy="afterInteractive"
      />

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden border-b border-border depth-section">
        {/* Living luminous atmosphere */}
        <LuminousEnvironment variant="gold" intensity={1.1} />
        <CinematicBackground variant="dark" />
        <GrainOverlay opacity={0.019} animated zIndex={2} />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent z-[3]" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent z-[3]" />

        <Container className="relative z-10 py-20 sm:py-28 text-center">
          <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">

            <CinematicReveal variant="rise">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.07] px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" aria-hidden="true" />
                <span className="text-label text-gold tracking-widest animate-gold-flicker">PXL Premium</span>
              </div>
            </CinematicReveal>

            <CinematicReveal variant="depth" delay={0.07}>
              <h1 className="font-display font-black text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] text-foreground tracking-tight">
                One Membership.{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, #C9A84C 0%, #A8893A 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Everything Included.
                </span>
              </h1>
            </CinematicReveal>

            <CinematicReveal variant="rise" delay={0.14}>
              <p className="text-[1.0625rem] text-muted/65 max-w-lg leading-relaxed">
                Every preset pack. Every course. Early access to new drops.
                All for less than the price of one individual pack per month.
              </p>
            </CinematicReveal>

            <CinematicReveal variant="rise" delay={0.2}>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                <a
                  href="#plans"
                  className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 text-base font-semibold text-background hover:bg-gold-dim transition-colors shadow-[0_0_40px_rgba(201,168,76,0.22)]"
                >
                  View Plans
                </a>
                <Link
                  href="/store"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-7 py-3.5 text-base font-medium text-muted hover:text-foreground hover:border-border/60 transition-colors"
                >
                  Browse Free First
                </Link>
              </div>
            </CinematicReveal>

            {/* Trust strip */}
            <CinematicStagger stagger={0.07} baseDelay={0.26} itemVariant="rise" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-2">
              {["30-day money-back guarantee", "Cancel anytime", "Instant access"].map((t) => (
                <CinematicItem key={t} variant="rise">
                  <div className="flex items-center gap-1.5">
                    <CheckSmall />
                    <span className="text-[0.8125rem] text-muted/60">{t}</span>
                  </div>
                </CinematicItem>
              ))}
            </CinematicStagger>
          </div>
        </Container>
      </section>

      {/* ══════════════════════════════════════
          PERKS GRID
      ══════════════════════════════════════ */}
      <section className="relative w-full border-b border-border py-16 sm:py-20">
        <LuminousEnvironment variant="gold" intensity={0.5} />
        <Container className="relative z-10">
          <CinematicStagger stagger={0.1} baseDelay={0.04} itemVariant="depth" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PERKS.map((perk) => (
              <CinematicItem key={perk.title} variant="depth">
                <div className="depth-card flex flex-col gap-4 rounded-2xl border border-border/60 bg-surface/80 backdrop-blur-sm p-6 hover:border-gold/25 transition-colors duration-300 h-full">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
                    {perk.icon}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className="font-display font-bold text-sm text-foreground">{perk.title}</p>
                    <p className="text-[0.8125rem] text-muted/65 leading-relaxed">{perk.body}</p>
                  </div>
                </div>
              </CinematicItem>
            ))}
          </CinematicStagger>
        </Container>
      </section>

      {/* ══════════════════════════════════════
          PRICING
      ══════════════════════════════════════ */}
      <section id="plans" className="w-full py-20 sm:py-28 scroll-mt-16">
        <Container>

          {/* Section header */}
          <div className="flex flex-col items-center text-center gap-5 mb-12">
            <div className="flex items-center gap-2.5">
              <span className="h-px w-6 bg-gold/60" />
              <span className="text-[0.7rem] font-bold tracking-[0.2em] uppercase text-gold/70">Pricing</span>
              <span className="h-px w-6 bg-gold/60" />
            </div>
            <h2 className="font-display font-black text-[clamp(1.75rem,4vw,2.75rem)] text-foreground tracking-tight">
              Simple, Honest Pricing
            </h2>
            <p className="text-[1rem] text-muted/65 max-w-md">
              No hidden fees. Cancel anytime. 30-day money-back guarantee.
            </p>

            {/* Billing toggle */}
            <div className="flex items-center gap-1 p-1 rounded-full border border-border bg-surface mt-2">
              {(["monthly", "yearly"] as BillingCycle[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c)}
                  className={cn(
                    "relative px-5 py-2 rounded-full text-[0.8125rem] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    cycle === c
                      ? "bg-gold text-background shadow-[0_0_16px_rgba(201,168,76,0.25)]"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  {c === "monthly" ? "Monthly" : "Yearly"}
                  {c === "yearly" && (
                    <span className={cn(
                      "absolute -top-2.5 -right-1 text-[0.6rem] font-black px-1.5 py-0.5 rounded-full",
                      cycle === "yearly"
                        ? "bg-emerald-500 text-white"
                        : "bg-emerald-500/20 text-emerald-400"
                    )}>
                      SAVE
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* API error banner */}
          {apiError && (
            <div className="max-w-[900px] mx-auto mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <AlertCircle className="shrink-0 mt-0.5 text-red-400" />
              <p className="text-[0.8125rem] text-red-400 leading-relaxed">{apiError}</p>
            </div>
          )}

          {/* Already subscribed banner */}
          {subStatus?.plan_id && statusLoaded && (
            <div className="max-w-[900px] mx-auto mb-6 flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/[0.05] px-4 py-3.5">
              <ShieldCheck className="shrink-0 text-gold" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  You&apos;re on the <span className="text-gold capitalize">{subStatus.plan_id}</span> plan
                </p>
                {subStatus.current_period_end && (
                  <p className="text-[0.8125rem] text-muted/70 mt-0.5">
                    Active until{" "}
                    {new Date(subStatus.current_period_end).toLocaleDateString("en-US", {
                      month: "long", day: "numeric", year: "numeric",
                    })}
                    {" · "}
                    <Link href="/account/billing" className="text-gold hover:underline underline-offset-4">
                      Manage billing →
                    </Link>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Plans grid — staggered entrance */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[960px] mx-auto items-stretch"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-20px" }}
            variants={{
              hidden:  {},
              visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
            }}
          >
            {/* ── Free card ── */}
            <motion.div
              variants={{
                hidden:  { opacity: 0, y: 28 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              <FreePlanCard />
            </motion.div>

            {/* ── Paid plans ── */}
            {PLAN_LIST.map((plan) => (
              <motion.div
                key={plan.id}
                variants={{
                  hidden:  { opacity: 0, y: 28 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
                }}
              >
                <PaidPlanCard
                  plan={plan}
                  cycle={cycle}
                  isCurrentPlan={activePlanId === plan.id}
                  isProcessing={processing === plan.id}
                  scriptReady={scriptReady}
                  authLoading={authLoading || !statusLoaded}
                  isLoggedIn={!!user}
                  onClick={() => handlePlanClick(plan)}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Comparison note */}
          {cycle === "yearly" && (
            <p className="text-center text-[0.8125rem] text-muted/50 mt-8">
              Annual plan — charged as a single payment · Access for 365 days
            </p>
          )}

        </Container>
      </section>

      {/* ══════════════════════════════════════
          COMPARISON TABLE
      ══════════════════════════════════════ */}
      <FeatureComparisonTable />

      {/* ══════════════════════════════════════
          FAQ
      ══════════════════════════════════════ */}
      <section className="w-full border-t border-border py-20 sm:py-24">
        <Container size="narrow">
          <div className="flex flex-col items-center text-center gap-4 mb-10">
            <div className="flex items-center gap-2.5">
              <span className="h-px w-6 bg-gold/60" />
              <span className="text-[0.7rem] font-bold tracking-[0.2em] uppercase text-gold/70">FAQ</span>
              <span className="h-px w-6 bg-gold/60" />
            </div>
            <h2 className="font-display font-black text-[clamp(1.5rem,3vw,2.25rem)] text-foreground">
              Common Questions
            </h2>
          </div>

          <div className="flex flex-col divide-y divide-border">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </Container>
      </section>

      {/* ══════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden py-20 sm:py-28 border-t border-border depth-section">
        <LuminousEnvironment variant="gold" intensity={1.0} />
        <CinematicBackground variant="dark" />
        <GrainOverlay opacity={0.018} animated zIndex={2} />

        <Container className="relative z-10 text-center">
          <CinematicReveal variant="depth">
            <div className="flex flex-col items-center gap-6 max-w-xl mx-auto">
              <h2 className="font-display font-black text-[clamp(1.75rem,4vw,2.75rem)] text-foreground tracking-tight">
                Start Creating at a{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, #C9A84C 0%, #A8893A 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Higher Level
                </span>
              </h2>
              <p className="text-[1rem] text-muted/65 leading-relaxed">
                Upgrade your editing workflow with PXL Premium — every preset,
                every course, in one plan.
              </p>
              <a
                href="#plans"
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-8 py-4 text-base font-semibold text-background hover:bg-gold-dim transition-colors shadow-[0_0_48px_rgba(201,168,76,0.28)]"
              >
                Get Premium Access
              </a>
              <p className="text-[0.8125rem] text-muted/50">
                30-day money-back guarantee · Cancel anytime · Instant access
              </p>
            </div>
          </CinematicReveal>
        </Container>
      </section>

    </div>
  )
}

/* ─────────────────────────────────────────
   Free plan card
───────────────────────────────────────── */
function FreePlanCard() {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="flex flex-col gap-5 p-7 flex-1">

        <div className="flex flex-col gap-1.5">
          <p className="text-[0.7rem] font-bold tracking-[0.15em] uppercase text-muted/50">Free</p>
          <div className="flex items-baseline gap-1">
            <span className="font-display font-black text-[2.5rem] leading-none text-foreground">Free</span>
          </div>
          <p className="text-[0.8125rem] text-muted/60 mt-0.5">Explore PXL Creator at no cost.</p>
        </div>

        <Link
          href="/store"
          className="flex w-full items-center justify-center rounded-xl border border-border py-3 text-sm font-semibold text-muted hover:text-foreground hover:border-gold/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Browse Store
        </Link>

        <ul className="flex flex-col gap-2.5" role="list">
          {FREE_FEATURES.map((f) => (
            <li key={f.label} className="flex items-center gap-2.5">
              {f.included
                ? <span className="shrink-0 text-gold/80"><CheckIcon /></span>
                : <span className="shrink-0 text-muted/25"><CrossIcon /></span>}
              <span className={cn(
                "text-[0.8125rem]",
                f.included ? "text-foreground/80" : "text-muted/35"
              )}>
                {f.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Paid plan card
───────────────────────────────────────── */
interface PaidPlanCardProps {
  plan:          Plan
  cycle:         BillingCycle
  isCurrentPlan: boolean
  isProcessing:  boolean
  scriptReady:   boolean
  authLoading:   boolean
  isLoggedIn:    boolean
  onClick:       () => void
}

function PaidPlanCard({
  plan, cycle, isCurrentPlan, isProcessing, scriptReady, authLoading, isLoggedIn, onClick,
}: PaidPlanCardProps) {
  const pricing  = plan[cycle]
  const savings  = yearlySavingsUsd(plan)
  const savePct  = yearlySavingsPct(plan)
  const disabled = isProcessing || authLoading || isCurrentPlan || !scriptReady

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300",
        plan.featured
          ? "border-gold/40 bg-surface shadow-[0_0_80px_rgba(201,168,76,0.08)] md:scale-[1.02]"
          : "border-border bg-surface hover:border-gold/20"
      )}
    >
      {/* Gold top line on featured */}
      {plan.featured && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      )}

      {/* Badge */}
      {plan.badge && (
        <div className="flex justify-center pt-4">
          <span className="text-[0.65rem] font-black tracking-widest uppercase bg-gold text-background rounded-full px-3 py-1">
            {plan.badge}
          </span>
        </div>
      )}
      {isCurrentPlan && (
        <div className="flex justify-center pt-4">
          <span className="text-[0.65rem] font-black tracking-widest uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full px-3 py-1">
            Active Plan
          </span>
        </div>
      )}

      <div className="flex flex-col gap-5 p-7 flex-1">

        {/* Plan + price */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[0.7rem] font-bold tracking-[0.15em] uppercase text-muted/50">{plan.name}</p>
          <div className="flex items-end gap-1.5">
            <span className={cn(
              "font-display font-black text-[2.5rem] leading-none",
              plan.featured ? "text-gold" : "text-foreground"
            )}>
              ${pricing.usd}
            </span>
            <span className="text-[0.8125rem] text-muted/60 mb-1.5">
              / {cycle === "yearly" ? "year" : "month"}
            </span>
          </div>
          {cycle === "yearly" ? (
            <p className="text-[0.8125rem] text-emerald-400 font-medium">
              Save ${savings} vs monthly · {savePct}% off
            </p>
          ) : (
            <p className="text-[0.8125rem] text-muted/50">
              or ₹{pricing.inr.toLocaleString("en-IN")}/{cycle === "monthly" ? "mo" : "yr"}
            </p>
          )}
          <p className="text-[0.8125rem] text-muted/60 mt-0.5">{plan.tagline}</p>
        </div>

        {/* CTA button */}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isCurrentPlan
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 cursor-default"
              : disabled
                ? "bg-gold/50 text-background/70 cursor-not-allowed"
                : plan.featured
                  ? "bg-gold text-background hover:bg-gold-dim active:scale-[0.98] shadow-[0_0_24px_rgba(201,168,76,0.20)]"
                  : "border border-border text-foreground hover:border-gold/40 hover:bg-surface-2 active:scale-[0.98]"
          )}
        >
          {isProcessing ? (
            <>
              <div className="h-3.5 w-3.5 rounded-full border-2 border-background/40 border-t-background animate-spin" />
              Processing…
            </>
          ) : isCurrentPlan ? (
            <>
              <ShieldCheck className="text-emerald-400" size={14} />
              Current Plan
            </>
          ) : !isLoggedIn ? (
            "Sign in to Subscribe"
          ) : (
            plan.cta
          )}
        </button>

        {/* Payment methods row */}
        {!isCurrentPlan && (
          <div className="flex flex-wrap gap-1.5 -mt-1">
            {["UPI", "Card", "Net Banking", "Wallets"].map((m) => (
              <span key={m} className="rounded-md border border-border/60 bg-surface-2/50 px-2 py-0.5 text-[0.65rem] font-medium text-muted/50">
                {m}
              </span>
            ))}
          </div>
        )}

        {/* Features */}
        <ul className="flex flex-col gap-2.5" role="list">
          {plan.features.map((feat) => (
            <li key={feat.label} className="flex items-start gap-2.5">
              {feat.included ? (
                <span className={cn(
                  "shrink-0 mt-0.5",
                  feat.highlight ? "text-gold" : "text-gold/70"
                )}>
                  <CheckIcon />
                </span>
              ) : (
                <span className="shrink-0 mt-0.5 text-muted/25"><CrossIcon /></span>
              )}
              <span className={cn(
                "text-[0.8125rem] leading-snug",
                feat.included
                  ? feat.highlight ? "text-foreground font-medium" : "text-foreground/80"
                  : "text-muted/35"
              )}>
                {feat.label}
              </span>
            </li>
          ))}
        </ul>

      </div>

      {/* Yearly savings callout */}
      {cycle === "monthly" && (
        <div className="mx-7 mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] px-3.5 py-2.5">
          <TrendingUpIcon />
          <p className="text-[0.75rem] text-emerald-400/80">
            Switch to yearly — save <strong className="text-emerald-400">${savings}</strong>
          </p>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   Feature comparison table
───────────────────────────────────────── */
const COMPARISON_ROWS = [
  { feature: "Browse preset packs",      free: true,  creator: true,  pro: true  },
  { feature: "Blog & editorial content", free: true,  creator: true,  pro: true  },
  { feature: "Individual preset purchases", free: true, creator: true, pro: true },
  { feature: "Free course previews",     free: true,  creator: true,  pro: true  },
  { feature: "All preset packs — unlimited", free: false, creator: true, pro: true },
  { feature: "Full course library",      free: false, creator: true,  pro: true  },
  { feature: "Early access drops",       free: false, creator: true,  pro: true  },
  { feature: "Creator Discord",          free: false, creator: true,  pro: true  },
  { feature: "Monthly 1:1 feedback",     free: false, creator: false, pro: true  },
  { feature: "Custom preset requests",   free: false, creator: false, pro: true  },
  { feature: "Priority support",         free: false, creator: false, pro: true  },
]

function FeatureComparisonTable() {
  return (
    <section className="w-full border-t border-border py-16 sm:py-20">
      <Container>
        <div className="flex flex-col items-center text-center gap-4 mb-10">
          <h2 className="font-display font-black text-[1.5rem] text-foreground">
            Compare Plans
          </h2>
          <p className="text-[0.9rem] text-muted/60">
            Everything side by side.
          </p>
        </div>

        <div className="max-w-3xl mx-auto overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 text-muted/60 font-medium text-[0.8125rem] w-[40%]">Feature</th>
                {["Free", "Creator", "Pro"].map((p) => (
                  <th key={p} className={cn(
                    "py-3 px-4 text-center font-display font-bold text-sm",
                    p === "Creator" ? "text-gold" : "text-foreground/80"
                  )}>
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="hover:bg-surface/50 transition-colors">
                  <td className="py-3 px-4 text-[0.8125rem] text-muted/80">{row.feature}</td>
                  {[row.free, row.creator, row.pro].map((included, i) => (
                    <td key={i} className="py-3 px-4 text-center">
                      {included
                        ? <span className="inline-flex items-center justify-center"><CheckIcon /></span>
                        : <span className="inline-flex items-center justify-center text-muted/25"><CrossIcon /></span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  )
}

/* ─────────────────────────────────────────
   FAQ accordion — AnimatePresence for premium reveal
   Animates only opacity + y (compositor path, no layout thrash).
   The icon rotates via motion.span with spring physics.
───────────────────────────────────────── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="py-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        <span className="font-display font-bold text-[0.9375rem] text-foreground">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="shrink-0 text-muted"
        >
          <PlusIcon />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="mt-3 text-[0.875rem] text-muted/70 leading-relaxed pr-8">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────────────────────────────
   Static data
───────────────────────────────────────── */
const PERKS = [
  {
    title: "Every Preset. Instantly.",
    body:  "Download any preset pack the moment it drops — no individual purchases. New packs ship every month.",
    icon:  <PresetIcon />,
  },
  {
    title: "Full Course Library",
    body:  "Access every editing, colour grading and business course — plus everything published in the future.",
    icon:  <CourseIcon />,
  },
  {
    title: "Early Access",
    body:  "New drops, seasonal packs and limited collections before they're available to the public.",
    icon:  <EarlyIcon />,
  },
  {
    title: "Creator Community",
    body:  "Private Discord for members — share edits, get feedback, connect with photographers worldwide.",
    icon:  <CommunityIcon />,
  },
]

const FAQS = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your billing dashboard at any time. You keep full access until the end of your current billing period — no questions asked.",
  },
  {
    q: "Do downloaded presets stay after I cancel?",
    a: "Yes. Any preset you download while a member is yours to keep forever, even after cancellation.",
  },
  {
    q: "Is there a money-back guarantee?",
    a: "Absolutely. If you're not happy within the first 30 days, email us and we'll issue a full refund.",
  },
  {
    q: "What is the difference between Creator and Pro?",
    a: "Creator gives you everything digital — presets, courses, community. Pro adds monthly 1:1 video feedback sessions where we review your actual work, plus custom preset requests.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept UPI, Debit/Credit Cards, Net Banking, and all major digital wallets via Razorpay's secure checkout.",
  },
  {
    q: "How does the yearly plan work?",
    a: "You pay a single charge for 365 days of access. It does not auto-renew — you'll receive a reminder email before your plan expires.",
  },
]

/* ─────────────────────────────────────────
   Icons & micro-components
───────────────────────────────────────── */
function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}
function CheckSmall() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}
function CrossIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function PlusIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function TrendingUpIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
}
function AlertCircle({ className = "" }: { className?: string }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
}
function ShieldCheck({ className = "", size = 16 }: { className?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
}
function PresetIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
}
function CourseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
}
function EarlyIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
}
function CommunityIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
