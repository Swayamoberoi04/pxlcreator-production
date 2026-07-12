/**
 * src/data/preset-downloads.ts
 *
 * Central preset download registry.
 *
 * Lookup:  getPresetDownload(presetName)
 *   → { title, downloadUrl, password }
 *   → null if the preset is not in the registry
 *
 * Matching is case-insensitive and trims whitespace.
 *
 * password is empty ("") for every entry today.
 * When you add password protection, fill in the password field
 * for that entry and the handler in UnlockOrBuyPanel will use it.
 *
 * downloadUrl = "NA" means the file is not yet available.
 * The download button is disabled and shows "Download coming soon."
 *
 * DO NOT reorder these entries — they are in YouTube release order.
 */

export interface PresetDownload {
  title:       string
  downloadUrl: string   // Google Drive URL, or "NA" when not yet available
  password:    string   // always "" for now; fill in to enable password gate
}

const PRESET_DOWNLOADS: PresetDownload[] = [
  {
    title:       "teal and rust preset",
    downloadUrl: "https://drive.google.com/file/d/1AGkYBYYrDQjKcA2_Fx_SP0MIMTuTJMkj/view?usp=sharing",
    password:    "",
  },
  {
    title:       "how to create mint blue",
    downloadUrl: "https://drive.google.com/file/d/1gZgi9LhOZQhNpKXEWYFUU1Y8bWnWDFwJ/view?usp=sharing",
    password:    "",
  },
  {
    title:       "tropical preset",
    downloadUrl: "https://drive.google.com/file/d/1yf5OsImwg8NDiLqSmqwkaY_n9Au1C1LE/view?usp=sharing",
    password:    "",
  },
  {
    title:       "cinematic v3 preset",
    downloadUrl: "https://drive.google.com/file/d/1xcUZmJa_qFHlCKsbNPa3FnPozbBHzT_J/view?usp=sharing",
    password:    "",
  },
  {
    title:       "matte tone",
    downloadUrl: "https://drive.google.com/file/d/1xSQ2JcShFPYO0U5t4PWGtjJ8OkC1Lus0/view?usp=sharing",
    password:    "",
  },
  {
    title:       "cinematic gold",
    downloadUrl: "https://drive.google.com/file/d/1vtnOyY0_-R5oAw5WMZ1uXaxj9tIqwP3p/view?usp=sharing",
    password:    "",
  },
  {
    title:       "misty forest",
    downloadUrl: "https://drive.google.com/file/d/1uAY6Gpey9fTjXHYI3bF7oceA6GpK62RJ/view?usp=sharing",
    password:    "",
  },
  {
    title:       "aesthetic purple",
    downloadUrl: "https://drive.google.com/file/d/1r60gguePjZx3VLaABgpot0Jtdvk9BmQV/view?usp=sharing",
    password:    "",
  },
  {
    title:       "moody city",
    downloadUrl: "https://drive.google.com/file/d/1lsXAphSzWLaTVqAfO5MySKNwJYW38TgL/view?usp=sharing",
    password:    "",
  },
  {
    title:       "deep cinematic",
    downloadUrl: "https://drive.google.com/file/d/1gwvhB9uneFTTDyKCZDC0YN7tYsaBC-az/view?usp=sharing",
    password:    "",
  },
  {
    title:       "clean",
    downloadUrl: "https://drive.google.com/file/d/1gO9mI12xF5H5T_vxxJ-53z0y0-YSdngl/view?usp=sharing",
    password:    "",
  },
  {
    title:       "caramel",
    downloadUrl: "https://drive.google.com/file/d/1ejUQyj-h3eYDLW_UiHvCQVcNvX_aCSAa/view?usp=sharing",
    password:    "",
  },
  {
    title:       "dark blue",
    downloadUrl: "https://drive.google.com/file/d/1ExG2qkEG_DOFDgzyfs46TkPIUMRHDXk6/view?usp=sharing",
    password:    "",
  },
  {
    title:       "aesthetic beige pink",
    downloadUrl: "https://drive.google.com/file/d/199-2OyiB1uhbU9JcrFQEWdJD8PA5jdfy/view?usp=sharing",
    password:    "",
  },
  {
    title:       "aesthetic nightvision",
    downloadUrl: "https://drive.google.com/file/d/14JqA_HAIPN5x3dMk0oVvqS139QVkAT3N/view?usp=sharing",
    password:    "",
  },
  {
    title:       "red and white",
    downloadUrl: "https://drive.google.com/file/d/12zbyI5c6biB-0jTZejXbj9R16Eigy4Vo/view?usp=sharing",
    password:    "",
  },
  {
    title:       "aesthetic beach",
    downloadUrl: "https://drive.google.com/file/d/12AgBENNR1_cblYFGkR0N4q1pNrSTGOdZ/view?usp=sharing",
    password:    "",
  },
  {
    title:       "nightlife",
    downloadUrl: "https://drive.google.com/file/d/1152__jw9YhbQYEfiP2Jv4WpAHUEu7Cra/view?usp=sharing",
    password:    "",
  },
  {
    title:       "magical sunset",
    downloadUrl: "https://drive.google.com/file/d/1ygMRyrlQpgd3jefKTj-KMACkNSJCU-Ge/view?usp=sharing",
    password:    "",
  },
  {
    title:       "city grey",
    downloadUrl: "https://drive.google.com/file/d/1xiVtNpGVydl8gNmSCq5d11sqmdkg-mpf/view?usp=sharing",
    password:    "",
  },
  {
    title:       "urban v2",
    downloadUrl: "https://drive.google.com/file/d/1wsBmZHLn3ECz-HdVvhb_ZF9QN0JMAGMC/view?usp=sharing",
    password:    "",
  },
  {
    title:       "aqua red",
    downloadUrl: "https://drive.google.com/file/d/1wCvlewGVCYBh4FmeQ6RWQTLDveNCXm2m/view?usp=sharing",
    password:    "",
  },
  {
    title:       "pastel beach",
    downloadUrl: "https://drive.google.com/file/d/1vkxiweudP4uX0ksS51LsrZ_AGbZD8AvT/view?usp=sharing",
    password:    "",
  },
  {
    title:       "fantasy lightroom",
    downloadUrl: "https://drive.google.com/file/d/1tmcwsi0FV-zEFYcY5Vbpzi4rS6-6qus9/view?usp=sharing",
    password:    "",
  },
  {
    title:       "motography v2",
    downloadUrl: "https://drive.google.com/file/d/1sO3mtoIVFqxV9v3FB-mMBaKVMTjGM9JF/view?usp=sharing",
    password:    "",
  },
  {
    title:       "moody green",
    downloadUrl: "https://drive.google.com/file/d/1ocwsnxPjvrjp55qyOrasnnaSvEcd6tzA/view?usp=sharing",
    password:    "",
  },
  {
    title:       "vibrant red",
    downloadUrl: "https://drive.google.com/file/d/1nlaW6_9mac_XJkUgQMcz5dDjfVyWlodB/view?usp=sharing",
    password:    "",
  },
  {
    title:       "cinematic street",
    downloadUrl: "https://drive.google.com/file/d/1n9EkY1ITGbNw7jJQROBHYK3ZJRDfFMN4/view?usp=sharing",
    password:    "",
  },
  {
    title:       "vintage blue",
    downloadUrl: "https://drive.google.com/file/d/1lhuRSF2ROEHWU6_dWa6GO2gQuVMwOZ5E/view?usp=sharing",
    password:    "",
  },
  {
    title:       "brownish yellow",
    downloadUrl: "https://drive.google.com/file/d/1kEX-rDbTcd-b9KU3N1vJPw9foreMevDl/view?usp=sharing",
    password:    "",
  },
  {
    title:       "garage",
    downloadUrl: "https://drive.google.com/file/d/1eBudWhOEwwYUTql9ppyxwF0q1hVsZXKp/view?usp=sharing",
    password:    "",
  },
  {
    title:       "aesthetic selfie",
    downloadUrl: "https://drive.google.com/file/d/1cf1zwR-FgILHjIuCqGvT6bFocLB_FqBu/view?usp=sharing",
    password:    "",
  },
  {
    title:       "vintage car",
    downloadUrl: "https://drive.google.com/file/d/1VY4d_P7Qyxh1oRSd4y9WWQTG-oh_Yx7f/view?usp=sharing",
    password:    "",
  },
  {
    title:       "campfire",
    downloadUrl: "https://drive.google.com/file/d/1S6fo8X4YOrWiNyZWZlTgkCsYeCHjFGVW/view?usp=sharing",
    password:    "",
  },
  {
    title:       "aesthetic mood",
    downloadUrl: "https://drive.google.com/file/d/1Qsz3xvqsi2ArXHgrsc94h5LotDOenV_y/view?usp=sharing",
    password:    "",
  },
  {
    title:       "arius",
    downloadUrl: "https://drive.google.com/file/d/1PBK4cYbkiZUOXD7Pwv72X_MR0Ci7UTUG/view?usp=sharing",
    password:    "",
  },
  {
    title:       "film green",
    downloadUrl: "https://drive.google.com/file/d/1OPj-3r83bmD1hvaHNTMLy86Z3PiWVelk/view?usp=sharing",
    password:    "",
  },
  {
    title:       "silhioutte",
    downloadUrl: "https://drive.google.com/file/d/1LTUNuEaDgJsJjOOPbqGl8zBQkoXmF8vP/view?usp=sharing",
    password:    "",
  },
  {
    title:       "cinematic car v1",
    downloadUrl: "https://drive.google.com/file/d/1L5ieqxWULJ6G3aulq0lyRiQVJZOpqFBd/view?usp=sharing",
    password:    "",
  },
  {
    title:       "chocolate brown",
    downloadUrl: "https://drive.google.com/file/d/1NJWcVln1qRpIweT9waSosGqvcHPsgP0L/view?usp=sharing",
    password:    "",
  },
  {
    title:       "celestial",
    downloadUrl: "https://drive.google.com/file/d/1FDDyqx317XNnDlvmBLTvBxbbltlIcu5d/view?usp=sharing",
    password:    "",
  },
  {
    title:       "travel blogger",
    downloadUrl: "https://drive.google.com/file/d/1DWxnqzRhSRH-3gnnnghouFF_yCrukvmn/view?usp=sharing",
    password:    "",
  },
  {
    title:       "riverdale",
    downloadUrl: "https://drive.google.com/file/d/1Bv0qJP1fPpH5a_gS-OAQQlR-JLF4a3QK/view?usp=sharing",
    password:    "",
  },
  {
    title:       "ig wanderlust",
    downloadUrl: "https://drive.google.com/file/d/19vanl_rtVpKfJlKfuKV3nt71kCLej06Y/view?usp=sharing",
    password:    "",
  },
  {
    title:       "new york",
    downloadUrl: "https://drive.google.com/file/d/18xFvsWhdyJ5d-ANxVwHM6WVv_rZZCWfb/view?usp=sharing",
    password:    "",
  },
  {
    title:       "hodophile",
    downloadUrl: "https://drive.google.com/file/d/17WANeVzIp3BZ97UjYXSkYOuHWUsgmnN1/view?usp=sharing",
    password:    "",
  },
  {
    title:       "blogger",
    downloadUrl: "https://drive.google.com/file/d/16eN6MMOc18tGPUhMkwWaOdY4AiPHWkDr/view?usp=sharing",
    password:    "",
  },
  {
    title:       "retouch",
    downloadUrl: "https://drive.google.com/file/d/13HsrYCHFjx90at_Ttv7sqDqUelfQWcZ7/view?usp=sharing",
    password:    "",
  },
  {
    title:       "black moody",
    downloadUrl: "https://drive.google.com/file/d/12asLEpekGNhR0HVtkgraeTtyHkio7eNc/view?usp=sharing",
    password:    "",
  },
  {
    title:       "vanilla",
    downloadUrl: "https://drive.google.com/file/d/11w76ECcVA9DEhLLm3KGbpmrPpgkvKQDh/view?usp=sharing",
    password:    "",
  },
  {
    title:       "indie",
    downloadUrl: "https://drive.google.com/file/d/11LpHrplE1PNlWmTHDiQs3Sfyjz0sJ24E/view?usp=sharing",
    password:    "",
  },
  {
    title:       "ruby",
    downloadUrl: "https://drive.google.com/file/d/10SVws9DiS7YkeAtGZhV_WDd_xhtfpnTI/view?usp=sharing",
    password:    "",
  },
  {
    title:       "urban retro",
    downloadUrl: "https://drive.google.com/file/d/103HnLE9_aKUHgtOh0hCfkww2TVCVuWIT/view?usp=sharing",
    password:    "",
  },
  {
    title:       "tempo",
    downloadUrl: "https://drive.google.com/file/d/1-RKwLiVatSz48oEhErATRhuR8bO0P4S_/view?usp=sharing",
    password:    "",
  },
  {
    title:       "christmas",
    downloadUrl: "https://drive.google.com/file/d/1zk-FUIXXBIFNefkiTVPN8jGjTG4HrCyG/view?usp=sharing",
    password:    "",
  },
  {
    title:       "pastel tone",
    downloadUrl: "https://drive.google.com/file/d/1ynKZDHkAx4dQ-4I_QzY1UGvewy8junXm/view?usp=sharing",
    password:    "",
  },
  {
    title:       "golden sunrise",
    downloadUrl: "https://drive.google.com/file/d/1yOzNFmMEWOvDHzar7-27t-vNoxJAodEC/view?usp=sharing",
    password:    "",
  },
  {
    title:       "faded street",
    downloadUrl: "https://drive.google.com/file/d/1xlNmQah9_CUXjOEKrbx_yHMlBoT34QGx/view?usp=sharing",
    password:    "",
  },
  {
    title:       "how to edit cinematic look",
    downloadUrl: "https://drive.google.com/file/d/1xKMElVGmlblkfWjrvZfuyIM4T766deY_/view?usp=sharing",
    password:    "",
  },
  {
    title:       "magical portrait",
    downloadUrl: "https://drive.google.com/file/d/1wpZoPyTE8AKbXfEArRkj_thdwLG6EOUq/view?usp=sharing",
    password:    "",
  },
  {
    title:       "soft orange ton",
    downloadUrl: "https://drive.google.com/file/d/1uUx0b0RVPRXL0VcskB8HFpE5XglBMqiL/view?usp=sharing",
    password:    "",
  },
  {
    title:       "vintage",
    downloadUrl: "https://drive.google.com/file/d/1u-Jrm2vU6LC1ykzK9znLhMtgUGBPsAr9/view?usp=sharing",
    password:    "",
  },
  {
    title:       "red velvet",
    downloadUrl: "https://drive.google.com/file/d/1tKMGnzm9hNMDukIfg-XbmUVa4qNGAKiL/view?usp=sharing",
    password:    "",
  },
  {
    title:       "anime",
    downloadUrl: "https://drive.google.com/file/d/1sUfjfxvqy-SHJKhDzPke6_b7ZjGDTAzL/view?usp=sharing",
    password:    "",
  },
  {
    title:       "black and orange",
    downloadUrl: "https://drive.google.com/file/d/1s7G83hgGKWGfAN7GKlbCaTg9fWUcXxfS/view?usp=sharing",
    password:    "",
  },
  {
    title:       "frozen",
    downloadUrl: "https://drive.google.com/file/d/1riHSTsTSdGCDulEvXzfk_h7MySE5Jg6H/view?usp=sharing",
    password:    "",
  },
  {
    title:       "matte blue",
    downloadUrl: "https://drive.google.com/file/d/1rKBEmdhnpMwyNp4h7B-8VHZSCXito2gW/view?usp=sharing",
    password:    "",
  },
  {
    title:       "aqua sunset",
    downloadUrl: "https://drive.google.com/file/d/1q8g5tAQHts_NAfzYgeL3MmMk_2v8Hq0H/view?usp=sharing",
    password:    "",
  },
  {
    title:       "urban",
    downloadUrl: "https://drive.google.com/file/d/1pjdAxZkivrzDJvyS1QjoZGtBPYJzHPg6/view?usp=sharing",
    password:    "",
  },
  {
    title:       "moody red",
    downloadUrl: "https://drive.google.com/file/d/1pM_CZ6_LvQMpM-_12Nc3PC3JY75Kgb8H/view?usp=sharing",
    password:    "",
  },
  {
    title:       "grainy vintage",
    downloadUrl: "https://drive.google.com/file/d/1pDUmhRGGRTbnwyV7-6RTwFR4caVi1ZNc/view?usp=sharing",
    password:    "",
  },
  {
    title:       "cinematic blue",
    downloadUrl: "https://drive.google.com/file/d/1oK6FMlyKAO5cvO8d7JGxEiy1tUx5nTJr/view?usp=sharing",
    password:    "",
  },
  {
    title:       "portrait black and white",
    downloadUrl: "https://drive.google.com/file/d/1DuaAzgdImxS0Yw5_PI--qwHBPNkNrXbH/view?usp=sharing",
    password:    "",
  },
  {
    title:       "urban classic",
    downloadUrl: "https://drive.google.com/file/d/1nj4F_-JuppR6eLzO2DBTuVnjfLlfnbBn/view?usp=sharing",
    password:    "",
  },
  {
    title:       "moody brown",
    downloadUrl: "https://drive.google.com/file/d/1nYlqQA5by6LjH11I1kvaRMbg06cboM2e/view?usp=sharing",
    password:    "",
  },
  {
    title:       "moody night tone",
    downloadUrl: "https://drive.google.com/file/d/1n17bFasT32ikF6ryn_qogOnHUcCoNy3i/view?usp=sharing",
    password:    "",
  },
  {
    title:       "film faded",
    downloadUrl: "https://drive.google.com/file/d/1mSvGSPCzgvSYnNzKrTBkepQA2KYcDfSn/view?usp=sharing",
    password:    "",
  },
  {
    title:       "bali",
    downloadUrl: "https://drive.google.com/file/d/1m5LsCpuIN_zafmeX7Rm6AFjRcjgc9pa2/view?usp=sharing",
    password:    "",
  },
  {
    title:       "jordi koalitic",
    downloadUrl: "https://drive.google.com/file/d/1lnyHgCd0JNqEOB8A3k7izHijrJlikOTm/view?usp=sharing",
    password:    "",
  },
  {
    title:       "dark grey tone",
    downloadUrl: "https://drive.google.com/file/d/1kptxw7Qgm2mqEmMKCr30FqfttAZNkB1y/view?usp=sharing",
    password:    "",
  },
  {
    title:       "cyberpunk",
    downloadUrl: "https://drive.google.com/file/d/1lW7lb9veL480mytvpqnEbWhAk5kNCWTw/view?usp=sharing",
    password:    "",
  },
  {
    title:       "summer",
    downloadUrl: "https://drive.google.com/file/d/1l27LD9ag96yhI32Dar_lSHNliKFoCU9e/view?usp=sharing",
    password:    "",
  },
  {
    title:       "rich black",
    downloadUrl: "NA",
    password:    "",
  },
  {
    title:       "deep sky tone",
    downloadUrl: "https://drive.google.com/file/d/1hJ7g86w3THQjNj7dH23I5MtsguDihG6x/view?usp=sharing",
    password:    "",
  },
  {
    title:       "bokeh light effect",
    downloadUrl: "https://drive.google.com/drive/u/0/folders/1NroyMu6PKCvsJztA4FkX4rl-xZWCEoUb",
    password:    "",
  },
  {
    title:       "cream tone",
    downloadUrl: "https://drive.google.com/file/d/1gmIdUiSDXukw4ZI0LruaDjo33kEYdHr8/view?usp=sharing",
    password:    "",
  },
  {
    title:       "dark disposable camera",
    downloadUrl: "https://drive.google.com/drive/u/0/folders/1NroyMu6PKCvsJztA4FkX4rl-xZWCEoUb",
    password:    "",
  },
  {
    title:       "black urban",
    downloadUrl: "https://drive.google.com/file/d/1gC2lHutTv4J1-yo7rlAQLFlHmiY0hKyO/view?usp=sharing",
    password:    "",
  },
  {
    title:       "orange teal",
    downloadUrl: "https://drive.google.com/file/d/1g538ru4JbsEq9KaCBmNSMYmvYzF4iXpu/view?usp=sharing",
    password:    "",
  },
  {
    title:       "tokyo",
    downloadUrl: "https://drive.google.com/file/d/1fsshwgE1liZUG3mRktUCnZ1l-4spfEgD/view?usp=sharing",
    password:    "",
  },
  {
    title:       "dual tone",
    downloadUrl: "NA",
    password:    "",
  },
  {
    title:       "light denim",
    downloadUrl: "https://drive.google.com/file/d/1fIaMxREQ08_RFhKCg3WPlDufjQbZ1_Ky/view?usp=sharing",
    password:    "",
  },
  {
    title:       "warm golden",
    downloadUrl: "NA",
    password:    "",
  },
  {
    title:       "motography",
    downloadUrl: "https://drive.google.com/file/d/1erG8e8chSgiZZdhx-WM7SElhNZEKX5ua/view?usp=sharing",
    password:    "",
  },
  {
    title:       "urban steel",
    downloadUrl: "https://drive.google.com/file/d/1eJaT3CFN_e6Ua6C908ZpY2qb3xEkPJrp/view?usp=sharing",
    password:    "",
  },
  {
    title:       "adventure",
    downloadUrl: "https://drive.google.com/file/d/1dPyoeTZbuPvCx7Ry94vGhBNOJ2jZKrJQ/view?usp=sharing",
    password:    "",
  },
  {
    title:       "film grey",
    downloadUrl: "https://drive.google.com/file/d/1CFFeU_c-VqclW1MTZT9gadEa2fl954V8/view?usp=sharing",
    password:    "",
  },
  {
    title:       "dark black tone effect",
    downloadUrl: "https://drive.google.com/file/d/1C17DYz36XpOHidcMbbMWV-IrAteBDdmI/view?usp=sharing",
    password:    "",
  },
  {
    title:       "food blogger",
    downloadUrl: "https://drive.google.com/file/d/1Bwv0YmcmmOPB8IlwYTgO6DZ4NJDVr2c-/view?usp=sharing",
    password:    "",
  },
]

/* ── Lookup index (built once, O(1) lookups) ────────────────────── */

const INDEX = new Map<string, PresetDownload>(
  PRESET_DOWNLOADS.map((entry) => [entry.title.toLowerCase().trim(), entry])
)

/**
 * Returns the download entry for a preset, matched case-insensitively by title.
 * Returns null if the preset is not in the registry.
 */
export function getPresetDownload(presetName: string): PresetDownload | null {
  return INDEX.get(presetName.toLowerCase().trim()) ?? null
}
