/**
 * src/lib/community/ensureProfile.ts
 *
 * Creates a minimal community_profiles row for a user if they don't have one yet.
 * Call at the start of any community action that requires a profile.
 */

import { createAdminClient } from "@/lib/supabase/admin"

function generateUsername(uid: string): string {
  return "creator_" + uid.slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, "")
}

export async function ensureProfile(
  firebase_uid: string,
  displayName?: string,
  email?: string
) {
  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from("community_profiles")
    .select("id, username")
    .eq("firebase_uid", firebase_uid)
    .maybeSingle()

  if (existing) return existing

  // Generate unique username
  let username = generateUsername(firebase_uid)
  if (displayName) {
    username = displayName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/__+/g, "_")
      .slice(0, 30)
    // Ensure uniqueness
    const { data: conflict } = await supabase
      .from("community_profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle()
    if (conflict) username = username.slice(0, 22) + "_" + firebase_uid.slice(0, 6)
  }

  const { data } = await supabase
    .from("community_profiles")
    .insert({
      firebase_uid,
      username,
      display_name: displayName ?? username,
    })
    .select("id, username")
    .single()

  return data
}
