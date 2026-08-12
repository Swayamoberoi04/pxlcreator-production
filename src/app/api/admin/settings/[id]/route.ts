/**
 * GET/PUT/PATCH/DELETE /api/admin/settings/[id] — [id] is always "default"
 */
import { createAdminCrudItemRoutes, type CrudConfig } from "@/lib/admin/crud-factory"
import type { Database } from "@/types/database"

export const dynamic = "force-dynamic"

type SettingsInsert = Database["public"]["Tables"]["global_settings"]["Insert"]

export const globalSettingsCrudConfig: CrudConfig<SettingsInsert> = {
  table: "global_settings",
  permission: "settings",
  versioning: true,
  writableFields: [
    "brand_name", "tagline", "description", "site_url", "support_email",
    "logo_url", "favicon_url",
    "social_youtube", "social_instagram", "social_twitter", "social_tiktok",
    "policy_terms_url", "policy_privacy_url", "policy_refunds_url", "policy_license_url",
    "footer_note", "maintenance_mode",
  ],
}

export const { GET, PUT, PATCH, DELETE } = createAdminCrudItemRoutes<SettingsInsert>(globalSettingsCrudConfig)
