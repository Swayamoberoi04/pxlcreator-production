"use client"

import { useState, useEffect, useRef } from "react"
import type { FormEvent }              from "react"
import { Container }                   from "@/components/layout/Container"
import { siteConfig }                  from "@/config/site"
import { LuminousEnvironment }         from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }                from "@/components/ui/GrainOverlay"
import { CinematicReveal }             from "@/components/ui/CinematicReveal"
import { useAuth }                     from "@/contexts/AuthContext"

/* ── Subject options (must match src/app/api/contact/route.ts) ──────── */
const SUBJECTS = [
  "General Inquiry",
  "Order / Download Issue",
  "Preset Compatibility",
  "Collaboration",
  "Course Support",
  "Other",
] as const

type Subject = (typeof SUBJECTS)[number]

/* ── Form state ─────────────────────────────────────────────────────── */
type FormStatus = "idle" | "loading" | "success" | "error"

export default function ContactPage() {
  const { user } = useAuth()

  const [name,    setName]    = useState("")
  const [email,   setEmail]   = useState("")
  const [subject, setSubject] = useState<Subject>("General Inquiry")
  const [message, setMessage] = useState("")
  const [status,  setStatus]  = useState<FormStatus>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const nameRef    = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Auto-fill from signed-in user */
  useEffect(() => {
    if (user) {
      if (user.displayName && !name) setName(user.displayName)
      if (user.email && !email)      setEmail(user.email)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  /* Clear error toast after 6 s */
  useEffect(() => {
    if (status === "error") {
      toastTimer.current = setTimeout(() => {
        setStatus("idle")
        setErrorMsg(null)
      }, 6000)
    }
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [status])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === "loading") return

    setStatus("loading")
    setErrorMsg(null)

    try {
      const res = await fetch("/api/contact", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         name.trim(),
          email:        email.trim(),
          subject,
          message:      message.trim(),
          firebase_uid: user?.uid ?? null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus("error")
        setErrorMsg(data.error ?? "Something went wrong. Please try again.")
        return
      }

      setStatus("success")
    } catch {
      setStatus("error")
      setErrorMsg("Network error — please check your connection and try again.")
    }
  }

  return (
    <div className="w-full bg-background">

      {/* ── Hero band ── */}
      <div className="relative w-full border-b border-border overflow-hidden depth-section">
        <LuminousEnvironment variant="teal" intensity={0.85} />
        <GrainOverlay opacity={0.017} animated zIndex={2} />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-500/25 to-transparent z-[3]" />

        <Container className="relative z-10 py-16 sm:py-24">
          <div className="flex flex-col items-center text-center gap-5 max-w-2xl mx-auto">

            <CinematicReveal variant="rise">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
                <span className="text-label text-gold/80 tracking-widest animate-gold-flicker">Get in Touch</span>
                <span className="h-px w-8 bg-gold/60 animate-gold-flicker" aria-hidden="true" />
              </div>
            </CinematicReveal>

            <CinematicReveal variant="depth" delay={0.07}>
              <h1 className="heading-2 text-foreground">
                We&apos;d love to{" "}
                <span className="text-gold-gradient">hear from you</span>
              </h1>
            </CinematicReveal>

            <CinematicReveal variant="rise" delay={0.13}>
              <p className="text-lead max-w-lg">
                Whether you have a question about an order, need editing help, or just want
                to say hi — our inbox is always open.
              </p>
            </CinematicReveal>

          </div>
        </Container>
      </div>

      {/* ── Content ── */}
      <Container className="py-14 sm:py-20">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-10 max-w-4xl mx-auto">

          {/* ── Sidebar contact info ── */}
          <div className="flex flex-col gap-7">

            <div>
              <p className="text-label text-muted/60 tracking-widest mb-3">Email Us</p>
              <a
                href={siteConfig.socials.email}
                className="text-[0.9375rem] font-medium text-foreground hover:text-gold transition-colors break-all"
              >
                creatorpxl@gmail.com
              </a>
            </div>

            <div className="h-px bg-border" />

            <div>
              <p className="text-label text-muted/60 tracking-widest mb-3">Follow Along</p>
              <div className="flex flex-col gap-2">
                <a
                  href={siteConfig.socials.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.9375rem] text-muted hover:text-gold transition-colors"
                >
                  YouTube
                </a>
                <a
                  href={siteConfig.socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.9375rem] text-muted hover:text-gold transition-colors"
                >
                  Instagram
                </a>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div>
              <p className="text-label text-muted/60 tracking-widest mb-2">Response Time</p>
              <p className="text-[0.9375rem] text-muted leading-relaxed">
                We typically reply within{" "}
                <span className="text-foreground font-medium">24–48 hours</span>{" "}
                on business days.
              </p>
            </div>

          </div>

          {/* ── Contact form / success / error ── */}
          {status === "success" ? (
            <SuccessCard />
          ) : (
            <div className="relative">
              {/* Error toast */}
              {status === "error" && errorMsg && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3.5"
                >
                  <AlertIcon className="mt-0.5 shrink-0 text-red-400" />
                  <p className="text-[0.9375rem] text-red-300 leading-snug">{errorMsg}</p>
                  <button
                    type="button"
                    onClick={() => { setStatus("idle"); setErrorMsg(null) }}
                    className="ml-auto shrink-0 text-red-400/60 hover:text-red-400 transition-colors"
                    aria-label="Dismiss error"
                  >
                    <XIcon />
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-border bg-surface p-8 sm:p-10 flex flex-col gap-6"
                noValidate
              >
                {/* Name + Email row */}
                <div className="grid sm:grid-cols-2 gap-5">
                  <label className="flex flex-col gap-2">
                    <span className="text-label text-muted/70">
                      Name <RequiredStar />
                    </span>
                    <input
                      ref={nameRef}
                      type="text"
                      name="name"
                      required
                      maxLength={100}
                      placeholder="Alex Kim"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={status === "loading"}
                      className="rounded-lg border border-border bg-background px-4 py-3 text-[0.9375rem] text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50 transition-colors disabled:opacity-50"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-label text-muted/70">
                      Email <RequiredStar />
                    </span>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={status === "loading"}
                      className="rounded-lg border border-border bg-background px-4 py-3 text-[0.9375rem] text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50 transition-colors disabled:opacity-50"
                    />
                  </label>
                </div>

                {/* Subject select */}
                <label className="flex flex-col gap-2">
                  <span className="text-label text-muted/70">Subject</span>
                  <select
                    name="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as Subject)}
                    disabled={status === "loading"}
                    className="rounded-lg border border-border bg-background px-4 py-3 text-[0.9375rem] text-foreground focus:outline-none focus:border-gold/50 transition-colors appearance-none disabled:opacity-50"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>

                {/* Message */}
                <label className="flex flex-col gap-2">
                  <span className="flex items-center justify-between text-label text-muted/70">
                    <span>Message <RequiredStar /></span>
                    <span className={`tabular-nums transition-colors ${message.length > 4500 ? "text-yellow-400" : "text-muted/30"}`}>
                      {message.length}/5000
                    </span>
                  </span>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    maxLength={5000}
                    placeholder="Tell us what's on your mind... (at least 20 characters)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={status === "loading"}
                    className="rounded-lg border border-border bg-background px-4 py-3 text-[0.9375rem] text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50 transition-colors resize-none disabled:opacity-50"
                  />
                  {message.length > 0 && message.trim().length < 20 && (
                    <p className="text-[0.8125rem] text-muted/50">
                      {20 - message.trim().length} more character{20 - message.trim().length !== 1 ? "s" : ""} needed
                    </p>
                  )}
                </label>

                {/* Signed-in indicator */}
                {user && (
                  <p className="text-[0.8125rem] text-muted/40 -mt-2">
                    Sending as <span className="text-gold/60">{user.email}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="self-start rounded-full bg-gold px-8 py-3 text-[0.9375rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2.5"
                >
                  {status === "loading" ? (
                    <>
                      <SpinnerIcon />
                      Sending…
                    </>
                  ) : (
                    "Send Message"
                  )}
                </button>

              </form>
            </div>
          )}

        </div>
      </Container>

    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function SuccessCard() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-5 min-h-[360px]">
      <div className="h-12 w-12 rounded-full bg-gold/10 flex items-center justify-center">
        <CheckIcon />
      </div>
      <h2 className="font-display font-bold text-foreground text-[1.125rem]">
        Message sent!
      </h2>
      <p className="text-[0.9375rem] text-muted max-w-sm leading-relaxed">
        Thanks for reaching out. We&apos;ll get back to you within 24–48 hours.
      </p>
    </div>
  )
}

function RequiredStar() {
  return <span className="text-gold/60 ml-0.5" aria-hidden="true">*</span>
}

/* ── Icons ──────────────────────────────────────────────────────────── */

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gold" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin" aria-hidden="true">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
