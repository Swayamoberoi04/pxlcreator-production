/**
 * src/lib/admin/media-constants.ts
 *
 * Client-safe constants shared between the server-only upload logic
 * (src/lib/admin/storage.ts, which imports `sharp` and must never reach
 * the browser bundle) and client components (ImageUploader, GalleryUploader,
 * FilePicker, the Media Library page) that just need the folder list.
 */

export const MEDIA_BUCKET = "media"

export const MEDIA_FOLDERS = [
  "presets", "bundles", "courses", "blogs", "community", "ai-studio", "editor", "general",
] as const

export type MediaFolder = (typeof MEDIA_FOLDERS)[number]
