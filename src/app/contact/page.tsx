"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { Container } from "@/components/layout/Container"
import { siteConfig } from "@/config/site"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"
import { CinematicReveal }     from "@/components/ui/CinematicReveal"

const SUBJECTS = [
  "General Inquiry",
  "Order / Download Issue",
  "Preset Compatibility",
  "Collaboration",
  "Course Support",
  "Other",
] as const

type Subject = (typeof SUBJECTS)[number]

export default function ContactPage() {
  const [subject, setSubject] = useState<Subject>("General Inquiry")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    /* In production: POST to an API route / form provider. */
    setSubmitted(true)
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
                pxlcreator@gmail.com
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

          {/* ── Contact form ── */}
          {submitted ? (
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
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-border bg-surface p-8 sm:p-10 flex flex-col gap-6"
            >
              {/* Name + Email row */}
              <div className="grid sm:grid-cols-2 gap-5">
                <label className="flex flex-col gap-2">
                  <span className="text-label text-muted/70">Name</span>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Alex Kim"
                    className="rounded-lg border border-border bg-background px-4 py-3 text-[0.9375rem] text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50 transition-colors"
                    suppressHydrationWarning
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-label text-muted/70">Email</span>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="you@example.com"
                    className="rounded-lg border border-border bg-background px-4 py-3 text-[0.9375rem] text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50 transition-colors"
                    suppressHydrationWarning
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
                  className="rounded-lg border border-border bg-background px-4 py-3 text-[0.9375rem] text-foreground focus:outline-none focus:border-gold/50 transition-colors appearance-none"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              {/* Message */}
              <label className="flex flex-col gap-2">
                <span className="text-label text-muted/70">Message</span>
                <textarea
                  name="message"
                  required
                  rows={5}
                  placeholder="Tell us what's on your mind..."
                  className="rounded-lg border border-border bg-background px-4 py-3 text-[0.9375rem] text-foreground placeholder:text-muted/40 focus:outline-none focus:border-gold/50 transition-colors resize-none"
                />
              </label>

              <button
                type="submit"
                className="self-start rounded-full bg-gold px-8 py-3 text-[0.9375rem] font-semibold text-background transition-all hover:bg-gold-dim active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Send Message
              </button>

            </form>
          )}

        </div>
      </Container>

    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gold" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
