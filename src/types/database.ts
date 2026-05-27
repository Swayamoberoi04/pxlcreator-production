/**
 * src/types/database.ts
 *
 * Supabase database type definitions.
 * These mirror the schema in supabase/migrations/001_initial_schema.sql.
 *
 * Usage with Supabase client:
 *   import type { Database } from "@/types/database"
 *   createClient<Database>(url, key)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      /* ── categories ─────────────────────────────────── */
      categories: {
        Row: {
          id:          string
          name:        string
          slug:        string
          description: string | null
          icon:        string | null
          color:       string | null
          order_index: number
          created_at:  string
        }
        Insert: {
          id?:         string
          name:        string
          slug:        string
          description?: string | null
          icon?:       string | null
          color?:      string | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?:          string
          name?:        string
          slug?:        string
          description?: string | null
          icon?:        string | null
          color?:       string | null
          order_index?: number
        }
        Relationships: []
      }

      /* ── presets ────────────────────────────────────── */
      presets: {
        Relationships: []
        Row: {
          id:                 string
          slug:               string
          title:              string
          tagline:            string | null
          description:        string | null
          category_id:        string | null
          thumbnail_url:      string | null
          before_url:         string | null
          after_url:          string | null
          youtube_video_id:   string | null
          youtube_url:        string | null
          youtube_channel_id: string | null
          youtube_raw_title:  string | null
          youtube_raw_desc:   string | null
          youtube_published:  string | null
          youtube_thumbnail:  string | null
          price:              number
          original_price:     number | null
          is_free:            boolean
          is_featured:        boolean
          is_published:       boolean
          badge:              "New" | "Best Seller" | "Sale" | "Free" | null
          download_url:       string | null
          download_file_name: string | null
          include_count:      number | null
          preset_type:        string
          mood:               string | null
          tone:               string | null
          features:           string[]
          compatibility:      string[]
          ai_tags:            string[]
          rating:             number
          review_count:       number
          view_count:         number
          purchase_count:     number
          download_count:     number
          order_index:        number
          created_at:         string
          updated_at:         string
        }
        Insert: {
          id?:                string
          slug:               string
          title:              string
          tagline?:           string | null
          description?:       string | null
          category_id?:       string | null
          thumbnail_url?:     string | null
          before_url?:        string | null
          after_url?:         string | null
          youtube_video_id?:  string | null
          youtube_url?:       string | null
          youtube_channel_id?: string | null
          youtube_raw_title?: string | null
          youtube_raw_desc?:  string | null
          youtube_published?: string | null
          youtube_thumbnail?: string | null
          price?:             number
          original_price?:    number | null
          is_free?:           boolean
          is_featured?:       boolean
          is_published?:      boolean
          badge?:             "New" | "Best Seller" | "Sale" | "Free" | null
          download_url?:      string | null
          download_file_name?: string | null
          include_count?:     number | null
          preset_type?:       string
          mood?:              string | null
          tone?:              string | null
          features?:          string[]
          compatibility?:     string[]
          ai_tags?:           string[]
          rating?:            number
          review_count?:      number
          view_count?:        number
          purchase_count?:    number
          download_count?:    number
          order_index?:       number
        }
        Update: {
          slug?:               string
          title?:              string
          tagline?:            string | null
          description?:        string | null
          category_id?:        string | null
          thumbnail_url?:      string | null
          before_url?:         string | null
          after_url?:          string | null
          youtube_video_id?:   string | null
          youtube_url?:        string | null
          youtube_channel_id?: string | null
          youtube_raw_title?:  string | null
          youtube_raw_desc?:   string | null
          youtube_published?:  string | null
          youtube_thumbnail?:  string | null
          price?:              number
          original_price?:     number | null
          is_free?:            boolean
          is_featured?:        boolean
          is_published?:       boolean
          badge?:              "New" | "Best Seller" | "Sale" | "Free" | null
          download_url?:       string | null
          download_file_name?: string | null
          include_count?:      number | null
          preset_type?:        string
          mood?:               string | null
          tone?:               string | null
          features?:           string[]
          compatibility?:      string[]
          ai_tags?:            string[]
          rating?:             number
          review_count?:       number
          view_count?:         number
          purchase_count?:     number
          download_count?:     number
          order_index?:        number
        }
      }

      /* ── preset_images ──────────────────────────────── */
      preset_images: {
        Row: {
          id:          string
          preset_id:   string
          url:         string
          alt_text:    string | null
          order_index: number
          created_at:  string
        }
        Insert: {
          id?:          string
          preset_id:    string
          url:          string
          alt_text?:    string | null
          order_index?: number
        }
        Update: {
          url?:         string
          alt_text?:    string | null
          order_index?: number
        }
        Relationships: []
      }

      /* ── tags ───────────────────────────────────────── */
      tags: {
        Row: {
          id:   string
          name: string
          slug: string
        }
        Insert: {
          id?:  string
          name: string
          slug: string
        }
        Update: {
          name?: string
          slug?: string
        }
        Relationships: []
      }

      /* ── preset_tags ────────────────────────────────── */
      preset_tags: {
        Row: {
          preset_id: string
          tag_id:    string
        }
        Insert: {
          preset_id: string
          tag_id:    string
        }
        Update: Record<string, never>
        Relationships: []
      }

      /* ── coupon_codes ──────────────────────────────── */
      coupon_codes: {
        Row: {
          id:             string
          code:           string
          discount_type:  "percentage" | "fixed_inr" | "fixed_usd"
          discount_value: number
          min_order_inr:  number | null
          max_uses:       number | null
          used_count:     number
          expires_at:     string | null
          is_active:      boolean
          created_at:     string
        }
        Insert: {
          id?:            string
          code:           string
          discount_type:  "percentage" | "fixed_inr" | "fixed_usd"
          discount_value: number
          min_order_inr?: number | null
          max_uses?:      number | null
          used_count?:    number
          expires_at?:    string | null
          is_active?:     boolean
        }
        Update: {
          code?:          string
          discount_type?: "percentage" | "fixed_inr" | "fixed_usd"
          discount_value?: number
          min_order_inr?: number | null
          max_uses?:      number | null
          used_count?:    number
          expires_at?:    string | null
          is_active?:     boolean
        }
        Relationships: []
      }

      /* ── user_profiles ──────────────────────────────── */
      user_profiles: {
        Row: {
          firebase_uid: string
          email:        string
          display_name: string | null
          created_at:   string
          updated_at:   string
        }
        Insert: {
          firebase_uid: string
          email:        string
          display_name?: string | null
        }
        Update: {
          email?:        string
          display_name?: string | null
        }
        Relationships: []
      }

      /* ── orders ─────────────────────────────────────── */
      orders: {
        Row: {
          id:                   string
          firebase_uid:         string | null
          email:                string
          customer_name:        string | null
          status:               "pending" | "paid" | "failed" | "cancelled" | "refunded"
          currency_display:     "USD" | "INR"
          usd_to_inr_rate:      number
          subtotal_usd:         number
          subtotal_inr:         number
          discount_amount_inr:  number
          total_inr:            number
          razorpay_order_id:    string | null
          razorpay_payment_id:  string | null
          coupon_id:            string | null
          created_at:           string
          paid_at:              string | null
          updated_at:           string
        }
        Insert: {
          id?:                  string
          firebase_uid?:        string | null
          email:                string
          customer_name?:       string | null
          status?:              "pending" | "paid" | "failed" | "cancelled" | "refunded"
          currency_display?:    "USD" | "INR"
          usd_to_inr_rate?:     number
          subtotal_usd:         number
          subtotal_inr:         number
          discount_amount_inr?: number
          total_inr:            number
          razorpay_order_id?:   string | null
          razorpay_payment_id?: string | null
          coupon_id?:           string | null
          paid_at?:             string | null
        }
        Update: {
          status?:              "pending" | "paid" | "failed" | "cancelled" | "refunded"
          razorpay_order_id?:   string | null
          razorpay_payment_id?: string | null
          paid_at?:             string | null
        }
        Relationships: []
      }

      /* ── order_items ────────────────────────────────── */
      order_items: {
        Row: {
          id:            string
          order_id:      string
          preset_id:     string
          preset_slug:   string
          preset_title:  string
          price_usd:     number
          price_inr:     number
          quantity:      number
          created_at:    string
        }
        Insert: {
          id?:           string
          order_id:      string
          preset_id:     string
          preset_slug:   string
          preset_title:  string
          price_usd:     number
          price_inr:     number
          quantity?:     number
        }
        Update: Record<string, never>
        Relationships: []
      }

      /* ── payment_transactions ───────────────────────── */
      payment_transactions: {
        Row: {
          id:                   string
          order_id:             string
          razorpay_payment_id:  string | null
          razorpay_order_id:    string | null
          razorpay_signature:   string | null
          amount_inr:           number
          status:               "created" | "authorized" | "captured" | "failed" | "refunded"
          error_code:           string | null
          error_description:    string | null
          captured_at:          string | null
          created_at:           string
        }
        Insert: {
          id?:                  string
          order_id:             string
          razorpay_payment_id?: string | null
          razorpay_order_id?:   string | null
          razorpay_signature?:  string | null
          amount_inr:           number
          status?:              "created" | "authorized" | "captured" | "failed" | "refunded"
          error_code?:          string | null
          error_description?:   string | null
          captured_at?:         string | null
        }
        Update: {
          status?:              "created" | "authorized" | "captured" | "failed" | "refunded"
          error_code?:          string | null
          error_description?:   string | null
          captured_at?:         string | null
        }
        Relationships: []
      }

      /* ── download_tokens ────────────────────────────── */
      download_tokens: {
        Row: {
          id:              string
          order_item_id:   string
          firebase_uid:    string | null
          token:           string
          preset_title:    string
          preset_slug:     string
          download_url:    string | null
          expires_at:      string
          download_count:  number
          max_downloads:   number
          last_downloaded: string | null
          created_at:      string
        }
        Insert: {
          id?:             string
          order_item_id:   string
          firebase_uid?:   string | null
          token:           string
          preset_title:    string
          preset_slug:     string
          download_url?:   string | null
          expires_at:      string
          download_count?: number
          max_downloads?:  number
        }
        Update: {
          download_count?:  number
          last_downloaded?: string | null
        }
        Relationships: []
      }

      /* ── preset_reviews ────────────────────────────── */
      preset_reviews: {
        Row: {
          id:                   string
          preset_id:            string
          firebase_uid:         string
          email:                string
          rating:               number
          review_text:          string | null
          is_approved:          boolean
          is_verified_purchase: boolean
          created_at:           string
          updated_at:           string
        }
        Insert: {
          id?:                   string
          preset_id:             string
          firebase_uid:          string
          email:                 string
          rating:                number
          review_text?:          string | null
          is_approved?:          boolean
          is_verified_purchase?: boolean
        }
        Update: {
          rating?:               number
          review_text?:          string | null
          is_approved?:          boolean
          is_verified_purchase?: boolean
        }
        Relationships: []
      }

      /* ── storage_assets ─────────────────────────────── */
      storage_assets: {
        Row: {
          id:          string
          preset_id:   string | null
          bucket:      string
          path:        string
          file_name:   string
          file_size:   number | null
          mime_type:   string | null
          asset_type:  "thumbnail" | "download_file" | "gallery_image" | "before" | "after"
          uploaded_by: string | null
          created_at:  string
        }
        Insert: {
          id?:         string
          preset_id?:  string | null
          bucket:      string
          path:        string
          file_name:   string
          file_size?:  number | null
          mime_type?:  string | null
          asset_type:  "thumbnail" | "download_file" | "gallery_image" | "before" | "after"
          uploaded_by?: string | null
        }
        Update: {
          preset_id?:  string | null
          file_size?:  number | null
          mime_type?:  string | null
          asset_type?: "thumbnail" | "download_file" | "gallery_image" | "before" | "after"
        }
        Relationships: []
      }

      /* ── bundles ────────────────────────────────────── */
      bundles: {
        Row: {
          id:                   string
          slug:                 string
          title:                string
          tagline:              string | null
          description:          string | null
          why_creators_love_it: string | null
          preset_id:            string | null
          price_usd:            number
          individual_value_usd: number
          bundle_badge:         "BESTSELLER" | "MOST POPULAR" | "CREATOR FAVORITE" | "PRO LEVEL" | "TRENDING" | "BEST VALUE" | "LIMITED" | "NEW"
          is_featured:          boolean
          is_published:         boolean
          target_audience:      string[]
          use_cases:            string[]
          features:             string[]
          thumbnail_url:        string | null
          order_index:          number
          created_at:           string
          updated_at:           string
        }
        Insert: {
          id?:                  string
          slug:                 string
          title:                string
          tagline?:             string | null
          description?:         string | null
          why_creators_love_it?: string | null
          preset_id?:           string | null
          price_usd:            number
          individual_value_usd: number
          bundle_badge?:        "BESTSELLER" | "MOST POPULAR" | "CREATOR FAVORITE" | "PRO LEVEL" | "TRENDING" | "BEST VALUE" | "LIMITED" | "NEW"
          is_featured?:         boolean
          is_published?:        boolean
          target_audience?:     string[]
          use_cases?:           string[]
          features?:            string[]
          thumbnail_url?:       string | null
          order_index?:         number
        }
        Update: {
          slug?:                string
          title?:               string
          tagline?:             string | null
          description?:         string | null
          why_creators_love_it?: string | null
          preset_id?:           string | null
          price_usd?:           number
          individual_value_usd?: number
          bundle_badge?:        "BESTSELLER" | "MOST POPULAR" | "CREATOR FAVORITE" | "PRO LEVEL" | "TRENDING" | "BEST VALUE" | "LIMITED" | "NEW"
          is_featured?:         boolean
          is_published?:        boolean
          target_audience?:     string[]
          use_cases?:           string[]
          features?:            string[]
          thumbnail_url?:       string | null
          order_index?:         number
        }
        Relationships: []
      }

      /* ── bundle_included_packs ──────────────────────── */
      bundle_included_packs: {
        Row: {
          id:           string
          bundle_id:    string
          name:         string
          preset_count: number
          category:     string
          description:  string | null
          icon:         string | null
          order_index:  number
        }
        Insert: {
          id?:          string
          bundle_id:    string
          name:         string
          preset_count?: number
          category:     string
          description?: string | null
          icon?:        string | null
          order_index?: number
        }
        Update: {
          name?:        string
          preset_count?: number
          category?:    string
          description?: string | null
          icon?:        string | null
          order_index?: number
        }
        Relationships: []
      }

      /* ── bundle_presets ─────────────────────────────── */
      bundle_presets: {
        Row: {
          bundle_id: string
          preset_id: string
        }
        Insert: {
          bundle_id: string
          preset_id: string
        }
        Update: Record<string, never>
        Relationships: []
      }

      /* ── subscriptions ──────────────────────────────── */
      subscriptions: {
        Row: {
          id:                   string
          firebase_uid:         string
          email:                string
          plan_id:              "creator" | "pro"
          billing_cycle:        "monthly" | "yearly"
          status:               "active" | "cancelled" | "expired" | "past_due"
          amount_usd:           number
          amount_inr:           number
          current_period_start: string
          current_period_end:   string
          razorpay_order_id:    string | null
          razorpay_payment_id:  string | null
          cancelled_at:         string | null
          created_at:           string
          updated_at:           string
        }
        Insert: {
          id?:                  string
          firebase_uid:         string
          email?:               string
          plan_id:              "creator" | "pro"
          billing_cycle:        "monthly" | "yearly"
          status?:              "active" | "cancelled" | "expired" | "past_due"
          amount_usd:           number
          amount_inr:           number
          current_period_start: string
          current_period_end:   string
          razorpay_order_id?:   string | null
          razorpay_payment_id?: string | null
          cancelled_at?:        string | null
          updated_at?:          string
        }
        Update: {
          status?:              "active" | "cancelled" | "expired" | "past_due"
          razorpay_payment_id?: string | null
          cancelled_at?:        string | null
          updated_at?:          string
          email?:               string
        }
        Relationships: []
      }

      /* ── subscription_payments ──────────────────────── */
      subscription_payments: {
        Row: {
          id:                   string
          subscription_id:      string | null
          firebase_uid:         string
          plan_id:              string
          billing_cycle:        string
          razorpay_order_id:    string
          razorpay_payment_id:  string | null
          razorpay_signature:   string | null
          amount_usd:           number
          amount_inr:           number
          status:               "pending" | "captured" | "failed" | "refunded"
          period_start:         string | null
          period_end:           string | null
          created_at:           string
        }
        Insert: {
          id?:                  string
          subscription_id?:     string | null
          firebase_uid:         string
          plan_id:              string
          billing_cycle:        string
          razorpay_order_id:    string
          razorpay_payment_id?: string | null
          razorpay_signature?:  string | null
          amount_usd:           number
          amount_inr:           number
          status?:              "pending" | "captured" | "failed" | "refunded"
          period_start?:        string | null
          period_end?:          string | null
        }
        Update: {
          subscription_id?:     string | null
          razorpay_payment_id?: string | null
          razorpay_signature?:  string | null
          status?:              "pending" | "captured" | "failed" | "refunded"
          period_start?:        string | null
          period_end?:          string | null
        }
        Relationships: []
      }

      /* ── creator_profiles ──────────────────────────── */
      creator_profiles: {
        Row: {
          id:                      string
          firebase_uid:            string
          professions:             string[]
          goals:                   string[]
          aesthetics:              string[]
          skill_level:             string | null
          platforms:               string[]
          affinities:              Json
          style_dna_title:         string | null
          style_dna_tagline:       string | null
          style_dna_badge:         string | null
          style_dna_color:         string | null
          style_dna_archetypes:    string[] | null
          style_dna_top_categories: string[] | null
          onboarding_completed_at: string | null
          created_at:              string
          updated_at:              string
        }
        Insert: {
          id?:                     string
          firebase_uid:            string
          professions?:            string[]
          goals?:                  string[]
          aesthetics?:             string[]
          skill_level?:            string | null
          platforms?:              string[]
          affinities?:             Json
          style_dna_title?:        string | null
          style_dna_tagline?:      string | null
          style_dna_badge?:        string | null
          style_dna_color?:        string | null
          style_dna_archetypes?:   string[] | null
          style_dna_top_categories?: string[] | null
          onboarding_completed_at?: string | null
        }
        Update: {
          professions?:            string[]
          goals?:                  string[]
          aesthetics?:             string[]
          skill_level?:            string | null
          platforms?:              string[]
          affinities?:             Json
          style_dna_title?:        string | null
          style_dna_tagline?:      string | null
          style_dna_badge?:        string | null
          style_dna_color?:        string | null
          style_dna_archetypes?:   string[] | null
          style_dna_top_categories?: string[] | null
          onboarding_completed_at?: string | null
          updated_at?:             string
        }
        Relationships: []
      }

      /* ── recommendation_cache ───────────────────────── */
      recommendation_cache: {
        Row: {
          id:           string
          firebase_uid: string
          section_id:   string
          items:        Json
          generated_at: string
          expires_at:   string
        }
        Insert: {
          id?:          string
          firebase_uid: string
          section_id:   string
          items:        Json
          generated_at?: string
          expires_at:   string
        }
        Update: {
          items?:        Json
          generated_at?: string
          expires_at?:   string
        }
        Relationships: []
      }

      /* ── user_behavior ──────────────────────────────── */
      user_behavior: {
        Row: {
          id:          string
          firebase_uid: string
          event_type:  string
          resource_id: string | null
          metadata:    Json
          created_at:  string
        }
        Insert: {
          id?:          string
          firebase_uid: string
          event_type:   string
          resource_id?: string | null
          metadata?:    Json
          created_at?:  string
        }
        Update: Record<string, never>
        Relationships: []
      }

      /* ── feedback_messages ──────────────────────────── */
      feedback_messages: {
        Row: {
          id:           string
          firebase_uid: string | null
          name:         string
          email:        string
          subject:      string
          message:      string
          ip_hash:      string | null
          is_read:      boolean
          is_archived:  boolean
          created_at:   string
        }
        Insert: {
          id?:          string
          firebase_uid?: string | null
          name:         string
          email:        string
          subject:      string
          message:      string
          ip_hash?:     string | null
          is_read?:     boolean
          is_archived?: boolean
          created_at?:  string
        }
        Update: {
          is_read?:     boolean
          is_archived?: boolean
        }
        Relationships: []
      }
    }
    Views:          Record<string, never>
    Functions: {
      increment_preset_views: {
        Args:    { p_id: string }
        Returns: undefined
      }
      increment_preset_purchases: {
        Args:    { p_id: string; qty?: number }
        Returns: undefined
      }
      increment_preset_downloads: {
        Args:    { p_id: string }
        Returns: undefined
      }
      increment_coupon_uses: {
        Args:    { coupon_id: string }
        Returns: undefined
      }
    }
    Enums:          Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

/* ── Convenience row types ──────────────────────────────── */
export type CategoryRow      = Database["public"]["Tables"]["categories"]["Row"]
export type PresetRow        = Database["public"]["Tables"]["presets"]["Row"]
export type PresetImageRow   = Database["public"]["Tables"]["preset_images"]["Row"]
export type TagRow           = Database["public"]["Tables"]["tags"]["Row"]

/* ── Commerce row types ─────────────────────────────────── */
export type OrderRow               = Database["public"]["Tables"]["orders"]["Row"]
export type OrderItemRow           = Database["public"]["Tables"]["order_items"]["Row"]
export type PaymentTransactionRow  = Database["public"]["Tables"]["payment_transactions"]["Row"]
export type DownloadTokenRow       = Database["public"]["Tables"]["download_tokens"]["Row"]
export type SubscriptionRow        = Database["public"]["Tables"]["subscriptions"]["Row"]
export type UserProfileRow         = Database["public"]["Tables"]["user_profiles"]["Row"]

/* ── Reviews & Storage row types ────────────────────────── */
export type PresetReviewRow    = Database["public"]["Tables"]["preset_reviews"]["Row"]
export type StorageAssetRow    = Database["public"]["Tables"]["storage_assets"]["Row"]
export type FeedbackMessageRow = Database["public"]["Tables"]["feedback_messages"]["Row"]

/* ── Bundle row types ───────────────────────────────────── */
export type BundleRow              = Database["public"]["Tables"]["bundles"]["Row"]
export type BundleIncludedPackRow  = Database["public"]["Tables"]["bundle_included_packs"]["Row"]
export type BundlePresetRow        = Database["public"]["Tables"]["bundle_presets"]["Row"]

/* ── Onboarding / personalisation row types ─────────────── */
export type CreatorProfileRow     = Database["public"]["Tables"]["creator_profiles"]["Row"]
export type RecommendationCacheRow = Database["public"]["Tables"]["recommendation_cache"]["Row"]
export type UserBehaviorRow       = Database["public"]["Tables"]["user_behavior"]["Row"]

/* ── Preset with all relations joined ──────────────────── */
export interface PresetWithRelations extends PresetRow {
  category:  CategoryRow | null
  images:    PresetImageRow[]
  tags?:     TagRow[]
}
