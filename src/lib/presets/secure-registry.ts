/**
 * src/lib/presets/secure-registry.ts
 *
 * SERVER-ONLY — import 'server-only' enforces this at build time.
 * Never import from any "use client" component or page.
 *
 * Slugs are the EXACT values from the production Supabase `presets` table.
 * Supabase export is the authoritative source — never guess or shorten slugs.
 *
 * Lookup: getSecurePreset(slug)  — O(1), slug-primary with title fallback
 */

import "server-only"

export interface SecurePreset {
  title:       string
  slug:        string        // EXACT Supabase slug
  downloadUrl: string        // Google Drive URL, or "NA"
  password:    string | null // null = free; string = 4-digit unlock code
  isFree:      boolean
  // Future payment integration — typed but not used yet
  requiresPurchase?: boolean
  purchaseId?:       string | null
  licenseType?:      "personal" | "commercial" | null
  ownerId?:          string | null
}

const REGISTRY: SecurePreset[] = [

  /* ─────────────────────────────────────────────────────────────────────────
   * FREE PRESETS (5) — password: null, isFree: true
   * ───────────────────────────────────────────────────────────────────────── */

  {
    title:       "teal and rust preset",
    slug:        "teal-rust-free-cinematic-look-no-password",
    downloadUrl: "https://drive.google.com/file/d/1AGkYBYYrDQjKcA2_Fx_SP0MIMTuTJMkj/view?usp=sharing",
    password:    null,
    isFree:      true,
  },
  {
    title:       "how to create mint blue",
    slug:        "how-to-create-mint-blue-tone-in-lightroom-mobile-no-password",
    downloadUrl: "https://drive.google.com/file/d/1gZgi9LhOZQhNpKXEWYFUU1Y8bWnWDFwJ/view?usp=sharing",
    password:    null,
    isFree:      true,
  },
  {
    title:       "tropical preset",
    slug:        "no-password-tropical-preset-dark-green-preset-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1yf5OsImwg8NDiLqSmqwkaY_n9Au1C1LE/view?usp=sharing",
    password:    null,
    isFree:      true,
  },
  {
    title:       "cinematic v3 preset",
    slug:        "no-password-cinematic-v3-preset-cinematic-presets-free-dng",
    downloadUrl: "https://drive.google.com/file/d/1xcUZmJa_qFHlCKsbNPa3FnPozbBHzT_J/view?usp=sharing",
    password:    null,
    isFree:      true,
  },
  {
    title:       "nightlife",
    slug:        "no-password-nightlife-preset-nightss-free-dng",
    downloadUrl: "https://drive.google.com/file/d/1152__jw9YhbQYEfiP2Jv4WpAHUEu7Cra/view?usp=sharing",
    password:    null,
    isFree:      true,
  },

  /* ─────────────────────────────────────────────────────────────────────────
   * PAID PRESETS (94) — unique 4-digit passwords
   * ───────────────────────────────────────────────────────────────────────── */

  {
    title:       "matte tone",
    slug:        "matte-tone-mattess-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1xSQ2JcShFPYO0U5t4PWGtjJ8OkC1Lus0/view?usp=sharing",
    password:    "4821",
    isFree:      false,
  },
  {
    title:       "cinematic gold",
    slug:        "cinematic-gold-preset-cinematic-presets-city-preset-frees-dng",
    downloadUrl: "https://drive.google.com/file/d/1vtnOyY0_-R5oAw5WMZ1uXaxj9tIqwP3p/view?usp=sharing",
    password:    "7356",
    isFree:      false,
  },
  {
    title:       "misty forest",
    slug:        "misty-forest-preset-forest-preset-free-dng-lightroom-editing-outdoor-preset",
    downloadUrl: "https://drive.google.com/file/d/1uAY6Gpey9fTjXHYI3bF7oceA6GpK62RJ/view?usp=sharing",
    password:    "2948",
    isFree:      false,
  },
  {
    title:       "aesthetic purple",
    slug:        "aesthetic-purple-preset-aesthetic-presets-lofi-preset-free-dng-lightroom",
    downloadUrl: "https://drive.google.com/file/d/1r60gguePjZx3VLaABgpot0Jtdvk9BmQV/view?usp=sharing",
    password:    "6173",
    isFree:      false,
  },
  {
    title:       "moody city",
    slug:        "moody-city-preset-moody-presets-city-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1lsXAphSzWLaTVqAfO5MySKNwJYW38TgL/view?usp=sharing",
    password:    "3527",
    isFree:      false,
  },
  {
    title:       "deep cinematic",
    slug:        "deep-cinematic-preset-cinematic-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1gwvhB9uneFTTDyKCZDC0YN7tYsaBC-az/view?usp=sharing",
    password:    "8914",
    isFree:      false,
  },
  {
    title:       "clean",
    slug:        "aesthetic-clean-preset-aesthetic-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1gO9mI12xF5H5T_vxxJ-53z0y0-YSdngl/view?usp=sharing",
    password:    "1463",
    isFree:      false,
  },
  {
    title:       "caramel",
    slug:        "caramel-chocolate-preset-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1ejUQyj-h3eYDLW_UiHvCQVcNvX_aCSAa/view?usp=sharing",
    password:    "5739",
    isFree:      false,
  },
  {
    title:       "dark blue",
    slug:        "dark-blue-preset-cinematic-blue-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1ExG2qkEG_DOFDgzyfs46TkPIUMRHDXk6/view?usp=sharing",
    password:    "9246",
    isFree:      false,
  },
  {
    title:       "aesthetic beige pink",
    slug:        "aesthetic-beige-pink-preset-beige-presets-aesthetic-presetss-free-dng",
    downloadUrl: "https://drive.google.com/file/d/199-2OyiB1uhbU9JcrFQEWdJD8PA5jdfy/view?usp=sharing",
    password:    "3081",
    isFree:      false,
  },
  {
    title:       "aesthetic nightvision",
    slug:        "aesthetic-nightvision-preset-35-mm-film-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/14JqA_HAIPN5x3dMk0oVvqS139QVkAT3N/view?usp=sharing",
    password:    "7425",
    isFree:      false,
  },
  {
    title:       "red and white",
    slug:        "red-and-white-preset-cherry-white-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/12zbyI5c6biB-0jTZejXbj9R16Eigy4Vo/view?usp=sharing",
    password:    "4692",
    isFree:      false,
  },
  {
    title:       "aesthetic beach",
    slug:        "how-to-edit-aesthetic-photos-aesthetic-beach-preset-aesthetic-presets-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/12AgBENNR1_cblYFGkR0N4q1pNrSTGOdZ/view?usp=sharing",
    password:    "8137",
    isFree:      false,
  },
  {
    title:       "magical sunset",
    slug:        "magical-sunset-preset-instagram-sunset-filters-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1ygMRyrlQpgd3jefKTj-KMACkNSJCU-Ge/view?usp=sharing",
    password:    "2564",
    isFree:      false,
  },
  {
    title:       "city grey",
    slug:        "no-password-city-grey-presets-free-dng-lightroom-editing-grey-presets",
    downloadUrl: "https://drive.google.com/file/d/1xiVtNpGVydl8gNmSCq5d11sqmdkg-mpf/view?usp=sharing",
    password:    "6318",
    isFree:      false,
  },
  {
    title:       "aqua red",
    slug:        "no-password-aqua-red-preset-red-and-blue-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1wCvlewGVCYBh4FmeQ6RWQTLDveNCXm2m/view?usp=sharing",
    password:    "1284",
    isFree:      false,
  },
  {
    title:       "pastel beach",
    slug:        "pastel-beach-beach-presetss-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1vkxiweudP4uX0ksS51LsrZ_AGbZD8AvT/view?usp=sharing",
    password:    "5093",
    isFree:      false,
  },
  {
    title:       "fantasy lightroom",
    slug:        "fantasy-multicolored-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1tmcwsi0FV-zEFYcY5Vbpzi4rS6-6qus9/view?usp=sharing",
    password:    "7861",
    isFree:      false,
  },
  {
    title:       "motography v2",
    slug:        "no-password-motography-v2-preset-preset-for-bikerss-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1sO3mtoIVFqxV9v3FB-mMBaKVMTjGM9JF/view?usp=sharing",
    password:    "3416",
    isFree:      false,
  },
  {
    title:       "moody green",
    slug:        "moody-green-preset-dark-green-preset-moody-presetss-free-dng",
    downloadUrl: "https://drive.google.com/file/d/1ocwsnxPjvrjp55qyOrasnnaSvEcd6tzA/view?usp=sharing",
    password:    "9027",
    isFree:      false,
  },
  {
    title:       "cinematic street",
    slug:        "cinematic-street-preset-cinematic-street-v1s-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1n9EkY1ITGbNw7jJQROBHYK3ZJRDfFMN4/view?usp=sharing",
    password:    "2371",
    isFree:      false,
  },
  {
    title:       "brownish yellow",
    slug:        "brownish-yellow-tone-preset-vintage-brown-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1kEX-rDbTcd-b9KU3N1vJPw9foreMevDl/view?usp=sharing",
    password:    "4963",
    isFree:      false,
  },
  {
    title:       "garage",
    slug:        "how-to-edit-garage-photos-garages-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1eBudWhOEwwYUTql9ppyxwF0q1hVsZXKp/view?usp=sharing",
    password:    "7208",
    isFree:      false,
  },
  {
    title:       "aesthetic selfie",
    slug:        "how-to-edit-aesthetic-pictures-aesthetic-selfies-aesthetics-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1cf1zwR-FgILHjIuCqGvT6bFocLB_FqBu/view?usp=sharing",
    password:    "3695",
    isFree:      false,
  },
  {
    title:       "vintage car",
    slug:        "how-to-edit-vintage-photos-vintage-car-preset-vintage-presetss-free-dng",
    downloadUrl: "https://drive.google.com/file/d/1VY4d_P7Qyxh1oRSd4y9WWQTG-oh_Yx7f/view?usp=sharing",
    password:    "1847",
    isFree:      false,
  },
  {
    title:       "campfire",
    slug:        "campfire-campingss-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1S6fo8X4YOrWiNyZWZlTgkCsYeCHjFGVW/view?usp=sharing",
    password:    "5612",
    isFree:      false,
  },
  {
    title:       "aesthetic mood",
    slug:        "how-to-edit-aesthetic-pictures-aesthetic-filters-aestheticss",
    downloadUrl: "https://drive.google.com/file/d/1Qsz3xvqsi2ArXHgrsc94h5LotDOenV_y/view?usp=sharing",
    password:    "9374",
    isFree:      false,
  },
  {
    title:       "arius",
    slug:        "arius-how-to-edit-portrait-photography-portraits-portraits",
    downloadUrl: "https://drive.google.com/file/d/1PBK4cYbkiZUOXD7Pwv72X_MR0Ci7UTUG/view?usp=sharing",
    password:    "2086",
    isFree:      false,
  },
  {
    title:       "film green",
    slug:        "film-green-preset-cinematic-green-preset-moody-green-presetss-free-dng",
    downloadUrl: "https://drive.google.com/file/d/1OPj-3r83bmD1hvaHNTMLy86Z3PiWVelk/view?usp=sharing",
    password:    "6751",
    isFree:      false,
  },
  {
    title:       "silhioutte",
    slug:        "silhouette-how-to-edit-silhouette-photofree-dng-preset",
    downloadUrl: "https://drive.google.com/file/d/1LTUNuEaDgJsJjOOPbqGl8zBQkoXmF8vP/view?usp=sharing",
    password:    "4129",
    isFree:      false,
  },
  {
    title:       "cinematic car v1",
    slug:        "cinematic-car-v1-cinematic-car-preset-cinematic-presetss-free-dng-lightroom",
    downloadUrl: "https://drive.google.com/file/d/1L5ieqxWULJ6G3aulq0lyRiQVJZOpqFBd/view?usp=sharing",
    password:    "8463",
    isFree:      false,
  },
  {
    title:       "chocolate brown",
    slug:        "chocolate-brown-preset-chocolate-preset-moody-brown-presets-free-dng",
    downloadUrl: "https://drive.google.com/file/d/1NJWcVln1qRpIweT9waSosGqvcHPsgP0L/view?usp=sharing",
    password:    "3917",
    isFree:      false,
  },
  {
    title:       "celestial",
    slug:        "celestial-moody-orange-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1FDDyqx317XNnDlvmBLTvBxbbltlIcu5d/view?usp=sharing",
    password:    "7284",
    isFree:      false,
  },
  {
    title:       "travel blogger",
    slug:        "dreamy-blogger-preset-blogger-presetss-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1DWxnqzRhSRH-3gnnnghouFF_yCrukvmn/view?usp=sharing",
    password:    "1538",
    isFree:      false,
  },
  {
    title:       "riverdale",
    slug:        "riverdale-red-and-blue-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1Bv0qJP1fPpH5a_gS-OAQQlR-JLF4a3QK/view?usp=sharing",
    password:    "9063",
    isFree:      false,
  },
  {
    title:       "ig wanderlust",
    slug:        "instagram-wanderlust-preset-wanderlust-preset-03s-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/19vanl_rtVpKfJlKfuKV3nt71kCLej06Y/view?usp=sharing",
    password:    "5372",
    isFree:      false,
  },
  {
    title:       "new york",
    slug:        "new-york-city-preset-wanderlust-preset-02s-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/18xFvsWhdyJ5d-ANxVwHM6WVv_rZZCWfb/view?usp=sharing",
    password:    "2819",
    isFree:      false,
  },
  {
    title:       "hodophile",
    slug:        "hodophile-travels-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/17WANeVzIp3BZ97UjYXSkYOuHWUsgmnN1/view?usp=sharing",
    password:    "6045",
    isFree:      false,
  },
  {
    title:       "blogger",
    slug:        "dreamy-blogger-preset-blogger-presetss-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/16eN6MMOc18tGPUhMkwWaOdY4AiPHWkDr/view?usp=sharing",
    password:    "8726",
    isFree:      false,
  },
  {
    title:       "retouch",
    slug:        "professional-hd-retouching-in-lightroom-mobile-how-to-retouch-photos-in-lightroom-mobile",
    downloadUrl: "https://drive.google.com/file/d/13HsrYCHFjx90at_Ttv7sqDqUelfQWcZ7/view?usp=sharing",
    password:    "3194",
    isFree:      false,
  },
  {
    title:       "black moody",
    slug:        "black-moody-preset-moody-presets-off-black-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/12asLEpekGNhR0HVtkgraeTtyHkio7eNc/view?usp=sharing",
    password:    "7581",
    isFree:      false,
  },
  {
    title:       "indie",
    slug:        "indie-preset-lightroom-tropical-green-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/11LpHrplE1PNlWmTHDiQs3Sfyjz0sJ24E/view?usp=sharing",
    password:    "9618",
    isFree:      false,
  },
  {
    title:       "ruby",
    slug:        "ruby-preset-red-tone-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/10SVws9DiS7YkeAtGZhV_WDd_xhtfpnTI/view?usp=sharing",
    password:    "2743",
    isFree:      false,
  },
  {
    title:       "tempo",
    slug:        "tempo-mobile-presets-free-dng-lightroom-editing-s",
    downloadUrl: "https://drive.google.com/file/d/1-RKwLiVatSz48oEhErATRhuR8bO0P4S_/view?usp=sharing",
    password:    "1372",
    isFree:      false,
  },
  {
    title:       "christmas",
    slug:        "no-password-special-christmas-preset-s-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1zk-FUIXXBIFNefkiTVPN8jGjTG4HrCyG/view?usp=sharing",
    password:    "8054",
    isFree:      false,
  },
  {
    title:       "pastel tone",
    slug:        "pastel-tone-preset-how-to-edit-pastel-colours-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1ynKZDHkAx4dQ-4I_QzY1UGvewy8junXm/view?usp=sharing",
    password:    "4681",
    isFree:      false,
  },
  {
    title:       "golden sunrise",
    slug:        "how-to-edit-sunrise-sunrise-photography-golden-sunrise-presets-free-dng",
    downloadUrl: "https://drive.google.com/file/d/1yOzNFmMEWOvDHzar7-27t-vNoxJAodEC/view?usp=sharing",
    password:    "7913",
    isFree:      false,
  },
  {
    title:       "faded street",
    slug:        "how-to-edit-faded-street-street-photographys-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1xlNmQah9_CUXjOEKrbx_yHMlBoT34QGx/view?usp=sharing",
    password:    "3268",
    isFree:      false,
  },
  {
    title:       "how to edit cinematic look",
    slug:        "how-to-edit-cinematic-looks-free-dng-lightroom-mobile-editing",
    downloadUrl: "https://drive.google.com/file/d/1xKMElVGmlblkfWjrvZfuyIM4T766deY_/view?usp=sharing",
    password:    "6042",
    isFree:      false,
  },
  {
    title:       "magical portrait",
    slug:        "magical-portrait-preset-how-to-edit-portraits-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1wpZoPyTE8AKbXfEArRkj_thdwLG6EOUq/view?usp=sharing",
    password:    "9475",
    isFree:      false,
  },
  {
    title:       "soft orange ton",
    slug:        "soft-orange-tone-orange-softness-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1uUx0b0RVPRXL0VcskB8HFpE5XglBMqiL/view?usp=sharing",
    password:    "2136",
    isFree:      false,
  },
  {
    title:       "vintage",
    slug:        "no-password-vintage-preset-how-to-edit-vintages-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1u-Jrm2vU6LC1ykzK9znLhMtgUGBPsAr9/view?usp=sharing",
    password:    "5894",
    isFree:      false,
  },
  {
    title:       "red velvet",
    slug:        "no-password-red-velvet-preset-romantic-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1tKMGnzm9hNMDukIfg-XbmUVa4qNGAKiL/view?usp=sharing",
    password:    "8317",
    isFree:      false,
  },
  {
    title:       "anime",
    slug:        "anime-style-preset-anime-style-editings-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1sUfjfxvqy-SHJKhDzPke6_b7ZjGDTAzL/view?usp=sharing",
    password:    "1629",
    isFree:      false,
  },
  {
    title:       "black and orange",
    slug:        "black-orange-preset-urban-cinematic-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1s7G83hgGKWGfAN7GKlbCaTg9fWUcXxfS/view?usp=sharing",
    password:    "4083",
    isFree:      false,
  },
  {
    title:       "frozen",
    slug:        "no-password-frozen-winter-preset-how-to-edit-winter-photographys-free-dng",
    downloadUrl: "https://drive.google.com/file/d/1riHSTsTSdGCDulEvXzfk_h7MySE5Jg6H/view?usp=sharing",
    password:    "7546",
    isFree:      false,
  },
  {
    title:       "matte blue",
    slug:        "no-password-matte-blue-preset-cool-blue-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1rKBEmdhnpMwyNp4h7B-8VHZSCXito2gW/view?usp=sharing",
    password:    "3912",
    isFree:      false,
  },
  {
    title:       "aqua sunset",
    slug:        "no-password-aqua-sunset-preset-sunset-photographys-free-dng",
    downloadUrl: "https://drive.google.com/file/d/1q8g5tAQHts_NAfzYgeL3MmMk_2v8Hq0H/view?usp=sharing",
    password:    "6284",
    isFree:      false,
  },
  {
    title:       "urban",
    slug:        "no-password-urban-preset-urban-photographys-free-dng-lightroom-mobile-urban",
    downloadUrl: "https://drive.google.com/file/d/1pjdAxZkivrzDJvyS1QjoZGtBPYJzHPg6/view?usp=sharing",
    password:    "9137",
    isFree:      false,
  },
  {
    title:       "moody red",
    slug:        "no-password-moody-red-preset-moody-presetss-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1pM_CZ6_LvQMpM-_12Nc3PC3JY75Kgb8H/view?usp=sharing",
    password:    "2708",
    isFree:      false,
  },
  {
    title:       "grainy vintage",
    slug:        "no-password-grainy-vintage-preset-aesthetic-presets-free-dng",
    downloadUrl: "https://drive.google.com/file/d/1pDUmhRGGRTbnwyV7-6RTwFR4caVi1ZNc/view?usp=sharing",
    password:    "5361",
    isFree:      false,
  },
  {
    title:       "cinematic blue",
    slug:        "cinematic-blue-preset-misty-blue-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1oK6FMlyKAO5cvO8d7JGxEiy1tUx5nTJr/view?usp=sharing",
    password:    "8049",
    isFree:      false,
  },
  {
    title:       "portrait black and white",
    slug:        "no-password-portrait-black-and-white-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1DuaAzgdImxS0Yw5_PI--qwHBPNkNrXbH/view?usp=sharing",
    password:    "4726",
    isFree:      false,
  },
  {
    title:       "urban classic",
    slug:        "no-password-urban-classic-preset-classic-presetss-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1nj4F_-JuppR6eLzO2DBTuVnjfLlfnbBn/view?usp=sharing",
    password:    "1583",
    isFree:      false,
  },
  {
    title:       "moody brown",
    slug:        "no-password-moody-brown-preset-moody-presetss-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1nYlqQA5by6LjH11I1kvaRMbg06cboM2e/view?usp=sharing",
    password:    "9214",
    isFree:      false,
  },
  {
    title:       "moody night tone",
    slug:        "moody-night-tone-night-presets-moody-presetss-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1n17bFasT32ikF6ryn_qogOnHUcCoNy3i/view?usp=sharing",
    password:    "3847",
    isFree:      false,
  },
  {
    title:       "film faded",
    slug:        "film-faded-preset-faded-presets-film-presetss-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1mSvGSPCzgvSYnNzKrTBkepQA2KYcDfSn/view?usp=sharing",
    password:    "6093",
    isFree:      false,
  },
  {
    title:       "bali",
    slug:        "bali-preset-island-presetss-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1m5LsCpuIN_zafmeX7Rm6AFjRcjgc9pa2/view?usp=sharing",
    password:    "7521",
    isFree:      false,
  },
  {
    title:       "jordi koalitic",
    slug:        "jordikoalitics-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1lnyHgCd0JNqEOB8A3k7izHijrJlikOTm/view?usp=sharing",
    password:    "2469",
    isFree:      false,
  },
  {
    title:       "dark grey tone",
    slug:        "dark-grey-tone-grey-preset-dark-presetss-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1kptxw7Qgm2mqEmMKCr30FqfttAZNkB1y/view?usp=sharing",
    password:    "5138",
    isFree:      false,
  },
  {
    title:       "cyberpunk",
    slug:        "no-password-cyberpunk-preset-neon-city-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1lW7lb9veL480mytvpqnEbWhAk5kNCWTw/view?usp=sharing",
    password:    "8672",
    isFree:      false,
  },
  {
    title:       "summer",
    slug:        "summer-vibe-preset-summer-presetss-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1l27LD9ag96yhI32Dar_lSHNliKFoCU9e/view?usp=sharing",
    password:    "4015",
    isFree:      false,
  },
  {
    title:       "rich black",
    slug:        "rich-black-preset-black-tone-presetss-free-dng-lightroom-editing",
    downloadUrl: "NA",
    password:    "9386",
    isFree:      false,
  },
  {
    title:       "deep sky tone",
    slug:        "deep-sky-tone-aqua-sky-presets-free-dng-lightroom-e",
    downloadUrl: "https://drive.google.com/file/d/1hJ7g86w3THQjNj7dH23I5MtsguDihG6x/view?usp=sharing",
    password:    "1724",
    isFree:      false,
  },
  {
    title:       "bokeh light effect",
    slug:        "bokeh-light-effect-brandon-woelfel-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/drive/u/0/folders/1NroyMu6PKCvsJztA4FkX4rl-xZWCEoUb",
    password:    "6957",
    isFree:      false,
  },
  {
    title:       "cream tone",
    slug:        "cream-tone-preset-milk-preset-dairy-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1gmIdUiSDXukw4ZI0LruaDjo33kEYdHr8/view?usp=sharing",
    password:    "3241",
    isFree:      false,
  },
  {
    title:       "dark disposable camera",
    slug:        "dark-disposable-camera-fujifilm-inspired-lightrooms-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/drive/u/0/folders/1NroyMu6PKCvsJztA4FkX4rl-xZWCEoUb",
    password:    "7803",
    isFree:      false,
  },
  {
    title:       "black urban",
    slug:        "black-urban-preset-black-hdr-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1gC2lHutTv4J1-yo7rlAQLFlHmiY0hKyO/view?usp=sharing",
    password:    "5469",
    isFree:      false,
  },
  {
    title:       "orange teal",
    slug:        "orang-teal-preset-aqua-orange-presets-free-dng-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1g538ru4JbsEq9KaCBmNSMYmvYzF4iXpu/view?usp=sharing",
    password:    "2917",
    isFree:      false,
  },
  {
    title:       "tokyo",
    slug:        "no-password-tokyo-presetstreet-glow-preset-lightroom-editings-lightroom-mobile",
    downloadUrl: "https://drive.google.com/file/d/1fsshwgE1liZUG3mRktUCnZ1l-4spfEgD/view?usp=sharing",
    password:    "8634",
    isFree:      false,
  },
  {
    title:       "dual tone",
    slug:        "dual-tone-presets-lightroom-editing-lightroom-mobile-red-blue-preset",
    downloadUrl: "NA",
    password:    "1076",
    isFree:      false,
  },
  {
    title:       "light denim",
    slug:        "no-password-light-denim-preset-denim-presetsss-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1fIaMxREQ08_RFhKCg3WPlDufjQbZ1_Ky/view?usp=sharing",
    password:    "4593",
    isFree:      false,
  },
  {
    title:       "warm golden",
    slug:        "no-password-danish-zehen-inspired-warm-golden-presetslightroom-editing",
    downloadUrl: "NA",
    password:    "7162",
    isFree:      false,
  },
  {
    title:       "motography",
    slug:        "no-password-motography-preset-preset-for-bikerss-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1erG8e8chSgiZZdhx-WM7SElhNZEKX5ua/view?usp=sharing",
    password:    "9841",
    isFree:      false,
  },
  {
    title:       "adventure",
    slug:        "adventure-preset-lightroom-editings-lightroom-mobile-photo-editing",
    downloadUrl: "https://drive.google.com/file/d/1dPyoeTZbuPvCx7Ry94vGhBNOJ2jZKrJQ/view?usp=sharing",
    password:    "6427",
    isFree:      false,
  },
  {
    title:       "film grey",
    slug:        "film-grey-tone-grey-presets-film-presets-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1CFFeU_c-VqclW1MTZT9gadEa2fl954V8/view?usp=sharing",
    password:    "1895",
    isFree:      false,
  },
  {
    title:       "dark black tone effect",
    slug:        "dark-black-tone-effect-black-presets-dark-presets-lightroom-editing",
    downloadUrl: "https://drive.google.com/file/d/1C17DYz36XpOHidcMbbMWV-IrAteBDdmI/view?usp=sharing",
    password:    "5274",
    isFree:      false,
  },
  {
    title:       "food blogger",
    slug:        "food-blogger-preset-food-presets-blogger-presets-lightroom-editing-photo-editing",
    downloadUrl: "https://drive.google.com/file/d/1Bwv0YmcmmOPB8IlwYTgO6DZ4NJDVr2c-/view?usp=sharing",
    password:    "8361",
    isFree:      false,
  },

  /* ─────────────────────────────────────────────────────────────────────────
   * REGISTRY-ONLY ENTRIES — no matching Supabase preset found in export.
   * These slugs are best-guess and will only match if Supabase adds the row.
   * ───────────────────────────────────────────────────────────────────────── */

  {
    title:       "urban v2",
    slug:        "urban-v2",
    downloadUrl: "https://drive.google.com/file/d/1wsBmZHLn3ECz-HdVvhb_ZF9QN0JMAGMC/view?usp=sharing",
    password:    "9752",
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
    title:       "vintage blue",
    slug:        "vintage-blue",
    downloadUrl: "https://drive.google.com/file/d/1lhuRSF2ROEHWU6_dWa6GO2gQuVMwOZ5E/view?usp=sharing",
    password:    "8146",
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
    title:       "urban retro",
    slug:        "urban-retro",
    downloadUrl: "https://drive.google.com/file/d/103HnLE9_aKUHgtOh0hCfkww2TVCVuWIT/view?usp=sharing",
    password:    "5906",
    isFree:      false,
  },
  {
    title:       "urban steel",
    slug:        "urban-steel",
    downloadUrl: "https://drive.google.com/file/d/1eJaT3CFN_e6Ua6C908ZpY2qb3xEkPJrp/view?usp=sharing",
    password:    "3058",
    isFree:      false,
  },
]

/* ── O(1) lookup indexes ────────────────────────────────────────────────────── */
const SLUG_INDEX = new Map<string, SecurePreset>(
  REGISTRY.map((p) => [p.slug.toLowerCase().trim(), p])
)
const TITLE_INDEX = new Map<string, SecurePreset>(
  REGISTRY.map((p) => [p.title.toLowerCase().trim(), p])
)

/** Looks up a preset by slug (primary) or title (fallback), case-insensitive. */
export function getSecurePreset(slugOrTitle: string): SecurePreset | null {
  const key = slugOrTitle.toLowerCase().trim()
  return SLUG_INDEX.get(key) ?? TITLE_INDEX.get(key) ?? null
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
