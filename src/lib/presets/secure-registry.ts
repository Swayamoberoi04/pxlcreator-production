/**
 * src/lib/presets/secure-registry.ts
 *
 * SERVER-ONLY — import 'server-only' enforces this at build time.
 * Never import this file from any "use client" component or page.
 *
 * Single source of truth for:
 *   • Google Drive download URLs (never sent to the browser directly)
 *   • Per-preset unlock passwords (never exposed to the client)
 *   • Free-preset flags
 *
 * Lookup: getSecurePreset(presetName)  — O(1), case-insensitive title match
 */

import "server-only"

export interface SecurePreset {
  title:       string
  slug:        string
  downloadUrl: string        // Google Drive URL or "NA"
  password:    string | null // null = free preset, string = 4-digit unlock code
  isFree:      boolean
  // Future payment integration — not used yet
  requiresPurchase?: boolean
  purchaseId?:       string | null
  licenseType?:      "personal" | "commercial" | null
  ownerId?:          string | null
}

const REGISTRY: SecurePreset[] = [
  /* ── FREE PRESETS (5) — password: null, isFree: true ─────────────────────── */
  {
    title:       "teal and rust preset",
    slug:        "teal-and-rust-preset",
    downloadUrl: "https://drive.google.com/file/d/1AGkYBYYrDQjKcA2_Fx_SP0MIMTuTJMkj/view?usp=sharing",
    password:    null,
    isFree:      true,
  },
  {
    title:       "how to create mint blue",
    slug:        "how-to-create-mint-blue",
    downloadUrl: "https://drive.google.com/file/d/1gZgi9LhOZQhNpKXEWYFUU1Y8bWnWDFwJ/view?usp=sharing",
    password:    null,
    isFree:      true,
  },
  {
    title:       "tropical preset",
    slug:        "tropical-preset",
    downloadUrl: "https://drive.google.com/file/d/1yf5OsImwg8NDiLqSmqwkaY_n9Au1C1LE/view?usp=sharing",
    password:    null,
    isFree:      true,
  },
  {
    title:       "cinematic v3 preset",
    slug:        "cinematic-v3-preset",
    downloadUrl: "https://drive.google.com/file/d/1xcUZmJa_qFHlCKsbNPa3FnPozbBHzT_J/view?usp=sharing",
    password:    null,
    isFree:      true,
  },
  {
    title:       "nightlife",
    slug:        "nightlife",
    downloadUrl: "https://drive.google.com/file/d/1152__jw9YhbQYEfiP2Jv4WpAHUEu7Cra/view?usp=sharing",
    password:    null,
    isFree:      true,
  },

  /* ── PAID PRESETS (94) — unique 4-digit passwords ─────────────────────────── */
  {
    title:       "matte tone",
    slug:        "matte-tone",
    downloadUrl: "https://drive.google.com/file/d/1xSQ2JcShFPYO0U5t4PWGtjJ8OkC1Lus0/view?usp=sharing",
    password:    "4821",
    isFree:      false,
  },
  {
    title:       "cinematic gold",
    slug:        "cinematic-gold",
    downloadUrl: "https://drive.google.com/file/d/1vtnOyY0_-R5oAw5WMZ1uXaxj9tIqwP3p/view?usp=sharing",
    password:    "7356",
    isFree:      false,
  },
  {
    title:       "misty forest",
    slug:        "misty-forest",
    downloadUrl: "https://drive.google.com/file/d/1uAY6Gpey9fTjXHYI3bF7oceA6GpK62RJ/view?usp=sharing",
    password:    "2948",
    isFree:      false,
  },
  {
    title:       "aesthetic purple",
    slug:        "aesthetic-purple",
    downloadUrl: "https://drive.google.com/file/d/1r60gguePjZx3VLaABgpot0Jtdvk9BmQV/view?usp=sharing",
    password:    "6173",
    isFree:      false,
  },
  {
    title:       "moody city",
    slug:        "moody-city",
    downloadUrl: "https://drive.google.com/file/d/1lsXAphSzWLaTVqAfO5MySKNwJYW38TgL/view?usp=sharing",
    password:    "3527",
    isFree:      false,
  },
  {
    title:       "deep cinematic",
    slug:        "deep-cinematic",
    downloadUrl: "https://drive.google.com/file/d/1gwvhB9uneFTTDyKCZDC0YN7tYsaBC-az/view?usp=sharing",
    password:    "8914",
    isFree:      false,
  },
  {
    title:       "clean",
    slug:        "clean",
    downloadUrl: "https://drive.google.com/file/d/1gO9mI12xF5H5T_vxxJ-53z0y0-YSdngl/view?usp=sharing",
    password:    "1463",
    isFree:      false,
  },
  {
    title:       "caramel",
    slug:        "caramel",
    downloadUrl: "https://drive.google.com/file/d/1ejUQyj-h3eYDLW_UiHvCQVcNvX_aCSAa/view?usp=sharing",
    password:    "5739",
    isFree:      false,
  },
  {
    title:       "dark blue",
    slug:        "dark-blue",
    downloadUrl: "https://drive.google.com/file/d/1ExG2qkEG_DOFDgzyfs46TkPIUMRHDXk6/view?usp=sharing",
    password:    "9246",
    isFree:      false,
  },
  {
    title:       "aesthetic beige pink",
    slug:        "aesthetic-beige-pink",
    downloadUrl: "https://drive.google.com/file/d/199-2OyiB1uhbU9JcrFQEWdJD8PA5jdfy/view?usp=sharing",
    password:    "3081",
    isFree:      false,
  },
  {
    title:       "aesthetic nightvision",
    slug:        "aesthetic-nightvision",
    downloadUrl: "https://drive.google.com/file/d/14JqA_HAIPN5x3dMk0oVvqS139QVkAT3N/view?usp=sharing",
    password:    "7425",
    isFree:      false,
  },
  {
    title:       "red and white",
    slug:        "red-and-white",
    downloadUrl: "https://drive.google.com/file/d/12zbyI5c6biB-0jTZejXbj9R16Eigy4Vo/view?usp=sharing",
    password:    "4692",
    isFree:      false,
  },
  {
    title:       "aesthetic beach",
    slug:        "aesthetic-beach",
    downloadUrl: "https://drive.google.com/file/d/12AgBENNR1_cblYFGkR0N4q1pNrSTGOdZ/view?usp=sharing",
    password:    "8137",
    isFree:      false,
  },
  {
    title:       "magical sunset",
    slug:        "magical-sunset",
    downloadUrl: "https://drive.google.com/file/d/1ygMRyrlQpgd3jefKTj-KMACkNSJCU-Ge/view?usp=sharing",
    password:    "2564",
    isFree:      false,
  },
  {
    title:       "city grey",
    slug:        "city-grey",
    downloadUrl: "https://drive.google.com/file/d/1xiVtNpGVydl8gNmSCq5d11sqmdkg-mpf/view?usp=sharing",
    password:    "6318",
    isFree:      false,
  },
  {
    title:       "urban v2",
    slug:        "urban-v2",
    downloadUrl: "https://drive.google.com/file/d/1wsBmZHLn3ECz-HdVvhb_ZF9QN0JMAGMC/view?usp=sharing",
    password:    "9752",
    isFree:      false,
  },
  {
    title:       "aqua red",
    slug:        "aqua-red",
    downloadUrl: "https://drive.google.com/file/d/1wCvlewGVCYBh4FmeQ6RWQTLDveNCXm2m/view?usp=sharing",
    password:    "1284",
    isFree:      false,
  },
  {
    title:       "pastel beach",
    slug:        "pastel-beach",
    downloadUrl: "https://drive.google.com/file/d/1vkxiweudP4uX0ksS51LsrZ_AGbZD8AvT/view?usp=sharing",
    password:    "5093",
    isFree:      false,
  },
  {
    title:       "fantasy lightroom",
    slug:        "fantasy-lightroom",
    downloadUrl: "https://drive.google.com/file/d/1tmcwsi0FV-zEFYcY5Vbpzi4rS6-6qus9/view?usp=sharing",
    password:    "7861",
    isFree:      false,
  },
  {
    title:       "motography v2",
    slug:        "motography-v2",
    downloadUrl: "https://drive.google.com/file/d/1sO3mtoIVFqxV9v3FB-mMBaKVMTjGM9JF/view?usp=sharing",
    password:    "3416",
    isFree:      false,
  },
  {
    title:       "moody green",
    slug:        "moody-green",
    downloadUrl: "https://drive.google.com/file/d/1ocwsnxPjvrjp55qyOrasnnaSvEcd6tzA/view?usp=sharing",
    password:    "9027",
    isFree:      false,
  },
  {
    title:       "vibrant red",
    slug:        "vibrant-red",
    downloadUrl: "https://drive.google.com/file/d/1nlaW6_9mac_XJkUgQMcz5dDjfVyWlodB/view?usp=sharing",
    password:    "6584",
    isFree:      false,
  },
  {
    title:       "cinematic street",
    slug:        "cinematic-street",
    downloadUrl: "https://drive.google.com/file/d/1n9EkY1ITGbNw7jJQROBHYK3ZJRDfFMN4/view?usp=sharing",
    password:    "2371",
    isFree:      false,
  },
  {
    title:       "vintage blue",
    slug:        "vintage-blue",
    downloadUrl: "https://drive.google.com/file/d/1lhuRSF2ROEHWU6_dWa6GO2gQuVMwOZ5E/view?usp=sharing",
    password:    "8146",
    isFree:      false,
  },
  {
    title:       "brownish yellow",
    slug:        "brownish-yellow",
    downloadUrl: "https://drive.google.com/file/d/1kEX-rDbTcd-b9KU3N1vJPw9foreMevDl/view?usp=sharing",
    password:    "4963",
    isFree:      false,
  },
  {
    title:       "garage",
    slug:        "garage",
    downloadUrl: "https://drive.google.com/file/d/1eBudWhOEwwYUTql9ppyxwF0q1hVsZXKp/view?usp=sharing",
    password:    "7208",
    isFree:      false,
  },
  {
    title:       "aesthetic selfie",
    slug:        "aesthetic-selfie",
    downloadUrl: "https://drive.google.com/file/d/1cf1zwR-FgILHjIuCqGvT6bFocLB_FqBu/view?usp=sharing",
    password:    "3695",
    isFree:      false,
  },
  {
    title:       "vintage car",
    slug:        "vintage-car",
    downloadUrl: "https://drive.google.com/file/d/1VY4d_P7Qyxh1oRSd4y9WWQTG-oh_Yx7f/view?usp=sharing",
    password:    "1847",
    isFree:      false,
  },
  {
    title:       "campfire",
    slug:        "campfire",
    downloadUrl: "https://drive.google.com/file/d/1S6fo8X4YOrWiNyZWZlTgkCsYeCHjFGVW/view?usp=sharing",
    password:    "5612",
    isFree:      false,
  },
  {
    title:       "aesthetic mood",
    slug:        "aesthetic-mood",
    downloadUrl: "https://drive.google.com/file/d/1Qsz3xvqsi2ArXHgrsc94h5LotDOenV_y/view?usp=sharing",
    password:    "9374",
    isFree:      false,
  },
  {
    title:       "arius",
    slug:        "arius",
    downloadUrl: "https://drive.google.com/file/d/1PBK4cYbkiZUOXD7Pwv72X_MR0Ci7UTUG/view?usp=sharing",
    password:    "2086",
    isFree:      false,
  },
  {
    title:       "film green",
    slug:        "film-green",
    downloadUrl: "https://drive.google.com/file/d/1OPj-3r83bmD1hvaHNTMLy86Z3PiWVelk/view?usp=sharing",
    password:    "6751",
    isFree:      false,
  },
  {
    title:       "silhioutte",
    slug:        "silhioutte",
    downloadUrl: "https://drive.google.com/file/d/1LTUNuEaDgJsJjOOPbqGl8zBQkoXmF8vP/view?usp=sharing",
    password:    "4129",
    isFree:      false,
  },
  {
    title:       "cinematic car v1",
    slug:        "cinematic-car-v1",
    downloadUrl: "https://drive.google.com/file/d/1L5ieqxWULJ6G3aulq0lyRiQVJZOpqFBd/view?usp=sharing",
    password:    "8463",
    isFree:      false,
  },
  {
    title:       "chocolate brown",
    slug:        "chocolate-brown",
    downloadUrl: "https://drive.google.com/file/d/1NJWcVln1qRpIweT9waSosGqvcHPsgP0L/view?usp=sharing",
    password:    "3917",
    isFree:      false,
  },
  {
    title:       "celestial",
    slug:        "celestial",
    downloadUrl: "https://drive.google.com/file/d/1FDDyqx317XNnDlvmBLTvBxbbltlIcu5d/view?usp=sharing",
    password:    "7284",
    isFree:      false,
  },
  {
    title:       "travel blogger",
    slug:        "travel-blogger",
    downloadUrl: "https://drive.google.com/file/d/1DWxnqzRhSRH-3gnnnghouFF_yCrukvmn/view?usp=sharing",
    password:    "1538",
    isFree:      false,
  },
  {
    title:       "riverdale",
    slug:        "riverdale",
    downloadUrl: "https://drive.google.com/file/d/1Bv0qJP1fPpH5a_gS-OAQQlR-JLF4a3QK/view?usp=sharing",
    password:    "9063",
    isFree:      false,
  },
  {
    title:       "ig wanderlust",
    slug:        "ig-wanderlust",
    downloadUrl: "https://drive.google.com/file/d/19vanl_rtVpKfJlKfuKV3nt71kCLej06Y/view?usp=sharing",
    password:    "5372",
    isFree:      false,
  },
  {
    title:       "new york",
    slug:        "new-york",
    downloadUrl: "https://drive.google.com/file/d/18xFvsWhdyJ5d-ANxVwHM6WVv_rZZCWfb/view?usp=sharing",
    password:    "2819",
    isFree:      false,
  },
  {
    title:       "hodophile",
    slug:        "hodophile",
    downloadUrl: "https://drive.google.com/file/d/17WANeVzIp3BZ97UjYXSkYOuHWUsgmnN1/view?usp=sharing",
    password:    "6045",
    isFree:      false,
  },
  {
    title:       "blogger",
    slug:        "blogger",
    downloadUrl: "https://drive.google.com/file/d/16eN6MMOc18tGPUhMkwWaOdY4AiPHWkDr/view?usp=sharing",
    password:    "8726",
    isFree:      false,
  },
  {
    title:       "retouch",
    slug:        "retouch",
    downloadUrl: "https://drive.google.com/file/d/13HsrYCHFjx90at_Ttv7sqDqUelfQWcZ7/view?usp=sharing",
    password:    "3194",
    isFree:      false,
  },
  {
    title:       "black moody",
    slug:        "black-moody",
    downloadUrl: "https://drive.google.com/file/d/12asLEpekGNhR0HVtkgraeTtyHkio7eNc/view?usp=sharing",
    password:    "7581",
    isFree:      false,
  },
  {
    title:       "vanilla",
    slug:        "vanilla",
    downloadUrl: "https://drive.google.com/file/d/11w76ECcVA9DEhLLm3KGbpmrPpgkvKQDh/view?usp=sharing",
    password:    "4237",
    isFree:      false,
  },
  {
    title:       "indie",
    slug:        "indie",
    downloadUrl: "https://drive.google.com/file/d/11LpHrplE1PNlWmTHDiQs3Sfyjz0sJ24E/view?usp=sharing",
    password:    "9618",
    isFree:      false,
  },
  {
    title:       "ruby",
    slug:        "ruby",
    downloadUrl: "https://drive.google.com/file/d/10SVws9DiS7YkeAtGZhV_WDd_xhtfpnTI/view?usp=sharing",
    password:    "2743",
    isFree:      false,
  },
  {
    title:       "urban retro",
    slug:        "urban-retro",
    downloadUrl: "https://drive.google.com/file/d/103HnLE9_aKUHgtOh0hCfkww2TVCVuWIT/view?usp=sharing",
    password:    "5906",
    isFree:      false,
  },
  {
    title:       "tempo",
    slug:        "tempo",
    downloadUrl: "https://drive.google.com/file/d/1-RKwLiVatSz48oEhErATRhuR8bO0P4S_/view?usp=sharing",
    password:    "1372",
    isFree:      false,
  },
  {
    title:       "christmas",
    slug:        "christmas",
    downloadUrl: "https://drive.google.com/file/d/1zk-FUIXXBIFNefkiTVPN8jGjTG4HrCyG/view?usp=sharing",
    password:    "8054",
    isFree:      false,
  },
  {
    title:       "pastel tone",
    slug:        "pastel-tone",
    downloadUrl: "https://drive.google.com/file/d/1ynKZDHkAx4dQ-4I_QzY1UGvewy8junXm/view?usp=sharing",
    password:    "4681",
    isFree:      false,
  },
  {
    title:       "golden sunrise",
    slug:        "golden-sunrise",
    downloadUrl: "https://drive.google.com/file/d/1yOzNFmMEWOvDHzar7-27t-vNoxJAodEC/view?usp=sharing",
    password:    "7913",
    isFree:      false,
  },
  {
    title:       "faded street",
    slug:        "faded-street",
    downloadUrl: "https://drive.google.com/file/d/1xlNmQah9_CUXjOEKrbx_yHMlBoT34QGx/view?usp=sharing",
    password:    "3268",
    isFree:      false,
  },
  {
    title:       "how to edit cinematic look",
    slug:        "how-to-edit-cinematic-look",
    downloadUrl: "https://drive.google.com/file/d/1xKMElVGmlblkfWjrvZfuyIM4T766deY_/view?usp=sharing",
    password:    "6042",
    isFree:      false,
  },
  {
    title:       "magical portrait",
    slug:        "magical-portrait",
    downloadUrl: "https://drive.google.com/file/d/1wpZoPyTE8AKbXfEArRkj_thdwLG6EOUq/view?usp=sharing",
    password:    "9475",
    isFree:      false,
  },
  {
    title:       "soft orange ton",
    slug:        "soft-orange-ton",
    downloadUrl: "https://drive.google.com/file/d/1uUx0b0RVPRXL0VcskB8HFpE5XglBMqiL/view?usp=sharing",
    password:    "2136",
    isFree:      false,
  },
  {
    title:       "vintage",
    slug:        "vintage",
    downloadUrl: "https://drive.google.com/file/d/1u-Jrm2vU6LC1ykzK9znLhMtgUGBPsAr9/view?usp=sharing",
    password:    "5894",
    isFree:      false,
  },
  {
    title:       "red velvet",
    slug:        "red-velvet",
    downloadUrl: "https://drive.google.com/file/d/1tKMGnzm9hNMDukIfg-XbmUVa4qNGAKiL/view?usp=sharing",
    password:    "8317",
    isFree:      false,
  },
  {
    title:       "anime",
    slug:        "anime",
    downloadUrl: "https://drive.google.com/file/d/1sUfjfxvqy-SHJKhDzPke6_b7ZjGDTAzL/view?usp=sharing",
    password:    "1629",
    isFree:      false,
  },
  {
    title:       "black and orange",
    slug:        "black-and-orange",
    downloadUrl: "https://drive.google.com/file/d/1s7G83hgGKWGfAN7GKlbCaTg9fWUcXxfS/view?usp=sharing",
    password:    "4083",
    isFree:      false,
  },
  {
    title:       "frozen",
    slug:        "frozen",
    downloadUrl: "https://drive.google.com/file/d/1riHSTsTSdGCDulEvXzfk_h7MySE5Jg6H/view?usp=sharing",
    password:    "7546",
    isFree:      false,
  },
  {
    title:       "matte blue",
    slug:        "matte-blue",
    downloadUrl: "https://drive.google.com/file/d/1rKBEmdhnpMwyNp4h7B-8VHZSCXito2gW/view?usp=sharing",
    password:    "3912",
    isFree:      false,
  },
  {
    title:       "aqua sunset",
    slug:        "aqua-sunset",
    downloadUrl: "https://drive.google.com/file/d/1q8g5tAQHts_NAfzYgeL3MmMk_2v8Hq0H/view?usp=sharing",
    password:    "6284",
    isFree:      false,
  },
  {
    title:       "urban",
    slug:        "urban",
    downloadUrl: "https://drive.google.com/file/d/1pjdAxZkivrzDJvyS1QjoZGtBPYJzHPg6/view?usp=sharing",
    password:    "9137",
    isFree:      false,
  },
  {
    title:       "moody red",
    slug:        "moody-red",
    downloadUrl: "https://drive.google.com/file/d/1pM_CZ6_LvQMpM-_12Nc3PC3JY75Kgb8H/view?usp=sharing",
    password:    "2708",
    isFree:      false,
  },
  {
    title:       "grainy vintage",
    slug:        "grainy-vintage",
    downloadUrl: "https://drive.google.com/file/d/1pDUmhRGGRTbnwyV7-6RTwFR4caVi1ZNc/view?usp=sharing",
    password:    "5361",
    isFree:      false,
  },
  {
    title:       "cinematic blue",
    slug:        "cinematic-blue",
    downloadUrl: "https://drive.google.com/file/d/1oK6FMlyKAO5cvO8d7JGxEiy1tUx5nTJr/view?usp=sharing",
    password:    "8049",
    isFree:      false,
  },
  {
    title:       "portrait black and white",
    slug:        "portrait-black-and-white",
    downloadUrl: "https://drive.google.com/file/d/1DuaAzgdImxS0Yw5_PI--qwHBPNkNrXbH/view?usp=sharing",
    password:    "4726",
    isFree:      false,
  },
  {
    title:       "urban classic",
    slug:        "urban-classic",
    downloadUrl: "https://drive.google.com/file/d/1nj4F_-JuppR6eLzO2DBTuVnjfLlfnbBn/view?usp=sharing",
    password:    "1583",
    isFree:      false,
  },
  {
    title:       "moody brown",
    slug:        "moody-brown",
    downloadUrl: "https://drive.google.com/file/d/1nYlqQA5by6LjH11I1kvaRMbg06cboM2e/view?usp=sharing",
    password:    "9214",
    isFree:      false,
  },
  {
    title:       "moody night tone",
    slug:        "moody-night-tone",
    downloadUrl: "https://drive.google.com/file/d/1n17bFasT32ikF6ryn_qogOnHUcCoNy3i/view?usp=sharing",
    password:    "3847",
    isFree:      false,
  },
  {
    title:       "film faded",
    slug:        "film-faded",
    downloadUrl: "https://drive.google.com/file/d/1mSvGSPCzgvSYnNzKrTBkepQA2KYcDfSn/view?usp=sharing",
    password:    "6093",
    isFree:      false,
  },
  {
    title:       "bali",
    slug:        "bali",
    downloadUrl: "https://drive.google.com/file/d/1m5LsCpuIN_zafmeX7Rm6AFjRcjgc9pa2/view?usp=sharing",
    password:    "7521",
    isFree:      false,
  },
  {
    title:       "jordi koalitic",
    slug:        "jordi-koalitic",
    downloadUrl: "https://drive.google.com/file/d/1lnyHgCd0JNqEOB8A3k7izHijrJlikOTm/view?usp=sharing",
    password:    "2469",
    isFree:      false,
  },
  {
    title:       "dark grey tone",
    slug:        "dark-grey-tone",
    downloadUrl: "https://drive.google.com/file/d/1kptxw7Qgm2mqEmMKCr30FqfttAZNkB1y/view?usp=sharing",
    password:    "5138",
    isFree:      false,
  },
  {
    title:       "cyberpunk",
    slug:        "cyberpunk",
    downloadUrl: "https://drive.google.com/file/d/1lW7lb9veL480mytvpqnEbWhAk5kNCWTw/view?usp=sharing",
    password:    "8672",
    isFree:      false,
  },
  {
    title:       "summer",
    slug:        "summer",
    downloadUrl: "https://drive.google.com/file/d/1l27LD9ag96yhI32Dar_lSHNliKFoCU9e/view?usp=sharing",
    password:    "4015",
    isFree:      false,
  },
  {
    title:       "rich black",
    slug:        "rich-black",
    downloadUrl: "NA",
    password:    "9386",
    isFree:      false,
  },
  {
    title:       "deep sky tone",
    slug:        "deep-sky-tone",
    downloadUrl: "https://drive.google.com/file/d/1hJ7g86w3THQjNj7dH23I5MtsguDihG6x/view?usp=sharing",
    password:    "1724",
    isFree:      false,
  },
  {
    title:       "bokeh light effect",
    slug:        "bokeh-light-effect",
    downloadUrl: "https://drive.google.com/drive/u/0/folders/1NroyMu6PKCvsJztA4FkX4rl-xZWCEoUb",
    password:    "6957",
    isFree:      false,
  },
  {
    title:       "cream tone",
    slug:        "cream-tone",
    downloadUrl: "https://drive.google.com/file/d/1gmIdUiSDXukw4ZI0LruaDjo33kEYdHr8/view?usp=sharing",
    password:    "3241",
    isFree:      false,
  },
  {
    title:       "dark disposable camera",
    slug:        "dark-disposable-camera",
    downloadUrl: "https://drive.google.com/drive/u/0/folders/1NroyMu6PKCvsJztA4FkX4rl-xZWCEoUb",
    password:    "7803",
    isFree:      false,
  },
  {
    title:       "black urban",
    slug:        "black-urban",
    downloadUrl: "https://drive.google.com/file/d/1gC2lHutTv4J1-yo7rlAQLFlHmiY0hKyO/view?usp=sharing",
    password:    "5469",
    isFree:      false,
  },
  {
    title:       "orange teal",
    slug:        "orange-teal",
    downloadUrl: "https://drive.google.com/file/d/1g538ru4JbsEq9KaCBmNSMYmvYzF4iXpu/view?usp=sharing",
    password:    "2917",
    isFree:      false,
  },
  {
    title:       "tokyo",
    slug:        "tokyo",
    downloadUrl: "https://drive.google.com/file/d/1fsshwgE1liZUG3mRktUCnZ1l-4spfEgD/view?usp=sharing",
    password:    "8634",
    isFree:      false,
  },
  {
    title:       "dual tone",
    slug:        "dual-tone",
    downloadUrl: "NA",
    password:    "1076",
    isFree:      false,
  },
  {
    title:       "light denim",
    slug:        "light-denim",
    downloadUrl: "https://drive.google.com/file/d/1fIaMxREQ08_RFhKCg3WPlDufjQbZ1_Ky/view?usp=sharing",
    password:    "4593",
    isFree:      false,
  },
  {
    title:       "warm golden",
    slug:        "warm-golden",
    downloadUrl: "NA",
    password:    "7162",
    isFree:      false,
  },
  {
    title:       "motography",
    slug:        "motography",
    downloadUrl: "https://drive.google.com/file/d/1erG8e8chSgiZZdhx-WM7SElhNZEKX5ua/view?usp=sharing",
    password:    "9841",
    isFree:      false,
  },
  {
    title:       "urban steel",
    slug:        "urban-steel",
    downloadUrl: "https://drive.google.com/file/d/1eJaT3CFN_e6Ua6C908ZpY2qb3xEkPJrp/view?usp=sharing",
    password:    "3058",
    isFree:      false,
  },
  {
    title:       "adventure",
    slug:        "adventure",
    downloadUrl: "https://drive.google.com/file/d/1dPyoeTZbuPvCx7Ry94vGhBNOJ2jZKrJQ/view?usp=sharing",
    password:    "6427",
    isFree:      false,
  },
  {
    title:       "film grey",
    slug:        "film-grey",
    downloadUrl: "https://drive.google.com/file/d/1CFFeU_c-VqclW1MTZT9gadEa2fl954V8/view?usp=sharing",
    password:    "1895",
    isFree:      false,
  },
  {
    title:       "dark black tone effect",
    slug:        "dark-black-tone-effect",
    downloadUrl: "https://drive.google.com/file/d/1C17DYz36XpOHidcMbbMWV-IrAteBDdmI/view?usp=sharing",
    password:    "5274",
    isFree:      false,
  },
  {
    title:       "food blogger",
    slug:        "food-blogger",
    downloadUrl: "https://drive.google.com/file/d/1Bwv0YmcmmOPB8IlwYTgO6DZ4NJDVr2c-/view?usp=sharing",
    password:    "8361",
    isFree:      false,
  },
]

/* ── O(1) lookup index keyed by lowercase title ────────────────────────────── */
const INDEX = new Map<string, SecurePreset>(
  REGISTRY.map((p) => [p.title.toLowerCase().trim(), p])
)

/** Looks up a preset by title (case-insensitive). Returns null if not found. */
export function getSecurePreset(presetName: string): SecurePreset | null {
  return INDEX.get(presetName.toLowerCase().trim()) ?? null
}

/** Timing-safe string comparison — prevents timing attacks on password checks. */
export function timingSafeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length)
  let diff = 0
  for (let i = 0; i < maxLen; i++) {
    diff |= (a.charCodeAt(i) ?? 0) ^ (b.charCodeAt(i) ?? 0)
  }
  return diff === 0 && a.length === b.length
}
