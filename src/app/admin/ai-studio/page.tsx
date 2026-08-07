"use client"

/**
 * src/app/admin/ai-studio/page.tsx
 *
 * AI Studio settings — a SINGLETON row (id: "default"), so this is a
 * single settings form, not a list. Reuses useAdminResourceItem with a
 * fixed id (never "new") for autosave + dirty tracking, and the generic
 * VersionHistoryPanel for history/restore.
 *
 * Scope note (see migration 036): the actual Gemini model IDs and system
 * prompt stay env/code-controlled, not here — this covers the rate limit
 * ("Credits"), a kill switch, hero/announcement copy, the quick-vibe
 * prompt chips shown to users, FAQ, and tutorials.
 */

import { useState } from "react"
import { AdminEditShell } from "@/components/admin/AdminEditShell"
import { FormField, FormSection, TextInput, TextArea } from "@/components/admin/ui/FormField"
import { ToggleSwitch } from "@/components/admin/ui/ToggleSwitch"
import { SectionItemsEditor, type SectionItem } from "@/components/admin/ui/SectionItemsEditor"
import { VersionHistoryPanel } from "@/components/admin/ui/VersionHistoryPanel"
import { AdminDrawer } from "@/components/admin/ui/AdminDrawer"
import { useAdminResourceItem } from "@/hooks/admin/useAdminResourceItem"
import type { Database } from "@/types/database"

type Settings = Database["public"]["Tables"]["ai_studio_settings"]["Row"]

interface PromptChip { id: string; label: string; icon: string; keywords: string[] }

const EMPTY_SETTINGS = {
  id: "default", is_enabled: true, free_edits_per_hour: 5,
  hero_badge_label: "", hero_title: "", hero_subtitle: "", fine_print: "", announcement: "",
  prompt_chips: [], faq_items: [], tutorial_items: [],
} as unknown as Settings

export default function AIStudioSettingsPage() {
  const item = useAdminResourceItem<Settings>({
    basePath: "/api/admin/ai-studio",
    id: "default",
    emptyDraft: EMPTY_SETTINGS,
  })
  const [historyOpen, setHistoryOpen] = useState(false)
  const d = item.draft

  const chips = (d?.prompt_chips as unknown as PromptChip[]) ?? []

  function updateChips(next: PromptChip[]) {
    item.setField("prompt_chips", next as unknown as Settings["prompt_chips"])
  }
  function addChip() {
    updateChips([...chips, { id: `chip-${Date.now()}`, label: "", icon: "✦", keywords: [] }])
  }
  function updateChip(i: number, patch: Partial<PromptChip>) {
    updateChips(chips.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }
  function removeChip(i: number) {
    updateChips(chips.filter((_, idx) => idx !== i))
  }

  return (
    <AdminEditShell
      title="AI Studio"
      breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "AI Studio" }]}
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

          <FormSection title="Availability" description="Kill switch and the free-tier rate limit — both enforced by the actual /api/studio/process endpoint, not just cosmetic.">
            <ToggleSwitch
              label="AI Studio Enabled"
              description="Turning this off immediately blocks new edit requests site-wide."
              checked={d.is_enabled}
              onChange={(v) => item.setField("is_enabled", v)}
            />
            <FormField label="Free Edits Per Hour" hint="Per visitor, by IP address">
              <TextInput
                type="number"
                min={1}
                value={d.free_edits_per_hour}
                onChange={(e) => item.setField("free_edits_per_hour", Number(e.target.value))}
              />
            </FormField>
          </FormSection>

          <FormSection title="Hero">
            <FormField label="Badge Label">
              <TextInput value={d.hero_badge_label ?? ""} onChange={(e) => item.setField("hero_badge_label", e.target.value)} />
            </FormField>
            <FormField label="Headline">
              <TextInput value={d.hero_title ?? ""} onChange={(e) => item.setField("hero_title", e.target.value)} />
            </FormField>
            <FormField label="Subheadline">
              <TextArea rows={3} value={d.hero_subtitle ?? ""} onChange={(e) => item.setField("hero_subtitle", e.target.value)} />
            </FormField>
          </FormSection>

          <FormSection title="Announcement" description="Optional small callout above the hero. Leave blank to hide it.">
            <TextInput value={d.announcement ?? ""} onChange={(e) => item.setField("announcement", e.target.value)} placeholder="e.g. New: batch editing is here" />
          </FormSection>

          <FormSection title="Fine Print" description="Shown below the studio tool.">
            <TextArea rows={3} value={d.fine_print ?? ""} onChange={(e) => item.setField("fine_print", e.target.value)} />
          </FormSection>

          <FormSection title="Prompt Chips" description="Quick-vibe suggestions shown above the prompt input. Does not change the underlying AI system prompt.">
            <div className="flex flex-col gap-3">
              {chips.map((chip, i) => (
                <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.6875rem] font-bold uppercase tracking-wide text-white/40">Chip {i + 1}</span>
                    <button type="button" onClick={() => removeChip(i)} className="text-white/30 hover:text-red-400 transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-[1fr_4rem] gap-2">
                    <TextInput value={chip.label} onChange={(e) => updateChip(i, { label: e.target.value })} placeholder="Label, e.g. Golden Hour" />
                    <TextInput value={chip.icon} onChange={(e) => updateChip(i, { icon: e.target.value })} placeholder="☀" />
                  </div>
                  <TextInput
                    value={chip.keywords.join(", ")}
                    onChange={(e) => updateChip(i, { keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })}
                    placeholder="Keywords, comma-separated — warm, golden, amber"
                  />
                </div>
              ))}
              <button type="button" onClick={addChip} className="self-start rounded-lg border border-white/10 px-3.5 py-2 text-[0.8125rem] text-white/60 hover:text-white/90 hover:border-white/25 transition-colors">
                + Add chip
              </button>
            </div>
          </FormSection>

          <FormSection title="FAQ">
            <SectionItemsEditor
              value={(d.faq_items as unknown as SectionItem[]) ?? []}
              onChange={(next) => item.setField("faq_items", next as unknown as Settings["faq_items"])}
              fields={["title", "subtitle"]}
              labels={{ title: "Question", subtitle: "Answer" }}
            />
          </FormSection>

          <FormSection title="Tutorials">
            <SectionItemsEditor
              value={(d.tutorial_items as unknown as SectionItem[]) ?? []}
              onChange={(next) => item.setField("tutorial_items", next as unknown as Settings["tutorial_items"])}
              fields={["image_url", "title", "subtitle", "link_href"]}
              labels={{ subtitle: "Description", link_href: "Video / Article URL" }}
              mediaFolder="ai-studio"
            />
          </FormSection>
        </>
      )}

      <AdminDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} title="History" width="sm">
        <VersionHistoryPanel
          basePath="/api/admin/ai-studio"
          resourceId="default"
          previewFields={["hero_title"]}
          onRestored={() => { window.location.reload() }}
        />
      </AdminDrawer>
    </AdminEditShell>
  )
}
