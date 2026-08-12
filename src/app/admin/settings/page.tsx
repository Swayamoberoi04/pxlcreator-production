"use client"

/**
 * /admin/settings — Global Site Settings (singleton, id: "default")
 *
 * Manages the values currently hardcoded in src/config/site.ts:
 *   - Brand identity (name, tagline, description, URL, support email)
 *   - Logo & Favicon
 *   - Social links (YouTube, Instagram, Twitter, TikTok)
 *   - Policy page URLs (Terms, Privacy, Refunds, License)
 *   - Footer note
 *   - Maintenance mode kill-switch
 *
 * Pattern: identical to /admin/ai-studio — singleton with id: "default",
 * useAdminResourceItem, versioning via VersionHistoryPanel.
 */

import { useState } from "react"
import { AdminEditShell }    from "@/components/admin/AdminEditShell"
import { FormField, FormSection, TextInput, TextArea } from "@/components/admin/ui/FormField"
import { ToggleSwitch }      from "@/components/admin/ui/ToggleSwitch"
import { VersionHistoryPanel } from "@/components/admin/ui/VersionHistoryPanel"
import { AdminDrawer }       from "@/components/admin/ui/AdminDrawer"
import { ImageUploader }     from "@/components/admin/ui/ImageUploader"
import { useAdminResourceItem } from "@/hooks/admin/useAdminResourceItem"
import type { Database } from "@/types/database"

type Settings = Database["public"]["Tables"]["global_settings"]["Row"]

const EMPTY_SETTINGS: Settings = {
  id: "default",
  brand_name: "PXL Creator",
  tagline: "Premium Cinematic Presets",
  description: "Handcrafted Lightroom presets, cinematic editing tools, and creator resources for photographers and filmmakers.",
  site_url: "https://www.pxlcreator.space",
  support_email: "creatorpxl@gmail.com",
  logo_url: null,
  favicon_url: null,
  social_youtube: "https://youtube.com/@pxlcreator04",
  social_instagram: "https://www.instagram.com/pxl_creator?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  social_twitter: null,
  social_tiktok: null,
  policy_terms_url: null,
  policy_privacy_url: null,
  policy_refunds_url: null,
  policy_license_url: null,
  footer_note: null,
  maintenance_mode: false,
  created_at: "",
  updated_at: "",
}

export default function GlobalSettingsPage() {
  const item = useAdminResourceItem<Settings>({
    basePath: "/api/admin/settings",
    id: "default",
    emptyDraft: EMPTY_SETTINGS,
  })
  const [historyOpen, setHistoryOpen] = useState(false)
  const d = item.draft

  return (
    <AdminEditShell
      title="Global Settings"
      breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Global Settings" }]}
      loading={item.loading}
      saving={item.saving}
      dirty={item.dirty}
      savedAt={item.savedAt}
      error={item.error}
      onSave={async () => { await item.save() }}
    >
      {d && (
        <>
          <div className="flex justify-end -mt-2">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="text-[0.8125rem] text-white/50 hover:text-white/85 transition-colors"
            >
              History
            </button>
          </div>

          {/* Maintenance mode at top — most critical toggle */}
          <FormSection
            title="Maintenance Mode"
            description="Enabling this should trigger a sitewide maintenance banner. Wire the public layout to read this setting to enforce it."
          >
            <ToggleSwitch
              label="Maintenance Mode"
              description="Signals that the site is under maintenance. Does not automatically block traffic — implement a middleware check separately."
              checked={d.maintenance_mode}
              onChange={(v) => item.setField("maintenance_mode", v)}
            />
          </FormSection>

          <FormSection
            title="Brand"
            description="Core identity — these values seed the <title> tag, OG metadata, and footer. Currently also hardcoded in src/config/site.ts; keep them in sync until a cutover to DB reads is wired."
          >
            <FormField label="Brand Name" hint="Used in page titles and the nav logo">
              <TextInput
                value={d.brand_name}
                onChange={(e) => item.setField("brand_name", e.target.value)}
                placeholder="PXL Creator"
              />
            </FormField>
            <FormField label="Tagline" hint="Short brand line shown in footers and meta descriptions">
              <TextInput
                value={d.tagline}
                onChange={(e) => item.setField("tagline", e.target.value)}
                placeholder="Premium Cinematic Presets"
              />
            </FormField>
            <FormField label="Site Description" hint="Default meta description (150–160 chars)">
              <TextArea
                rows={3}
                value={d.description ?? ""}
                onChange={(e) => item.setField("description", e.target.value)}
                placeholder="Handcrafted Lightroom presets…"
              />
            </FormField>
            <FormField label="Site URL" hint="Canonical origin — no trailing slash">
              <TextInput
                value={d.site_url}
                onChange={(e) => item.setField("site_url", e.target.value)}
                placeholder="https://www.pxlcreator.space"
              />
            </FormField>
            <FormField label="Support Email" hint="Shown on contact page and order receipts">
              <TextInput
                type="email"
                value={d.support_email}
                onChange={(e) => item.setField("support_email", e.target.value)}
                placeholder="creatorpxl@gmail.com"
              />
            </FormField>
          </FormSection>

          <FormSection title="Identity Assets" description="Logo and favicon. Upload to the general media folder.">
            <FormField label="Logo" hint="Shown in the site header and emails (SVG or PNG, transparent bg recommended)">
              <ImageUploader
                value={d.logo_url ?? ""}
                onChange={(url) => item.setField("logo_url", url || null)}
                folder="general"
              />
            </FormField>
            <FormField label="Favicon" hint="Browser tab icon — 32×32 or 64×64 PNG / ICO">
              <ImageUploader
                value={d.favicon_url ?? ""}
                onChange={(url) => item.setField("favicon_url", url || null)}
                folder="general"
              />
            </FormField>
          </FormSection>

          <FormSection title="Social Links" description="Full URLs including https://.">
            <FormField label="YouTube">
              <TextInput
                value={d.social_youtube ?? ""}
                onChange={(e) => item.setField("social_youtube", e.target.value || null)}
                placeholder="https://youtube.com/@pxlcreator04"
              />
            </FormField>
            <FormField label="Instagram">
              <TextInput
                value={d.social_instagram ?? ""}
                onChange={(e) => item.setField("social_instagram", e.target.value || null)}
                placeholder="https://www.instagram.com/pxl_creator"
              />
            </FormField>
            <FormField label="Twitter / X">
              <TextInput
                value={d.social_twitter ?? ""}
                onChange={(e) => item.setField("social_twitter", e.target.value || null)}
                placeholder="https://twitter.com/pxlcreator"
              />
            </FormField>
            <FormField label="TikTok">
              <TextInput
                value={d.social_tiktok ?? ""}
                onChange={(e) => item.setField("social_tiktok", e.target.value || null)}
                placeholder="https://www.tiktok.com/@pxlcreator"
              />
            </FormField>
          </FormSection>

          <FormSection
            title="Policy Links"
            description="URLs to the Terms of Service, Privacy Policy, Refund Policy, and License pages. Leave blank if the page does not exist yet."
          >
            <FormField label="Terms of Service URL">
              <TextInput
                value={d.policy_terms_url ?? ""}
                onChange={(e) => item.setField("policy_terms_url", e.target.value || null)}
                placeholder="/terms"
              />
            </FormField>
            <FormField label="Privacy Policy URL">
              <TextInput
                value={d.policy_privacy_url ?? ""}
                onChange={(e) => item.setField("policy_privacy_url", e.target.value || null)}
                placeholder="/privacy"
              />
            </FormField>
            <FormField label="Refund Policy URL">
              <TextInput
                value={d.policy_refunds_url ?? ""}
                onChange={(e) => item.setField("policy_refunds_url", e.target.value || null)}
                placeholder="/refunds"
              />
            </FormField>
            <FormField label="License URL">
              <TextInput
                value={d.policy_license_url ?? ""}
                onChange={(e) => item.setField("policy_license_url", e.target.value || null)}
                placeholder="/license"
              />
            </FormField>
          </FormSection>

          <FormSection title="Footer" description="Optional note shown at the bottom of every page.">
            <FormField label="Footer Note" hint="e.g. © 2025 PXL Creator. All rights reserved.">
              <TextArea
                rows={2}
                value={d.footer_note ?? ""}
                onChange={(e) => item.setField("footer_note", e.target.value || null)}
                placeholder="© 2026 PXL Creator. All rights reserved."
              />
            </FormField>
          </FormSection>
        </>
      )}

      <AdminDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} title="History" width="sm">
        <VersionHistoryPanel
          basePath="/api/admin/settings"
          resourceId="default"
          previewFields={["brand_name", "tagline"]}
          onRestored={() => { window.location.reload() }}
        />
      </AdminDrawer>
    </AdminEditShell>
  )
}
