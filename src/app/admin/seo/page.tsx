"use client"

/**
 * src/app/admin/seo/page.tsx
 *
 * Global SEO Manager — one row per index/listing page (Homepage, Store,
 * Bundles, Courses, Blog, Community, AI Studio). Individual content items
 * (a preset, a course, a post) already manage their own SEO via SEOForm
 * on their own edit page — this covers the pages that aren't a DB record.
 *
 * Composed as a fixed list + edit drawer (like Homepage CMS), not
 * AdminListPage — 7 fixed pages isn't a search/filter/paginate resource.
 */

import { useState } from "react"
import Link from "next/link"
import { useAdminResource } from "@/hooks/admin/useAdminResource"
import { Breadcrumbs } from "@/components/admin/ui/Breadcrumbs"
import { AdminDrawer } from "@/components/admin/ui/AdminDrawer"
import { FormField, FormSection, TextInput, TextArea, Select } from "@/components/admin/ui/FormField"
import { SEOForm } from "@/components/admin/ui/SEOForm"
import { VersionHistoryPanel } from "@/components/admin/ui/VersionHistoryPanel"
import { TableSkeleton } from "@/components/admin/ui/Skeleton"
import type { Database } from "@/types/database"

type SeoRow = Database["public"]["Tables"]["site_seo"]["Row"]

export default function SeoManagerPage() {
  const resource = useAdminResource<SeoRow>({
    basePath: "/api/admin/seo",
    getId: (s) => s.id,
  })
  const [editing, setEditing] = useState<SeoRow | null>(null)
  const [historyFor, setHistoryFor] = useState<SeoRow | null>(null)

  const pages = [...resource.items].sort((a, b) => a.label.localeCompare(b.label))

  return (
    <div className="flex flex-col gap-6 px-6 sm:px-8 py-6 sm:py-8 max-w-[900px] mx-auto w-full">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "SEO Manager" }]} />

      <div className="flex flex-col gap-1">
        <h1 className="text-[1.375rem] font-bold text-white/95">SEO Manager</h1>
        <p className="text-[0.8125rem] text-white/45">
          Meta title, description, keywords, Open Graph, Twitter Card, and canonical URL for every index page.
          Individual presets/bundles/courses/posts manage their own SEO on their own edit page.
        </p>
      </div>

      {resource.error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-[0.8125rem] text-red-300">
          {resource.error}
        </div>
      )}

      {resource.loading ? (
        <TableSkeleton rows={7} columns={3} />
      ) : (
        <div className="flex flex-col gap-2">
          {pages.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5 hover:border-white/[0.12] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[0.875rem] font-medium text-white/85 truncate">{p.label}</p>
                <p className="text-[0.7rem] text-white/35 truncate">{p.seo_title || "No custom title set — using default"}</p>
              </div>

              <Link
                href={p.path}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[0.75rem] text-white/40 hover:text-white/70 transition-colors"
              >
                {p.path}
              </Link>

              <button
                type="button"
                onClick={() => setEditing(p)}
                className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-[0.75rem] text-white/60 hover:text-white/90 hover:border-white/25 transition-colors"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit drawer ── */}
      <AdminDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.label}
        width="lg"
        footer={
          <>
            {editing && (
              <button
                type="button"
                onClick={() => setHistoryFor(editing)}
                className="mr-auto text-[0.8125rem] text-white/50 hover:text-white/85 transition-colors"
              >
                History
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg bg-gold px-4 py-2 text-[0.8125rem] font-semibold text-background hover:bg-gold/90 transition-colors"
            >
              Done
            </button>
          </>
        }
      >
        {editing && (
          <div className="flex flex-col gap-5">
            <SEOForm
              mediaFolder="general"
              showCanonicalUrl
              value={{
                seoTitle: editing.seo_title ?? "",
                seoDescription: editing.seo_description ?? "",
                seoKeywords: editing.seo_keywords ?? "",
                ogImage: editing.og_image_url ?? "",
                canonicalUrl: editing.canonical_url ?? "",
              }}
              onChange={(next) => {
                void resource.patch(editing.id, {
                  seo_title: next.seoTitle ?? "",
                  seo_description: next.seoDescription ?? "",
                  seo_keywords: next.seoKeywords ?? "",
                  og_image_url: next.ogImage ?? "",
                  canonical_url: next.canonicalUrl ?? "",
                } as Partial<SeoRow>)
              }}
            />

            <FormSection title="Social Cards" description="How this page's OG type and Twitter card behave when shared.">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="OG Type">
                  <TextInput
                    defaultValue={editing.og_type}
                    onBlur={(e) => void resource.patch(editing.id, { og_type: e.target.value } as Partial<SeoRow>)}
                    placeholder="website"
                  />
                </FormField>
                <FormField label="Twitter Card">
                  <Select
                    defaultValue={editing.twitter_card}
                    onChange={(e) => void resource.patch(editing.id, { twitter_card: e.target.value as SeoRow["twitter_card"] } as Partial<SeoRow>)}
                  >
                    <option value="summary_large_image">Summary Large Image</option>
                    <option value="summary">Summary</option>
                  </Select>
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Structured Data" description="Optional raw JSON-LD override. Leave blank to use the page's default schema.">
              <TextArea
                rows={6}
                defaultValue={editing.schema_json ? JSON.stringify(editing.schema_json, null, 2) : ""}
                onBlur={(e) => {
                  const raw = e.target.value.trim()
                  if (!raw) { void resource.patch(editing.id, { schema_json: null } as Partial<SeoRow>); return }
                  try {
                    const parsed = JSON.parse(raw)
                    void resource.patch(editing.id, { schema_json: parsed } as Partial<SeoRow>)
                  } catch {
                    // Invalid JSON — leave stored value untouched rather than corrupt it.
                  }
                }}
                placeholder='{ "@type": "Organization", ... }'
                className="font-mono text-[0.8125rem]"
              />
            </FormSection>
          </div>
        )}
      </AdminDrawer>

      {/* ── History drawer ── */}
      <AdminDrawer
        open={!!historyFor}
        onClose={() => setHistoryFor(null)}
        title={historyFor ? `History — ${historyFor.label}` : undefined}
        width="sm"
      >
        {historyFor && (
          <VersionHistoryPanel
            basePath="/api/admin/seo"
            resourceId={historyFor.id}
            previewFields={["seo_title"]}
            onRestored={() => { void resource.refresh(); setHistoryFor(null) }}
          />
        )}
      </AdminDrawer>
    </div>
  )
}
