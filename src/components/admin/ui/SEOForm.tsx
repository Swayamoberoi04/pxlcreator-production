"use client"

import { FormField, FormSection, TextInput, TextArea } from "./FormField"
import { ImageUploader } from "./ImageUploader"

export interface SEOData {
  seoTitle?:       string
  seoDescription?: string
  seoKeywords?:    string   // comma-separated
  ogImage?:        string
}

interface SEOFormProps {
  value: SEOData
  onChange: (next: SEOData) => void
  /** Folder passed to the OG image uploader, e.g. "courses", "blogs". */
  mediaFolder: string
}

/**
 * Reusable SEO block — title / description / keywords / OG image.
 * Every future module (Courses, Blog, Homepage sections, ...) embeds this
 * instead of re-declaring its own SEO fields.
 */
export function SEOForm({ value, onChange, mediaFolder }: SEOFormProps) {
  const titleLen = (value.seoTitle ?? "").length
  const descLen  = (value.seoDescription ?? "").length

  return (
    <FormSection title="SEO" description="Controls how this appears in search results and social shares.">
      <FormField label="SEO Title" hint={`${titleLen}/70 characters`}>
        <TextInput
          value={value.seoTitle ?? ""}
          onChange={(e) => onChange({ ...value, seoTitle: e.target.value })}
          maxLength={70}
          placeholder="Defaults to the page title if left blank"
        />
      </FormField>

      <FormField label="SEO Description" hint={`${descLen}/160 characters`}>
        <TextArea
          value={value.seoDescription ?? ""}
          onChange={(e) => onChange({ ...value, seoDescription: e.target.value })}
          maxLength={160}
          rows={3}
          placeholder="Shown under the title in search results"
        />
      </FormField>

      <FormField label="SEO Keywords" hint="Comma-separated">
        <TextInput
          value={value.seoKeywords ?? ""}
          onChange={(e) => onChange({ ...value, seoKeywords: e.target.value })}
          placeholder="lightroom preset, photo editing, cinematic"
        />
      </FormField>

      <FormField label="Open Graph Image" hint="Shown when this is shared on social media (1200×630 recommended)">
        <ImageUploader
          value={value.ogImage ?? ""}
          onChange={(url) => onChange({ ...value, ogImage: url })}
          folder={mediaFolder}
        />
      </FormField>
    </FormSection>
  )
}
