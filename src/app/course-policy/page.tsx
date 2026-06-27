import type { Metadata } from "next"
import { Container }           from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Course Access Policy",
  description:
    "Terms governing access to PXL Creator courses and educational content, including access periods, prohibited sharing, and technical requirements.",
}

const LAST_UPDATED = "June 26, 2026"

export default function CoursePolicyPage() {
  return (
    <div className="w-full bg-background">

      <div className="relative w-full border-b border-border bg-surface overflow-hidden depth-section">
        <LuminousEnvironment variant="neutral" intensity={0.7} />
        <GrainOverlay opacity={0.015} zIndex={1} />
        <Container className="relative z-10 py-14 sm:py-20">
          <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
              <span className="text-label text-gold/80 tracking-widest">Legal</span>
              <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
            </div>
            <h1 className="heading-2 text-foreground">Course Access Policy</h1>
            <p className="text-small text-muted/60">Last updated: {LAST_UPDATED}</p>
          </div>
        </Container>
      </div>

      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <LegalDoc>

            <Section title="1. Who May Access Courses">
              <p>
                Course access is granted exclusively to the individual who purchased the course or
                whose active Premium subscription includes course access. Each PXL Creator account
                is registered to a single person. Courses may not be accessed by, shared with,
                or transferred to any other individual.
              </p>
            </Section>

            <Section title="2. Access Period">
              <p>
                <strong>Individual course purchases</strong> grant lifetime access to the course
                content as it exists at the time of purchase and as it is updated over time.
                &ldquo;Lifetime access&rdquo; means for as long as PXL Creator continues to host
                the course. We will make reasonable efforts to provide advance notice before
                removing a course, but cannot guarantee permanent availability.
              </p>
              <p>
                <strong>Premium subscription course access</strong> is available only during an
                active subscription. If your subscription lapses or is cancelled, access to
                subscription-included courses will end. Any course you purchased individually
                (outside of a subscription) retains its lifetime access status regardless of
                subscription status.
              </p>
            </Section>

            <Section title="3. Permitted Use of Course Content">
              <p>
                Course content is licensed to you for personal learning only. You may:
              </p>
              <ul>
                <li>Watch and re-watch course videos within your PXL Creator account</li>
                <li>Download any course materials explicitly made available for download</li>
                <li>Apply techniques learned in courses to your own commercial photography or videography work</li>
                <li>Take personal notes for your own reference</li>
              </ul>
            </Section>

            <Section title="4. Prohibited Use of Course Content">
              <p>
                The following are strictly prohibited and constitute a material breach of this policy:
              </p>
              <ul>
                <li>
                  <strong>Sharing login credentials</strong> — allowing another person to access your
                  account to view courses, whether for free or in exchange for payment.
                </li>
                <li>
                  <strong>Screen recording</strong> — recording course videos using any screen
                  recording software or device.
                </li>
                <li>
                  <strong>Downloading video content</strong> — using tools to download course videos
                  from our platform in formats other than those explicitly provided for offline use.
                </li>
                <li>
                  <strong>Redistribution</strong> — sharing, uploading, or distributing course videos,
                  slides, PDFs, or any other course materials to any third party or platform.
                </li>
                <li>
                  <strong>Re-teaching for commercial gain</strong> — reproducing course content,
                  methodology, or materials to create a competing course or educational product.
                </li>
              </ul>
              <p>
                Violation of these terms will result in immediate termination of course access and
                your PXL Creator account without refund.
              </p>
            </Section>

            <Section title="5. Intellectual Property">
              <p>
                All course videos, presentation slides, written materials, and supplementary downloads
                are the intellectual property of PXL Creator. Copyright in all course content remains
                with Swayam Oberoi / PXL Creator. No licence to reproduce or distribute course
                content is granted beyond the personal viewing rights described in Section&nbsp;3.
              </p>
            </Section>

            <Section title="6. No Refunds on Accessed Courses">
              <p>
                Because course content is delivered immediately and digitally upon purchase, refunds
                are not available once you have accessed or begun watching course content. Please
                read our <a href="/refunds">Refund Policy</a> for the limited circumstances in
                which a refund may be considered.
              </p>
            </Section>

            <Section title="7. Technical Requirements">
              <p>
                Accessing course content requires an internet connection and a modern web browser.
                PXL Creator is not responsible for any inability to access courses due to your
                internet connection, device limitations, browser incompatibility, or network
                restrictions.
              </p>
            </Section>

            <Section title="8. Updates to Course Content">
              <p>
                We may update, revise, add to, or remove sections of course content at any time
                without notice. We will make reasonable efforts to keep course content current and
                accurate, but we do not guarantee that all content will be updated to reflect
                the latest versions of third-party software (such as Adobe Lightroom).
              </p>
            </Section>

            <Section title="9. Contact">
              <p>
                If you are experiencing issues accessing your course, or if you have questions about
                this policy, contact us at{" "}
                <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a>.
              </p>
            </Section>

          </LegalDoc>
        </div>
      </Container>

    </div>
  )
}

function LegalDoc({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-10">{children}</div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display font-bold text-foreground text-[1rem] tracking-wide">{title}</h2>
      <div className="flex flex-col gap-3 text-[0.9375rem] text-muted leading-relaxed [&_strong]:text-foreground/80 [&_strong]:font-medium [&_a]:text-gold [&_a]:hover:underline [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_li]:list-disc [&_li]:marker:text-gold/50">
        {children}
      </div>
    </section>
  )
}
