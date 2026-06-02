/**
 * POST /api/community/seed
 *
 * Seed demo data for the current user.
 * Auth required.
 *
 * Creates:
 *   - 3 showcase items for the current user with sample data
 *   - Joins the user to 2 spaces (photography, lightroom-editing) if they exist
 *
 * Returns: { seeded: true, message: string }
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirebaseUidFromRequest } from "@/lib/account/auth"
import { ensureProfile } from "@/lib/community/ensureProfile"

const SAMPLE_SHOWCASES = [
  {
    title: "Golden Hour Portrait Session",
    description:
      "A collection of golden hour portraits shot with natural light. Post-processed in Lightroom with a warm, cinematic grade.",
    item_type: "photo",
    category: "portrait",
    media_urls: [
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800",
    ],
    thumbnail_url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400",
    software_used: ["Lightroom", "Photoshop"],
    hashtags: ["portrait", "goldenhour", "naturalphotography"],
  },
  {
    title: "Urban Landscape — Before & After Edit",
    description:
      "City skyline shot at dusk. Compare the raw file versus the finished grade — dramatic sky replacement and teal-orange look.",
    item_type: "before_after",
    category: "landscape",
    before_url:
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800",
    after_url:
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&sat=-30&con=20",
    thumbnail_url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400",
    software_used: ["Lightroom"],
    hashtags: ["cityscape", "beforeafter", "lightroom"],
  },
  {
    title: "Product Photography — Minimalist Style",
    description:
      "Clean product shots on a white seamless background. Retouched to remove dust and enhance reflections.",
    item_type: "photo",
    category: "product",
    media_urls: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
    ],
    thumbnail_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
    software_used: ["Photoshop", "Capture One"],
    hashtags: ["productphotography", "minimalist", "cleandesign"],
  },
]

const SEED_SPACE_SLUGS = ["photography", "lightroom-editing"]

export async function POST(req: NextRequest) {
  const uid = await getFirebaseUidFromRequest(req)
  if (!uid) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  try {
    const supabase = createAdminClient()

    // Ensure community profile exists
    await ensureProfile(uid)

    const results: { showcases: number; spaces_joined: number } = {
      showcases: 0,
      spaces_joined: 0,
    }

    // Create showcase items
    for (const sample of SAMPLE_SHOWCASES) {
      const { error: insertError } = await supabase
        .from("showcase_items")
        .insert({
          author_uid: uid,
          title: sample.title,
          description: sample.description,
          item_type: sample.item_type,
          category: sample.category,
          media_urls: sample.media_urls ?? [],
          before_url: sample.before_url ?? null,
          after_url: sample.after_url ?? null,
          thumbnail_url: sample.thumbnail_url ?? null,
          software_used: sample.software_used ?? [],
          hashtags: sample.hashtags ?? [],
        })

      if (!insertError) {
        results.showcases++
      }
    }

    // Update author showcase_count
    const { data: currentProfile } = await supabase
      .from("community_profiles")
      .select("showcase_count")
      .eq("firebase_uid", uid)
      .maybeSingle()

    if (currentProfile) {
      await supabase
        .from("community_profiles")
        .update({ showcase_count: (currentProfile.showcase_count ?? 0) + results.showcases } as never)
        .eq("firebase_uid", uid)
    }

    // Join spaces by slug
    for (const slug of SEED_SPACE_SLUGS) {
      const { data: space } = await supabase
        .from("community_spaces")
        .select("id, member_count")
        .eq("slug", slug)
        .maybeSingle()

      if (!space) continue

      const { error: upsertError } = await supabase
        .from("community_space_members")
        .upsert(
          { space_id: space.id, firebase_uid: uid, role: "member" },
          { onConflict: "space_id,firebase_uid", ignoreDuplicates: true }
        )

      if (!upsertError) {
        results.spaces_joined++
        // Increment member_count (best effort)
        await supabase
          .from("community_spaces")
          .update({ member_count: (space.member_count ?? 0) + 1 } as never)
          .eq("id", space.id)
      }
    }

    return NextResponse.json({
      seeded: true,
      message: `Demo content added to your profile: ${results.showcases} showcase items created, joined ${results.spaces_joined} spaces.`,
      details: results,
    })
  } catch (err) {
    console.error("[seed POST] unexpected", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
