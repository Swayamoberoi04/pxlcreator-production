export interface Bundle {
  id:                  string
  name:                string
  slug:                string
  tagline:             string | null
  description:         string | null
  seoTitle:            string | null
  seoDescription:      string | null
  thumbnailUrl:        string | null
  bannerUrl:           string | null
  badge:               string | null
  displayOrder:        number
  bundlePriceUsd:      number
  compareAtPriceUsd:   number | null
  downloadUrl:         string | null
  isPublished:         boolean
  isFeatured:          boolean
  createdAt:           string
  updatedAt:           string
}

export interface BundlePreset {
  presetId:    string
  orderIndex:  number
  name:        string
  slug:        string
  thumbnailUrl: string | null
  priceUsd:    number
  category:    string | null
}

export interface BundleWithPresets extends Bundle {
  presets:       BundlePreset[]
  presetCount:   number
  totalValue:    number
  savings:       number
}
