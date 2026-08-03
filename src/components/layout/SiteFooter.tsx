import Link from "next/link"
import { siteConfig } from "@/config/site"
import { Container } from "@/components/layout/Container"
import { NewsletterForm } from "@/components/layout/NewsletterForm"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay } from "@/components/ui/GrainOverlay"

/* ─────────────────────────────────────────
   Footer column data — kept here so any
   future content update is a one-liner.
───────────────────────────────────────── */
const SHOP_LINKS = [
  { label: "Preset Store",    href: "/store"    },
  { label: "All Presets",     href: "/presets"  },
  { label: "Premium Plans",   href: "/premium"  },
  { label: "Courses",         href: "/courses"  },
] as const

const COMPANY_LINKS = [
  { label: "About Us",        href: "/about"    },
  { label: "Blog",            href: "/blog"     },
  { label: "Giveaway",        href: "/giveaway" },
  { label: "Contact",         href: "/contact"  },
  { label: "FAQ",             href: "/faq"      },
] as const

const LEGAL_LINKS = [
  { label: "Privacy Policy",     href: "/privacy"          },
  { label: "Terms of Service",   href: "/terms"            },
  { label: "Refund Policy",      href: "/refunds"          },
  { label: "Cookie Policy",      href: "/cookies"          },
  { label: "Licensing",          href: "/license"          },
  { label: "DMCA / Copyright",   href: "/dmca"             },
  { label: "Disclaimer",         href: "/disclaimer"       },
] as const

const HELP_LINKS = [
  { label: "Support Policy",     href: "/support"          },
  { label: "Download Policy",    href: "/download-policy"  },
  { label: "Course Policy",      href: "/course-policy"    },
  { label: "AI Studio Terms",    href: "/ai-terms"         },
  { label: "Installation Guide", href: "/install"          },
  { label: "Troubleshooting",    href: "/troubleshooting"  },
] as const

/* Core links shown in the bottom bar — keep short */
const BOTTOM_BAR_LINKS = [
  { label: "Privacy",  href: "/privacy"  },
  { label: "Terms",    href: "/terms"    },
  { label: "Refunds",  href: "/refunds"  },
  { label: "Cookies",  href: "/cookies"  },
] as const

export function SiteFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative w-full bg-surface mt-auto overflow-hidden">

      {/* Subtle atmospheric base */}
      <LuminousEnvironment variant="neutral" intensity={0.5} />
      <GrainOverlay opacity={0.013} zIndex={1} />

      {/* ── Top gold rule — mirrors the header ── */}
      <div
        aria-hidden="true"
        className="relative z-[2] h-px w-full bg-gradient-to-r from-transparent via-gold/50 to-transparent"
        style={{ boxShadow: "0 0 12px rgba(255,214,10,0.25)" }}
      />

      {/* ── Newsletter band ── */}
      <div className="relative z-[2] border-b border-border">
        <Container>
          <div className="py-10 flex flex-col sm:flex-row items-center justify-between gap-6">

            {/* Copy */}
            <div className="flex flex-col gap-1 text-center sm:text-left">
              <p className="font-display font-bold text-foreground text-[1rem] tracking-wide">
                Stay in the loop
              </p>
              <p className="text-small text-muted">
                New presets, tutorials, and giveaways — straight to your inbox.
              </p>
            </div>

            {/* Input + button — Client Component (needs onSubmit) */}
            <NewsletterForm />

          </div>
        </Container>
      </div>

      {/* ── Main footer grid ── */}
      <Container className="relative z-[2]">
        <div className="py-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">

          {/* ── Brand column ── */}
          <div className="flex flex-col gap-7">

            {/* Logo */}
            <Link
              href="/"
              className="w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              <span className="font-display text-[1.125rem] font-bold tracking-widest text-foreground/90 uppercase">
                PXL{" "}
                <span className="text-gold logo-glow">CREATOR</span>
              </span>
            </Link>

            {/* Tagline */}
            <p className="text-small text-muted leading-relaxed max-w-[240px]">
              Premium cinematic Lightroom presets and editing resources for photographers
              and filmmakers who care about their craft.
            </p>

            {/* Social row */}
            <div className="flex items-center gap-2">
              <SocialLink href={siteConfig.socials.youtube}   label="YouTube">   <YouTubeIcon />   </SocialLink>
              <SocialLink href={siteConfig.socials.instagram} label="Instagram"> <InstagramIcon /> </SocialLink>
              <SocialLink href={siteConfig.socials.email}     label="Email">     <EmailIcon />     </SocialLink>
            </div>

            {/* Trust signal */}
            <p className="text-[0.8125rem] text-muted/85 leading-snug max-w-[240px]">
              Trusted by{" "}
              <span className="text-muted/92 font-medium">10,000+</span>{" "}
              creators worldwide.
            </p>

            {/* Status badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
              <span className="text-[0.75rem] text-muted font-medium">All systems normal</span>
            </div>

          </div>

          {/* ── Shop column ── */}
          <FooterColumn heading="Shop">
            {SHOP_LINKS.map((item) => (
              <FooterLink key={item.href} href={item.href}>{item.label}</FooterLink>
            ))}
          </FooterColumn>

          {/* ── Company column ── */}
          <FooterColumn heading="Company">
            {COMPANY_LINKS.map((item) => (
              <FooterLink key={item.href} href={item.href}>{item.label}</FooterLink>
            ))}
          </FooterColumn>

          {/* ── Legal column ── */}
          <FooterColumn heading="Legal">
            {LEGAL_LINKS.map((item) => (
              <FooterLink key={item.href} href={item.href}>{item.label}</FooterLink>
            ))}
          </FooterColumn>

          {/* ── Help column ── */}
          <FooterColumn heading="Help">
            {HELP_LINKS.map((item) => (
              <FooterLink key={item.href} href={item.href}>{item.label}</FooterLink>
            ))}
          </FooterColumn>

        </div>
      </Container>

      {/* ── Bottom bar ── */}
      <div className="relative z-[2] border-t border-border">
        <Container>
          <div className="py-5 flex flex-col sm:flex-row items-center justify-between gap-3">

            <p className="text-small text-muted/85 text-center sm:text-left">
              © {currentYear}{" "}
              <span className="text-muted/92">{siteConfig.name}</span>
              . All rights reserved.
            </p>

            {/* Bottom legal quick links */}
            <div className="flex flex-wrap items-center gap-4">
              {BOTTOM_BAR_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-[0.8125rem] text-muted/85 hover:text-muted transition-colors duration-150"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <p className="text-small text-muted/85 text-center sm:text-right hidden sm:block">
              Handcrafted for creators.
            </p>

          </div>
        </Container>
      </div>

    </footer>
  )
}

/* ─────────────────────────────────────────
   Small reusable sub-components
───────────────────────────────────────── */
function FooterColumn({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-label text-gold/70 tracking-widest uppercase">{heading}</p>
      <nav className="flex flex-col gap-2.5" aria-label={`${heading} navigation`}>
        {children}
      </nav>
    </div>
  )
}

function FooterLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="text-small text-muted/92 hover:text-foreground transition-colors duration-150 w-fit"
    >
      {children}
    </Link>
  )
}

/* ─────────────────────────────────────────
   Social link button
───────────────────────────────────────── */
function SocialLink({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  const isExternal = href.startsWith("http")
  return (
    <a
      href={href}
      aria-label={label}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="flex items-center justify-center w-9 h-9 rounded-lg text-muted hover:text-gold hover:bg-background border border-transparent hover:border-border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </a>
  )
}

/* ─────────────────────────────────────────
   Icons
───────────────────────────────────────── */
function YouTubeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.6 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.5 15.5V8.5l6.3 3.5-6.3 3.5z"/>
    </svg>
  )
}
function InstagramIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5"/>
      <circle cx="12" cy="12" r="4.5"/>
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
  )
}
function EmailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m2 7 10 7 10-7"/>
    </svg>
  )
}
