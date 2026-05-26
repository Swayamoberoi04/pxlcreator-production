/**
 * src/lib/presets/analytics.ts
 *
 * Server-side only. Fire-and-forget view tracking.
 * Never throws — analytics must never block a page render.
 *
 * Requires: 003_analytics.sql migration to have been run.
 */

/**
 * Increment the view counter for a preset.
 * Call from Server Components; uses the admin (service-role) client
 * so it bypasses RLS and works regardless of auth state.
 */
export async function trackPresetView(presetId: string): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const supabase = createAdminClient()
    await supabase.rpc("increment_preset_views", { p_id: presetId })
  } catch {
    // Intentionally swallowed — analytics must not break pages
  }
}
