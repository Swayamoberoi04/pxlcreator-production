/**
 * src/scripts/seed-presets.ts
 *
 * Seeds your Supabase database with the existing static presets.
 * Run ONCE after setting up Supabase to migrate hardcoded data.
 *
 * Usage:
 *   npx tsx src/scripts/seed-presets.ts
 *
 * Prerequisites:
 *   1. Supabase project created
 *   2. SQL migrations run (001 + 002)
 *   3. .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config"
import { createClient } from "@supabase/supabase-js"
import { ALL_PRESETS }  from "../data/presets"

/* ── Config ── */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

// Use `any` here — this is a one-time migration script, not production API code
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/* ── Category slug → DB slug map ── */
const CATEGORY_SLUG_MAP: Record<string, string> = {
  "Cinematic":      "cinematic",
  "Film Emulation": "film-emulation",
  "Portrait":       "portrait",
  "Landscape":      "landscape",
  "Street":         "street",
}

async function seed() {
  console.log("🌱 Starting PXL Creator preset seed...\n")

  /* 1. Fetch categories */
  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id, slug")

  if (catErr || !categories?.length) {
    console.error("❌ Could not fetch categories. Did you run 002_seed_categories.sql?", catErr?.message)
    process.exit(1)
  }

  const catMap: Record<string, string> = {}
  for (const cat of categories) {
    catMap[cat.slug] = cat.id
  }

  console.log(`✓ Found ${categories.length} categories\n`)

  /* 2. Insert presets */
  let inserted = 0
  let skipped  = 0

  for (const [index, preset] of ALL_PRESETS.entries()) {
    const categorySlug = CATEGORY_SLUG_MAP[preset.category] ?? "cinematic"
    const categoryId   = catMap[categorySlug] ?? null

    /* Check if slug already exists */
    const { data: existing } = await supabase
      .from("presets")
      .select("id")
      .eq("slug", preset.slug)
      .maybeSingle()

    if (existing) {
      console.log(`  ⊙ Skipped (exists): ${preset.name}`)
      skipped++
      continue
    }

    /* Insert preset */
    const { data: created, error } = await supabase
      .from("presets")
      .insert({
        slug:               preset.slug,
        title:              preset.name,
        tagline:            preset.tagline         ?? null,
        description:        preset.description     ?? null,
        category_id:        categoryId,
        thumbnail_url:      preset.thumbnailUrl    ?? null,
        before_url:         preset.beforeUrl       ?? null,
        after_url:          preset.afterUrl        ?? null,
        price:              preset.price,
        original_price:     preset.originalPrice   ?? null,
        is_free:            preset.isFree          ?? false,
        is_featured:        preset.isFeatured,
        is_published:       true,
        badge:              preset.badge           ?? null,
        download_file_name: preset.downloadFileName ?? null,
        include_count:      preset.includeCount    ?? null,
        preset_type:        "lightroom",
        features:           preset.features        ?? [],
        compatibility:      preset.compatibility   ?? ["Lightroom Classic", "Lightroom CC", "Camera Raw"],
        ai_tags:            preset.aiTags          ?? [],
        rating:             preset.rating,
        review_count:       preset.reviewCount,
        order_index:        index,
      } as any)
      .select("id")
      .single()

    if (error || !created) {
      console.error(`  ❌ Failed: "${preset.name}" —`, error?.message)
      continue
    }

    /* Insert gallery images */
    if (preset.images && preset.images.length > 0) {
      await supabase
        .from("preset_images")
        .insert(
          preset.images.map((imgUrl, i) => ({
            preset_id:   created.id,
            url:         imgUrl,
            alt_text:    `${preset.name} — sample ${i + 1}`,
            order_index: i,
          })) as any
        )
    }

    console.log(`  ✓ Inserted: ${preset.name}  (${preset.category})`)
    inserted++
  }

  console.log(`\n✅ Seed complete — ${inserted} inserted, ${skipped} skipped`)
  console.log("\nNext steps:")
  console.log("  1. Verify at https://supabase.com → Table Editor → presets")
  console.log("  2. Go to /admin → Dashboard to see your presets")
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err)
  process.exit(1)
})
