import type { Metadata } from "next"
import { Container }           from "@/components/layout/Container"
import { LuminousEnvironment } from "@/components/ui/LuminousEnvironment"
import { GrainOverlay }        from "@/components/ui/GrainOverlay"

export const metadata: Metadata = {
  title: "Troubleshooting Guide",
  description:
    "Solutions to common issues with PXL Creator preset installation, download failures, account access, and AI Studio errors.",
}

export default function TroubleshootingPage() {
  return (
    <div className="w-full bg-background">

      <div className="relative w-full border-b border-border bg-surface overflow-hidden depth-section">
        <LuminousEnvironment variant="neutral" intensity={0.7} />
        <GrainOverlay opacity={0.015} zIndex={1} />
        <Container className="relative z-10 py-14 sm:py-20">
          <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
              <span className="text-label text-gold/80 tracking-widest">Help</span>
              <span className="h-px w-8 bg-gold/60" aria-hidden="true" />
            </div>
            <h1 className="heading-2 text-foreground">Troubleshooting Guide</h1>
            <p className="body-text text-muted max-w-lg">
              Can&apos;t find a solution here? Email us at{" "}
              <a href="mailto:creatorpxl@gmail.com" className="text-gold hover:underline">
                creatorpxl@gmail.com
              </a>{" "}
              with your order number and a description of the issue.
            </p>
          </div>
        </Container>
      </div>

      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <LegalDoc>

            <Section title="Presets Not Showing in Lightroom After Import">
              <p>
                <strong>Symptom:</strong> You imported the preset files but cannot see them in
                Lightroom&apos;s Presets panel.
              </p>
              <p>Solutions to try in order:</p>
              <ol>
                <li>
                  <strong>Restart Lightroom.</strong> After importing presets, a full restart
                  is sometimes required before they appear in the panel.
                </li>
                <li>
                  <strong>Check the correct panel.</strong> In Lightroom Classic, presets are
                  in the <em>Develop</em> module&apos;s left panel — not the Library module.
                  In Lightroom (cloud), they are in the <em>Edit</em> view&apos;s right panel
                  under &ldquo;Presets&rdquo;.
                </li>
                <li>
                  <strong>Verify the import completed.</strong> In Lightroom Classic, go to
                  Develop &rarr; Presets panel &rarr; click the + button &rarr; Import Presets
                  and try importing again. If the files are greyed out, Lightroom already has
                  them — they may be in a collapsed folder group.
                </li>
                <li>
                  <strong>Expand all preset groups.</strong> In the Presets panel, click the
                  small triangle next to each group name to expand it. Your PXL presets will
                  be in a group named after the pack.
                </li>
                <li>
                  <strong>Check file format.</strong> Confirm your extracted folder contains
                  <code>.xmp</code> files, not a nested zip inside the zip. Extract the outer
                  zip first, then check for an inner zip and extract that too.
                </li>
              </ol>
            </Section>

            <Section title="Presets Look Wrong or Have No Effect">
              <p>
                <strong>Symptom:</strong> Presets apply but look very different from the sample
                images, are extremely dark/light, or appear to do nothing at all.
              </p>
              <ol>
                <li>
                  <strong>Check your camera profile.</strong> In the Develop module, scroll to
                  the bottom of the right panel to find <em>Camera Calibration</em> (Classic)
                  or <em>Optics &gt; Profile</em> (Lightroom cloud). Presets may include a
                  specific camera profile. If your camera does not have that profile, the preset
                  will look different. Try switching to &ldquo;Adobe Standard&rdquo; and
                  re-applying.
                </li>
                <li>
                  <strong>Check your colour space.</strong> Ensure your photos are in the
                  sRGB or Adobe RGB colour space. CMYK or P3 colour spaces may cause
                  unusual results.
                </li>
                <li>
                  <strong>Source image matters.</strong> Presets are designed for well-exposed
                  RAW or JPEG files with neutral white balance. Very underexposed, overexposed,
                  or strongly colour-cast source images will produce different results from the
                  sample images.
                </li>
                <li>
                  <strong>Try on a new photo.</strong> If only one image looks wrong, the
                  issue is likely with the source photo, not the preset.
                </li>
              </ol>
            </Section>

            <Section title="Download Link Not Working or Expired">
              <p>
                <strong>Symptom:</strong> Your download link gives an error, says it is expired,
                or shows that you have reached the download limit.
              </p>
              <ol>
                <li>
                  <strong>Check you are logged in.</strong> Download links are account-tied.
                  Make sure you are signed into the same account used to purchase. Log out and
                  log back in if in doubt.
                </li>
                <li>
                  <strong>Access your downloads from the dashboard.</strong> Go to your account
                  dashboard and use the download button there rather than any link from an
                  old email.
                </li>
                <li>
                  <strong>Link expired or limit reached?</strong> Download links are valid for
                  30 days and allow 2 downloads. If yours has expired or is exhausted, email{" "}
                  <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a> with your
                  order number and we will issue a new link.
                </li>
              </ol>
            </Section>

            <Section title="Purchase Confirmed but Downloads Not Appearing">
              <p>
                <strong>Symptom:</strong> Payment went through and you received a confirmation
                but no downloads appear in your dashboard.
              </p>
              <ol>
                <li>
                  <strong>Wait 5–10 minutes.</strong> Our system receives payment confirmation
                  via Razorpay webhook. In rare cases this can be delayed by up to 10 minutes.
                  Refresh your dashboard after waiting.
                </li>
                <li>
                  <strong>Check the correct account.</strong> If you have multiple email
                  addresses, confirm you are logged into the account used during checkout.
                </li>
                <li>
                  <strong>Check your spam folder.</strong> Your order confirmation email may
                  have been filtered as spam.
                </li>
                <li>
                  <strong>Contact support.</strong> If downloads still do not appear after
                  15 minutes, email <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a>{" "}
                  with a screenshot of your Razorpay payment confirmation and we will
                  manually verify and grant access.
                </li>
              </ol>
            </Section>

            <Section title="Cannot Log In to My Account">
              <p>
                <strong>Symptom:</strong> Error when trying to sign in, or the page loops back
                to login after entering credentials.
              </p>
              <ol>
                <li>
                  <strong>Forgot password?</strong> Use the &ldquo;Forgot Password&rdquo; link
                  on the login page. A reset email will be sent by Firebase Authentication.
                  Check your spam folder if it does not arrive within a few minutes.
                </li>
                <li>
                  <strong>Signed up with Google?</strong> If you originally created your account
                  with the &ldquo;Continue with Google&rdquo; button, you cannot log in with
                  email and password — use the Google button again.
                </li>
                <li>
                  <strong>Signed up with email?</strong> If you created your account with an
                  email address, the Google button will create a separate account. Use the
                  email/password form with the original email you registered with.
                </li>
                <li>
                  <strong>Browser issues.</strong> Try clearing your browser cookies and cache,
                  then attempt login again. Alternatively, try a private/incognito window.
                </li>
                <li>
                  <strong>Still locked out?</strong> Email <a href="mailto:creatorpxl@gmail.com">
                  creatorpxl@gmail.com</a> from the email address on your account and we
                  will help restore access.
                </li>
              </ol>
            </Section>

            <Section title="Downloaded .zip File Will Not Extract">
              <p>
                <strong>Symptom:</strong> The .zip file gives an error when you try to extract it,
                or appears empty after extraction.
              </p>
              <ol>
                <li>
                  <strong>Download was interrupted.</strong> If your internet dropped during
                  download, the zip may be incomplete. Use your second available download to
                  re-download the file from your dashboard.
                </li>
                <li>
                  <strong>Try a dedicated extraction app.</strong> On Windows, try{" "}
                  <strong>7-Zip</strong> (free). On macOS, try <strong>The Unarchiver</strong>{" "}
                  (free on the App Store). Built-in zip tools occasionally fail on certain files.
                </li>
                <li>
                  <strong>Disk space.</strong> Ensure you have sufficient free space on your
                  device — some preset packs are several hundred MB when extracted.
                </li>
              </ol>
            </Section>

            <Section title="AI Studio — Upload Fails or Returns an Error">
              <p>
                <strong>Symptom:</strong> Uploading an image to AI Studio fails, or the analysis
                returns an error message.
              </p>
              <ol>
                <li>
                  <strong>File size.</strong> AI Studio accepts images up to 10 MB. If your
                  file is larger, resize or compress it before uploading.
                </li>
                <li>
                  <strong>File format.</strong> Accepted formats are JPEG, PNG, and WebP. RAW
                  files (<code>.cr2</code>, <code>.nef</code>, <code>.arw</code>, etc.) are not
                  supported — export or convert your image to JPEG first.
                </li>
                <li>
                  <strong>Rate limit.</strong> AI Studio allows 5 analyses per hour per IP
                  address. If you have exceeded this, wait an hour and try again.
                </li>
                <li>
                  <strong>Temporary OpenAI outage.</strong> AI Studio depends on OpenAI&apos;s
                  API. If OpenAI is experiencing an outage, Studio will fall back to a
                  prompt-based analysis. Check{" "}
                  <strong>status.openai.com</strong> if you suspect an issue.
                </li>
              </ol>
            </Section>

            <Section title="Presets Do Not Appear on Lightroom Mobile After Desktop Import">
              <p>
                <strong>Symptom:</strong> You imported presets on your desktop Lightroom but they
                are not showing in Lightroom Mobile.
              </p>
              <ol>
                <li>
                  <strong>Use Lightroom cloud (not Classic).</strong> Lightroom Classic does
                  not sync presets to mobile. You need to import presets into the non-Classic
                  Lightroom application for them to sync via Creative Cloud.
                </li>
                <li>
                  <strong>Check sync is enabled.</strong> In Lightroom (cloud) on desktop, go
                  to Lightroom menu &rarr; Preferences &rarr; Lightroom Sync and ensure sync
                  is enabled and you are signed into the correct Adobe account.
                </li>
                <li>
                  <strong>Wait for sync.</strong> Preset sync can take several minutes. Open
                  Lightroom Mobile and leave it open for a few minutes to allow sync to complete.
                </li>
                <li>
                  <strong>Use DNG import instead.</strong> If sync is not working, import using
                  the DNG method described in our{" "}
                  <a href="/install">Installation Guide</a>.
                </li>
              </ol>
            </Section>

            <Section title="Still Need Help?">
              <p>
                If none of the above solutions resolve your issue, we are here to help.
                Email <a href="mailto:creatorpxl@gmail.com">creatorpxl@gmail.com</a> and include:
              </p>
              <ul>
                <li>Your account email address</li>
                <li>Your order number or Razorpay transaction ID</li>
                <li>The version of Adobe Lightroom you are using</li>
                <li>Your device and operating system</li>
                <li>A description of the problem and any error messages you see</li>
                <li>Screenshots if available</li>
              </ul>
              <p>
                We aim to respond within 2 business days.
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
      <div className="flex flex-col gap-3 text-[0.9375rem] text-muted leading-relaxed [&_strong]:text-foreground/92 [&_strong]:font-medium [&_em]:text-foreground/92 [&_em]:italic [&_a]:text-gold [&_a]:hover:underline [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_li]:list-decimal [&_li]:marker:text-gold/50 [&_ul>li]:list-disc [&_code]:bg-white/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.85em] [&_code]:text-foreground/92">
        {children}
      </div>
    </section>
  )
}
