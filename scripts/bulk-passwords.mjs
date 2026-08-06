/**
 * scripts/bulk-passwords.mjs
 *
 * Bulk-assigns unlock passwords to presets using verified DB IDs.
 * IDs were confirmed by inspecting the live database — no fuzzy matching.
 *
 * Run with:
 *   node --env-file=.env.local scripts/bulk-passwords.mjs
 *
 * Dry-run (report only, no writes):
 *   DRY_RUN=1 node --env-file=.env.local scripts/bulk-passwords.mjs
 */

import { createClient } from "@supabase/supabase-js"

/* ── Explicit mapping: preset display name → { id, password } ─────── */
const MAPPING = [
  { name: "Matte Tone",                 id: "564ff520-9500-4025-9f8d-4bfb1b3ee36d", pwd: "4821" },
  { name: "Cinematic Gold",             id: "31011e45-3b02-49ca-8e98-e7b34e724dae", pwd: "7356" },
  { name: "Misty Forest",               id: "89835991-4303-4c43-9f88-54236ff15d00", pwd: "2948" },
  { name: "Aesthetic Purple",           id: "e74f8139-c749-480d-8331-5b15511317f2", pwd: "6173" },
  { name: "Moody City",                 id: "0f8d653b-a55f-4653-a00c-e0027da9f5fc", pwd: "3527" },
  { name: "Deep Cinematic",             id: "fee86644-b3fe-4c06-8daf-012b0334c614", pwd: "8914" },
  { name: "Clean",                      id: "30962087-c653-44aa-87b7-1036ebcc0b0c", pwd: "1463" },
  { name: "Caramel",                    id: "67c5f5c3-08bb-4155-a7d8-14337dca3615", pwd: "5739" },
  { name: "Dark Blue",                  id: "62ae1ee6-40e9-432d-bdc3-ae291cea037e", pwd: "9246" },
  { name: "Aesthetic Beige Pink",       id: "3b9ae227-159b-434c-a51a-37d2876126a2", pwd: "3081" },
  { name: "Aesthetic Nightvision",      id: "69333b20-1b95-4414-91c9-eac28becd2e7", pwd: "7425" },
  { name: "Red and White",              id: "b45e13a0-ebc4-4578-b8a7-d9f93a6d9817", pwd: "4692" },
  { name: "Aesthetic Beach",            id: "e95242aa-5c47-4e4b-8bba-0d789409fb72", pwd: "8137" },
  { name: "Magical Sunset",             id: "9706d7c9-55ae-4d30-a396-db536795600e", pwd: "2564" },
  { name: "City Grey",                  id: "7fe7ecc0-f651-41e7-a3c6-b25ad5bf69e2", pwd: "6318" },
  { name: "Aqua Red",                   id: "e2feb343-cbc4-4a4e-9bbd-d13d0676e991", pwd: "1284" },
  { name: "Pastel Beach",               id: "bb56ade4-44bc-474c-8803-1d436d39f86c", pwd: "5093" },
  { name: "Fantasy Lightroom",          id: "42514e28-625c-4c63-84f3-b596e3a99230", pwd: "7861" },
  { name: "Motography V2",              id: "6e7ce364-cd0c-436c-acd2-930ecc0f18ce", pwd: "3416" },
  { name: "Moody Green",                id: "741d3f3a-3385-42dc-b855-2aa817f13067", pwd: "9027" },
  { name: "Cinematic Street",           id: "50984b54-6ee6-44aa-b243-210403273a47", pwd: "2371" },
  { name: "Brownish Yellow",            id: "c0fd1929-d629-4605-aafb-95eafe9118a4", pwd: "4963" },
  { name: "Garage",                     id: "7cdd0bae-ff05-4f6d-bef0-7ebc5d10e8bb", pwd: "7208" },
  { name: "Aesthetic Selfie",           id: "b50e973c-d290-4563-8aee-3d81e745ba11", pwd: "3695" },
  { name: "Vintage Car",                id: "597a8134-4150-4e7b-b078-c65cec6fddd0", pwd: "1847" },
  /* Campfire: two DB rows exist; password goes to the correct one (slug: campfire-campingss-...) */
  { name: "Campfire",                   id: "c323e251-c800-4831-b176-ed820b070361", pwd: "5612" },
  { name: "Aesthetic Mood",             id: "5baceda0-623e-4576-82f0-67ea40257f24", pwd: "9374" },
  { name: "Arius",                      id: "ab13f3c6-b693-400b-8d58-934b9b8d688f", pwd: "2086" },
  { name: "Film Green",                 id: "7bfa3203-f9fa-4959-b79a-72da6a55a15f", pwd: "6751" },
  { name: "Silhouette",                 id: "9b084f9c-75d0-4c0a-a82f-6cdb7309a68f", pwd: "4129" },
  { name: "Cinematic Car V1",           id: "8ca4bf93-4cba-402f-bd47-4fbbfeb5a7ab", pwd: "8463" },
  { name: "Chocolate Brown",            id: "6bbad949-f125-4840-a1cf-e58cbe2a78d9", pwd: "3917" },
  { name: "Celestial",                  id: "e880df17-e596-475e-90b7-28039dbfd70d", pwd: "7284" },
  { name: "Travel Blogger",             id: "f0c113f7-0850-4f3e-92b4-f8514ef2d805", pwd: "1538" },
  { name: "Riverdale",                  id: "44904141-2583-4e39-aa4d-fdd22cdd6e26", pwd: "9063" },
  { name: "IG Wanderlust",              id: "c4c892cf-db56-45ba-a85b-67245b1cd161", pwd: "5372" },
  { name: "New York",                   id: "694b9796-b40d-4719-806f-b3d18d48aa47", pwd: "2819" },
  { name: "Hodophile",                  id: "bdc23a24-04b6-4814-a00b-6b692abd0508", pwd: "6045" },
  /* Blogger: DB title is "Dreamy Blogger Preset" */
  { name: "Blogger",                    id: "2bdef854-abb2-40b2-8fc2-c7d8b3a8d9d4", pwd: "8726" },
  /* Retouch: DB title is "Professional HD Retouching In Lightroom Mobile" */
  { name: "Retouch",                    id: "de0718bf-154b-4ee0-ab83-c8ca71f64736", pwd: "3194" },
  { name: "Black Moody",                id: "7b0168e5-f833-49d4-9086-265192e16062", pwd: "7581" },
  /* Indie: DB title has emoji "Indie 🌼 Preset Lightroom" */
  { name: "Indie",                      id: "357c2705-5e89-49a8-88f4-a8f17430fb08", pwd: "9618" },
  { name: "Ruby",                       id: "b8828388-488a-4444-a1b4-d5f109362dc3", pwd: "2743" },
  /* Tempo: DB title "Tempo Mobile Presets free dng" */
  { name: "Tempo",                      id: "75556ee6-6013-4308-a0a9-d1aaa1dd7b1d", pwd: "1372" },
  /* Christmas: DB title "Special Christmas Preset" */
  { name: "Christmas",                  id: "490d4833-581e-454a-b7fa-23c8cba3165e", pwd: "8054" },
  { name: "Pastel Tone",                id: "fe5b0326-076c-475d-90c1-6ba7cb7b4534", pwd: "4681" },
  { name: "Golden Sunrise",             id: "724b2f1d-5c14-4823-aa19-43f3c1dc9d7d", pwd: "7913" },
  { name: "Faded Street",               id: "e82efcfb-c782-4f2d-a17e-862c900dec10", pwd: "3268" },
  /* "How to Edit Cinematic Look": DB title "How To Edit Cinematic Looks Free DNG" */
  { name: "How to Edit Cinematic Look", id: "71f77974-8fbb-4ad0-aa3e-16e53d373457", pwd: "6042" },
  { name: "Magical Portrait",           id: "eb781157-2878-43a3-bc76-12a9c9dd6440", pwd: "9475" },
  { name: "Soft Orange Tone",           id: "e9a3b7cb-7d18-4dcf-9c05-22130f8d95d6", pwd: "2136" },
  /* Vintage: the plain vintage (not Blue, not Car) */
  { name: "Vintage",                    id: "a8d0a6e6-dccf-43e9-bbb2-b7b16d175e2c", pwd: "5894" },
  { name: "Red Velvet",                 id: "28fe045d-20b9-414a-a947-8a85895c24e5", pwd: "8317" },
  /* Anime: DB title "Anime Style Preset" */
  { name: "Anime",                      id: "f646f7a1-d847-4356-b759-72c364e2ce83", pwd: "1629" },
  /* Black and Orange: DB title "Black & Orange Preset" */
  { name: "Black and Orange",           id: "8426e9f5-e8ec-446d-b6e7-0e2fc971c513", pwd: "4083" },
  /* Frozen: DB title "Frozen Winter Preset" */
  { name: "Frozen",                     id: "a595aee8-b8bf-4872-a427-71fa9383cd20", pwd: "7546" },
  { name: "Matte Blue",                 id: "ecb3b22d-0fa4-4e64-82dd-676e6cfee493", pwd: "3912" },
  { name: "Aqua Sunset",                id: "8b53e1c6-29fe-4a8b-ac21-eefb8c0b7f51", pwd: "6284" },
  /* Urban: the base Urban preset (not V2/Retro/Steel/Classic) */
  { name: "Urban",                      id: "65a3f35f-08c8-4d11-a097-bd2a45a0224b", pwd: "9137" },
  { name: "Moody Red",                  id: "4839da4a-f7fd-47ea-8ab1-d66ceb01dfc5", pwd: "2708" },
  { name: "Grainy Vintage",             id: "ffb23519-a678-42f2-9168-f85113220a4a", pwd: "5361" },
  { name: "Cinematic Blue",             id: "b288e395-09c5-45e6-9202-9ac755a6e98e", pwd: "8049" },
  /* Portrait Black & White: DB title "Portrait black and white presets free dng" */
  { name: "Portrait Black & White",     id: "2c0d4d7f-9bea-4a55-bf04-c604009774aa", pwd: "4726" },
  { name: "Urban Classic",              id: "17b5df79-1903-4f09-9955-3983f913a904", pwd: "1583" },
  { name: "Moody Brown",                id: "fa3e2eef-029d-4706-9eca-7278db723800", pwd: "9214" },
  { name: "Moody Night Tone",           id: "5aa3ac58-7712-416b-ac6c-d23b01063e1b", pwd: "3847" },
  { name: "Film Faded",                 id: "3ffc26bd-cfe0-4c9f-99d1-05c70a785d2c", pwd: "6093" },
  { name: "Bali",                       id: "80623d0a-4279-445f-956f-77595588d924", pwd: "7521" },
  /* Jordi Koalitic: DB title "@JordiKoalitics free dng" */
  { name: "Jordi Koalitic",             id: "6ca331ec-5b59-4452-a93e-f4e7ec5cafe8", pwd: "2469" },
  { name: "Dark Grey Tone",             id: "a365aeb2-3c30-4aee-8f83-e9d46ea25249", pwd: "5138" },
  { name: "Cyberpunk",                  id: "650d3abe-1200-4e29-969d-5edc2825a4c8", pwd: "8672" },
  /* Summer: DB title "Summer Vibe preset" */
  { name: "Summer",                     id: "22322e7f-d568-4d4d-8e0c-db6bc54fd756", pwd: "4015" },
  { name: "Rich Black",                 id: "b2dafa6b-3e80-4855-9324-741cefe1ae61", pwd: "9386" },
  { name: "Deep Sky Tone",              id: "cbd03ade-0cf1-43af-b243-6a6081ce57f4", pwd: "1724" },
  { name: "Bokeh Light Effect",         id: "a8818ad7-52e4-4fc2-acec-1ebd5b442dfb", pwd: "6957" },
  { name: "Cream Tone",                 id: "94405054-28d3-4b70-abdc-27f28520986a", pwd: "3241" },
  /* Dark Disposable Camera: DB title has 📸 emoji */
  { name: "Dark Disposable Camera",     id: "66fac4de-1c54-4455-b604-c52fba7ec0de", pwd: "7803" },
  { name: "Black Urban",                id: "251b1b48-dbbe-4b59-b849-aad8da183df8", pwd: "5469" },
  /* Orange Teal: DB title misspelled "Orang teal preset" */
  { name: "Orange Teal",                id: "c7a6f21c-dc32-4dea-a94a-446569c2813e", pwd: "2917" },
  { name: "Tokyo",                      id: "8bdd5dc7-9b8f-41f1-8182-cf20773351f8", pwd: "8634" },
  { name: "Dual Tone",                  id: "0f043d11-74ec-40d1-9a96-8e412adb39a7", pwd: "1076" },
  { name: "Light Denim",                id: "bfbd8ca6-ce4e-4c1a-89c3-6c38f3fdc951", pwd: "4593" },
  /* Warm Golden: DB title "Danish zehen inspired | Warm golden presets" */
  { name: "Warm Golden",                id: "5329b822-3f05-450f-98c2-a69b0af0adcb", pwd: "7162" },
  { name: "Motography",                 id: "fe86d489-ddc8-4a05-a98c-e33982add9d6", pwd: "9841" },
  { name: "Adventure",                  id: "396364c1-d45a-4347-a0a2-4feb64bc1ca1", pwd: "6427" },
  /* Film Grey: DB title "Film grey tone" */
  { name: "Film Grey",                  id: "bf201fa1-54a8-452e-bf28-edc908bcc9c5", pwd: "1895" },
  { name: "Dark Black Tone Effect",     id: "22c40873-d057-4b4b-9e77-78ee3b722709", pwd: "5274" },
  { name: "Food Blogger",               id: "be24a459-5e8f-4fee-ab6b-04e41d3fc146", pwd: "8361" },
  { name: "Urban V2",                   id: "416e08d0-26c4-46ed-89b1-b24d6da50f8f", pwd: "9752" },
  { name: "Vibrant Red",                id: "ec7372d6-b690-4188-80e8-51c13de65d9c", pwd: "6584" },
  { name: "Vintage Blue",               id: "35b97913-2baa-4d15-af37-ea38c6d19268", pwd: "8146" },
  { name: "Vanilla",                    id: "ff8938b9-ac48-4f6b-8c80-12fc8bbed1e6", pwd: "4237" },
  { name: "Urban Retro",                id: "070be95c-cc00-48e3-84e6-402dabb0f21f", pwd: "5906" },
  { name: "Urban Steel",                id: "5cf004d3-1ee6-463b-a35b-dd1e527125b9", pwd: "3058" },
]

/* Presets intentionally skipped (not in user's mapping):
   - " Mint Blue Tone"          (321b5feb)
   - "Campfire Preset / Adventure Presets"  (930ece24, slug: golden-hour-portrait)
   - "Cinematic v3"             (a0e6ca59, slug: cinematic-starter-bundle)
   - "Cinematic v3 Preset"      (bdb8b556)
   - "Nightlife Preset"         (c8cb38b8)
   - "Teal Rust Preset"         (2a7f10df)
   - "Tropical Preset"          (9b0efe5c)
*/

const DRY_RUN = process.env.DRY_RUN === "1"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(DRY_RUN
    ? "\n🔎  DRY RUN — no writes will occur.\n"
    : "\n🚀  Starting bulk password migration…\n"
  )

  /* ── 1. Validate: detect duplicate IDs in the mapping itself ── */
  const idSeen = new Map()
  for (const entry of MAPPING) {
    if (idSeen.has(entry.id)) {
      console.error(`❌  Duplicate ID in mapping: ${entry.id} (${entry.name} vs ${idSeen.get(entry.id)})`)
      process.exit(1)
    }
    idSeen.set(entry.id, entry.name)
  }

  /* ── 2. Validate: detect duplicate passwords across different presets ── */
  const pwdSeen = new Map()
  const pwdDups = []
  for (const entry of MAPPING) {
    if (pwdSeen.has(entry.pwd)) {
      pwdDups.push(`${entry.pwd}: ${pwdSeen.get(entry.pwd)} / ${entry.name}`)
    } else {
      pwdSeen.set(entry.pwd, entry.name)
    }
  }
  if (pwdDups.length > 0) {
    console.warn(`⚠️   Duplicate passwords (different presets share the same code):`)
    for (const d of pwdDups) console.warn(`     ${d}`)
    console.warn("")
  }

  /* ── 3. Verify all IDs exist in the database ── */
  const ids = MAPPING.map((e) => e.id)
  const { data: foundPresets, error: verifyErr } = await supabase
    .from("presets")
    .select("id, title, unlock_password")
    .in("id", ids)

  if (verifyErr) {
    console.error("❌  DB verify error:", verifyErr.message)
    process.exit(1)
  }

  const foundById = new Map(foundPresets.map((p) => [p.id, p]))
  const missingIds = ids.filter((id) => !foundById.has(id))

  if (missingIds.length > 0) {
    console.error(`❌  The following IDs from the mapping were NOT found in the database:`)
    for (const id of missingIds) {
      const name = MAPPING.find((e) => e.id === id)?.name ?? "?"
      console.error(`     ${id} (${name})`)
    }
    process.exit(1)
  }

  /* ── 4. Print plan ── */
  console.log("=".repeat(68))
  console.log(`  Total in mapping:  ${MAPPING.length}`)
  console.log(`  All IDs verified:  ✅`)
  if (pwdDups.length) console.log(`  Password collisions: ${pwdDups.length} ⚠️`)
  console.log("=".repeat(68) + "\n")

  if (DRY_RUN) {
    for (const entry of MAPPING) {
      const current = foundById.get(entry.id)?.unlock_password
      const status  = current === entry.pwd ? "(no change)" : current ? `(was: ${current})` : "(currently null)"
      console.log(`   [${entry.id.substring(0, 8)}] "${entry.name}" → ${entry.pwd}  ${status}`)
    }
    console.log("\n   (Omit DRY_RUN=1 to execute for real.)")
    return
  }

  /* ── 5. Execute updates ── */
  const now      = new Date().toISOString()
  const updater  = "bulk-migration-script"
  let   updated  = 0
  let   skipped  = 0
  const failures = []

  for (const entry of MAPPING) {
    const current = foundById.get(entry.id)?.unlock_password

    if (current === entry.pwd) {
      console.log(`   ⏭  [SKIP] "${entry.name}" — already correct`)
      skipped++
      continue
    }

    const { error } = await supabase
      .from("presets")
      .update({
        unlock_password:     entry.pwd,
        password_updated_at: now,
        password_updated_by: updater,
      })
      .eq("id", entry.id)

    if (error) {
      console.error(`   ❌  FAILED "${entry.name}": ${error.message}`)
      failures.push(entry)
    } else {
      console.log(`   ✅  "${entry.name}" → ${entry.pwd}`)
      updated++
    }
  }

  /* ── 6. Verify round-trip: read back all passwords ── */
  console.log("\n   Verifying round-trip reads…")
  const { data: verifiedRows } = await supabase
    .from("presets")
    .select("id, unlock_password")
    .in("id", ids)

  const verifiedById = new Map(verifiedRows?.map((r) => [r.id, r.unlock_password]) ?? [])
  const verifyFailed = []
  for (const entry of MAPPING) {
    const stored = verifiedById.get(entry.id)
    if (stored !== entry.pwd) {
      verifyFailed.push({ ...entry, stored })
    }
  }

  /* ── 7. Final report ── */
  console.log("\n" + "=".repeat(68))
  console.log("  MIGRATION COMPLETE")
  console.log("=".repeat(68))
  console.log(`  ✅  Updated:        ${updated}`)
  console.log(`  ⏭  Already correct: ${skipped}`)
  console.log(`  ❌  Write failures:  ${failures.length}`)
  console.log(`  ❌  Verify failures: ${verifyFailed.length}`)

  if (failures.length > 0) {
    console.log("\n  WRITE FAILURES:")
    for (const f of failures) console.log(`     - "${f.name}" (${f.id})`)
  }

  if (verifyFailed.length > 0) {
    console.log("\n  VERIFY FAILURES (stored value ≠ expected):")
    for (const f of verifyFailed) console.log(`     - "${f.name}": expected ${f.pwd}, got ${f.stored}`)
  }

  if (failures.length > 0 || verifyFailed.length > 0) {
    process.exit(1)
  }

  console.log("\n  All passwords stored and verified. ✅\n")
}

main().catch((err) => {
  console.error("\n❌  Unexpected error:", err)
  process.exit(1)
})
