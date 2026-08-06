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
          unlock_password:    string | null
          youtube_video_title: string | null
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
          download_url?:       string | null
          download_file_name?: string | null
          unlock_password?:    string | null
          youtube_video_title?: string | null
          include_count?:      number | null
          preset_type?:        string
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

      /* ── user_unlocks ──────────────────────────────── */
      user_unlocks: {
        Row: {
          id:            string
          firebase_uid:  string
          preset_id:     string
          unlock_method: "payment" | "password"
          unlocked_at:   string
        }
        Insert: {
          id?:           string
          firebase_uid:  string
          preset_id:     string
          unlock_method: "payment" | "password"
          unlocked_at?:  string
        }
        Update: {
          unlock_method?: "payment" | "password"
        }
        Relationships: []
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
          title:                string | null
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
          title?:                string | null
          review_text?:          string | null
          is_approved?:          boolean
          is_verified_purchase?: boolean
        }
        Update: {
          rating?:               number
          title?:                string | null
          review_text?:          string | null
          is_approved?:          boolean
          is_verified_purchase?: boolean
        }
        Relationships: []
      }

      /* ── courses ─────────────────────────────────────── */
      courses: {
        Row: {
          id:                 string
          title:              string
          slug:               string
          subtitle:           string | null
          description:        string | null
          category:           string | null
          difficulty:         "Beginner" | "Intermediate" | "Advanced" | null
          instructor:         string | null
          duration_minutes:   number | null
          lesson_count:       number
          thumbnail_url:      string | null
          banner_url:         string | null
          gallery:            string[]
          trailer_video_url:  string | null
          price:              number
          discount_price:     number | null
          currency:           "USD" | "INR" | "EUR" | "GBP"
          badge:              string | null
          is_bestseller:      boolean
          is_featured:        boolean
          is_coming_soon:     boolean
          is_published:       boolean
          is_archived:        boolean
          access_level:       "free" | "premium" | "purchased_only"
          tags:               string[]
          curriculum:         Json
          seo_title:          string | null
          seo_description:    string | null
          seo_keywords:       string | null
          students_count:     number
          sales_count:        number
          revenue_cached:     number
          rating:             number
          review_count:       number
          completion_avg_pct: number
          order_index:        number
          created_at:         string
          updated_at:         string
        }
        Insert: {
          id?:                 string
          title:               string
          slug:                string
          subtitle?:           string | null
          description?:        string | null
          category?:           string | null
          difficulty?:         "Beginner" | "Intermediate" | "Advanced" | null
          instructor?:         string | null
          duration_minutes?:   number | null
          lesson_count?:       number
          thumbnail_url?:      string | null
          banner_url?:         string | null
          gallery?:            string[]
          trailer_video_url?:  string | null
          price?:              number
          discount_price?:     number | null
          currency?:           "USD" | "INR" | "EUR" | "GBP"
          badge?:              string | null
          is_bestseller?:      boolean
          is_featured?:        boolean
          is_coming_soon?:     boolean
          is_published?:       boolean
          is_archived?:        boolean
          access_level?:       "free" | "premium" | "purchased_only"
          tags?:               string[]
          curriculum?:         Json
          seo_title?:          string | null
          seo_description?:    string | null
          seo_keywords?:       string | null
          students_count?:     number
          sales_count?:        number
          revenue_cached?:     number
          rating?:             number
          review_count?:       number
          completion_avg_pct?: number
          order_index?:        number
        }
        Update: {
          title?:              string
          slug?:               string
          subtitle?:           string | null
          description?:        string | null
          category?:           string | null
          difficulty?:         "Beginner" | "Intermediate" | "Advanced" | null
          instructor?:         string | null
          duration_minutes?:   number | null
          lesson_count?:       number
          thumbnail_url?:      string | null
          banner_url?:         string | null
          gallery?:            string[]
          trailer_video_url?:  string | null
          price?:              number
          discount_price?:     number | null
          currency?:           "USD" | "INR" | "EUR" | "GBP"
          badge?:              string | null
          is_bestseller?:      boolean
          is_featured?:        boolean
          is_coming_soon?:     boolean
          is_published?:       boolean
          is_archived?:        boolean
          access_level?:       "free" | "premium" | "purchased_only"
          tags?:               string[]
          curriculum?:         Json
          seo_title?:          string | null
          seo_description?:    string | null
          seo_keywords?:       string | null
          students_count?:     number
          sales_count?:        number
          revenue_cached?:     number
          rating?:             number
          review_count?:       number
          completion_avg_pct?: number
          order_index?:        number
        }
        Relationships: []
      }

      /* ── homepage_sections ──────────────────────────── */
      homepage_sections: {
        Row: {
          id:          string
          section_key: string
          label:       string
          enabled:     boolean
          order_index: number
          title:       string | null
          subtitle:    string | null
          cta_label:   string | null
          cta_href:    string | null
          image_url:   string | null
          video_url:   string | null
          content:     Json
          created_at:  string
          updated_at:  string
        }
        Insert: {
          id?:          string
          section_key:  string
          label:        string
          enabled?:     boolean
          order_index?: number
          title?:       string | null
          subtitle?:    string | null
          cta_label?:   string | null
          cta_href?:    string | null
          image_url?:   string | null
          video_url?:   string | null
          content?:     Json
        }
        Update: {
          section_key?: string
          label?:       string
          enabled?:     boolean
          order_index?: number
          title?:       string | null
          subtitle?:    string | null
          cta_label?:   string | null
          cta_href?:    string | null
          image_url?:   string | null
          video_url?:   string | null
          content?:     Json
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
          asset_type:  "thumbnail" | "download_file" | "gallery_image" | "before" | "after" | "media_image" | "media_video" | "media_document" | "banner" | "og_image"
          uploaded_by: string | null
          folder:      string
          alt_text:    string | null
          width:       number | null
          height:      number | null
          public_url:  string | null
          created_at:  string
          updated_at:  string
        }
        Insert: {
          id?:         string
          preset_id?:  string | null
          bucket:      string
          path:        string
          file_name:   string
          file_size?:  number | null
          mime_type?:  string | null
          asset_type:  "thumbnail" | "download_file" | "gallery_image" | "before" | "after" | "media_image" | "media_video" | "media_document" | "banner" | "og_image"
          uploaded_by?: string | null
          folder?:     string
          alt_text?:   string | null
          width?:      number | null
          height?:     number | null
          public_url?: string | null
        }
        Update: {
          preset_id?:  string | null
          file_size?:  number | null
          mime_type?:  string | null
          asset_type?: "thumbnail" | "download_file" | "gallery_image" | "before" | "after" | "media_image" | "media_video" | "media_document" | "banner" | "og_image"
          folder?:     string
          alt_text?:   string | null
          width?:      number | null
          height?:     number | null
          public_url?: string | null
        }
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
      /* ══════════════════════════════════════════════════════
         COMMUNITY ECOSYSTEM — migration 012
      ══════════════════════════════════════════════════════ */

      /* ── community_profiles ──────────────────────────── */
      community_profiles: {
        Row: {
          id:               string
          firebase_uid:     string
          username:         string
          display_name:     string
          bio:              string
          avatar_url:       string | null
          banner_url:       string | null
          location_city:    string | null
          location_country: string | null
          website:          string | null
          instagram_url:    string | null
          youtube_url:      string | null
          behance_url:      string | null
          portfolio_url:    string | null
          roles:            string[]
          skill_level:      string
          availability:     string
          follower_count:   number
          following_count:  number
          post_count:       number
          showcase_count:   number
          reputation_score: number
          is_verified:      boolean
          is_premium:       boolean
          search_vector:    string | null
          skills:           string[]
          languages:        string[]
          equipment:        string[]
          software:         string[]
          hired_count:      number
          review_avg:       number | null
          review_count:     number
          available_for:    string[]
          looking_for:      string[]
          created_at:       string
          updated_at:       string
        }
        Insert: {
          id?:              string
          firebase_uid:     string
          username:         string
          display_name?:    string
          bio?:             string
          avatar_url?:      string | null
          banner_url?:      string | null
          location_city?:   string | null
          location_country?: string | null
          website?:         string | null
          instagram_url?:   string | null
          youtube_url?:     string | null
          behance_url?:     string | null
          portfolio_url?:   string | null
          roles?:           string[]
          skill_level?:     string
          availability?:    string
          is_verified?:     boolean
          is_premium?:      boolean
        }
        Update: {
          username?:        string
          display_name?:    string
          bio?:             string
          avatar_url?:      string | null
          banner_url?:      string | null
          location_city?:   string | null
          location_country?: string | null
          website?:         string | null
          instagram_url?:   string | null
          youtube_url?:     string | null
          behance_url?:     string | null
          portfolio_url?:   string | null
          roles?:           string[]
          skill_level?:     string
          availability?:    string
          follower_count?:  number
          following_count?: number
          post_count?:      number
          showcase_count?:  number
          reputation_score?: number
          is_verified?:     boolean
          is_premium?:      boolean
          updated_at?:      string
        }
        Relationships: []
      }

      /* ══════════════════════════════════════════════════
         COMMUNITY EXPANSION — migration 013
      ══════════════════════════════════════════════════ */

      /* ── community_spaces ────────────────────────────── */
      community_spaces: {
        Row: {
          id:             string
          slug:           string
          name:           string
          description:    string
          icon:           string
          category:       string
          color:          string
          is_featured:    boolean
          member_count:   number
          message_count:  number
          moderator_uids: string[]
          is_locked:      boolean
          display_order:  number
          created_at:     string
        }
        Insert: {
          id?:             string
          slug:            string
          name:            string
          description:     string
          icon:            string
          category?:       string
          color?:          string
          is_featured?:    boolean
          member_count?:   number
          message_count?:  number
          moderator_uids?: string[]
          is_locked?:      boolean
          display_order?:  number
        }
        Update: {
          name?:           string
          description?:    string
          icon?:           string
          color?:          string
          is_featured?:    boolean
          member_count?:   number
          message_count?:  number
          moderator_uids?: string[]
          is_locked?:      boolean
          display_order?:  number
        }
        Relationships: []
      }

      /* ── community_messages ──────────────────────────── */
      community_messages: {
        Row: {
          id:             string
          space_id:       string
          author_uid:     string
          body:           string
          reply_to_id:    string | null
          reply_preview:  string | null
          mentions:       string[]
          media_url:      string | null
          is_pinned:      boolean
          is_removed:     boolean
          reaction_count: number
          created_at:     string
          edited_at:      string | null
        }
        Insert: {
          id?:             string
          space_id:        string
          author_uid:      string
          body:            string
          reply_to_id?:    string | null
          reply_preview?:  string | null
          mentions?:       string[]
          media_url?:      string | null
          is_pinned?:      boolean
          is_removed?:     boolean
          reaction_count?: number
        }
        Update: {
          body?:           string
          is_pinned?:      boolean
          is_removed?:     boolean
          reaction_count?: number
          edited_at?:      string | null
        }
        Relationships: []
      }

      /* ── community_message_reactions ─────────────────── */
      community_message_reactions: {
        Row: {
          id:           string
          message_id:   string
          firebase_uid: string
          emoji:        string
          created_at:   string
        }
        Insert: {
          id?:          string
          message_id:   string
          firebase_uid: string
          emoji?:       string
        }
        Update: Record<string, never>
        Relationships: []
      }

      /* ── community_space_members ─────────────────────── */
      community_space_members: {
        Row: {
          id:           string
          space_id:     string
          firebase_uid: string
          role:         string
          joined_at:    string
          last_read_at: string
        }
        Insert: {
          id?:          string
          space_id:     string
          firebase_uid: string
          role?:        string
          joined_at?:   string
          last_read_at?: string
        }
        Update: {
          role?:         string
          last_read_at?: string
        }
        Relationships: []
      }

      /* ── collaboration_requests ──────────────────────── */
      collaboration_requests: {
        Row: {
          id:            string
          requester_uid: string
          recipient_uid: string
          collab_type:   string
          role_needed:   string
          message:       string
          budget:        string | null
          project_brief: string | null
          status:        string
          created_at:    string
          updated_at:    string
        }
        Insert: {
          id?:            string
          requester_uid:  string
          recipient_uid:  string
          collab_type:    string
          role_needed:    string
          message:        string
          budget?:        string | null
          project_brief?: string | null
          status?:        string
        }
        Update: {
          status?:     string
          updated_at?: string
        }
        Relationships: []
      }

      /* ── community_teams ─────────────────────────────── */
      community_teams: {
        Row: {
          id:           string
          name:         string
          description:  string
          avatar_url:   string | null
          banner_url:   string | null
          owner_uid:    string
          category:     string
          tags:         string[]
          visibility:   string
          member_count: number
          is_hiring:    boolean
          roles_needed: string[]
          created_at:   string
          updated_at:   string
        }
        Insert: {
          id?:          string
          name:         string
          description?: string
          avatar_url?:  string | null
          banner_url?:  string | null
          owner_uid:    string
          category?:    string
          tags?:        string[]
          visibility?:  string
          member_count?: number
          is_hiring?:   boolean
          roles_needed?: string[]
        }
        Update: {
          name?:        string
          description?: string
          avatar_url?:  string | null
          banner_url?:  string | null
          category?:    string
          tags?:        string[]
          visibility?:  string
          member_count?: number
          is_hiring?:   boolean
          roles_needed?: string[]
          updated_at?:  string
        }
        Relationships: []
      }

      /* ── community_team_members ──────────────────────── */
      community_team_members: {
        Row: {
          id:           string
          team_id:      string
          firebase_uid: string
          role:         string
          custom_title: string | null
          joined_at:    string
        }
        Insert: {
          id?:          string
          team_id:      string
          firebase_uid: string
          role?:        string
          custom_title?: string | null
        }
        Update: {
          role?:         string
          custom_title?: string | null
        }
        Relationships: []
      }

      /* ── community_team_invites ──────────────────────── */
      community_team_invites: {
        Row: {
          id:           string
          team_id:      string
          inviter_uid:  string
          invitee_uid:  string
          role:         string
          custom_title: string | null
          message:      string | null
          status:       string
          expires_at:   string
          created_at:   string
        }
        Insert: {
          id?:          string
          team_id:      string
          inviter_uid:  string
          invitee_uid:  string
          role?:        string
          custom_title?: string | null
          message?:     string | null
          status?:      string
          expires_at?:  string
        }
        Update: {
          status?:   string
          role?:     string
        }
        Relationships: []
      }

      /* ── project_reviews ─────────────────────────────── */
      project_reviews: {
        Row: {
          id:               string
          project_id:       string
          reviewer_uid:     string
          reviewee_uid:     string
          rating:           number
          body:             string | null
          communication:    number | null
          quality:          number | null
          professionalism:  number | null
          on_time:          boolean | null
          would_work_again: boolean | null
          created_at:       string
        }
        Insert: {
          id?:               string
          project_id:        string
          reviewer_uid:      string
          reviewee_uid:      string
          rating:            number
          body?:             string | null
          communication?:    number | null
          quality?:          number | null
          professionalism?:  number | null
          on_time?:          boolean | null
          would_work_again?: boolean | null
        }
        Update: Record<string, never>
        Relationships: []
      }

      /* ── creator_resources ───────────────────────────── */
      creator_resources: {
        Row: {
          id:            string
          title:         string
          description:   string
          url:           string
          category:      string
          icon:          string
          is_featured:   boolean
          display_order: number
        }
        Insert: {
          id?:            string
          title:          string
          description:    string
          url:            string
          category?:      string
          icon?:          string
          is_featured?:   boolean
          display_order?: number
        }
        Update: {
          title?:         string
          description?:   string
          url?:           string
          category?:      string
          icon?:          string
          is_featured?:   boolean
          display_order?: number
        }
        Relationships: []
      }

      /* ── event_registrations ─────────────────────────── */
      event_registrations: {
        Row: {
          id:            string
          event_id:      string
          firebase_uid:  string
          registered_at: string
        }
        Insert: {
          id?:           string
          event_id:      string
          firebase_uid:  string
          registered_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }

      /* ── event_submissions ───────────────────────────── */
      event_submissions: {
        Row: {
          id:           string
          event_id:     string
          firebase_uid: string
          title:        string
          description:  string | null
          media_url:    string
          media_type:   string
          vote_count:   number
          is_winner:    boolean
          winner_rank:  number | null
          created_at:   string
        }
        Insert: {
          id?:          string
          event_id:     string
          firebase_uid: string
          title:        string
          description?: string | null
          media_url:    string
          media_type?:  string
          vote_count?:  number
          is_winner?:   boolean
          winner_rank?: number | null
        }
        Update: {
          vote_count?:  number
          is_winner?:   boolean
          winner_rank?: number | null
        }
        Relationships: []
      }

      /* ── creator_follows ─────────────────────────────── */
      creator_follows: {
        Row: {
          id:            string
          follower_uid:  string
          following_uid: string
          created_at:    string
        }
        Insert: {
          id?:           string
          follower_uid:  string
          following_uid: string
          created_at?:   string
        }
        Update: Record<string, never>
        Relationships: []
      }

      /* ── creator_connections ─────────────────────────── */
      creator_connections: {
        Row: {
          id:            string
          requester_uid: string
          recipient_uid: string
          status:        string
          message:       string | null
          created_at:    string
          updated_at:    string
        }
        Insert: {
          id?:            string
          requester_uid:  string
          recipient_uid:  string
          status?:        string
          message?:       string | null
        }
        Update: {
          status?:    string
          message?:   string | null
          updated_at?: string
        }
        Relationships: []
      }

      /* ── community_channels ──────────────────────────── */
      community_channels: {
        Row: {
          id:               string
          slug:             string
          name:             string
          description:      string
          long_description: string | null
          banner_url:       string | null
          icon:             string | null
          category:         string
          visibility:       string
          owner_uid:        string
          moderator_uids:   string[]
          tags:             string[]
          member_count:     number
          post_count:       number
          is_featured:      boolean
          is_verified:      boolean
          rules:            string | null
          created_at:       string
          updated_at:       string
        }
        Insert: {
          id?:              string
          slug:             string
          name:             string
          description?:     string
          long_description?: string | null
          banner_url?:      string | null
          icon?:            string | null
          category?:        string
          visibility?:      string
          owner_uid:        string
          moderator_uids?:  string[]
          tags?:            string[]
          member_count?:    number
          post_count?:      number
          is_featured?:     boolean
          is_verified?:     boolean
          rules?:           string | null
        }
        Update: {
          name?:            string
          description?:     string
          long_description?: string | null
          banner_url?:      string | null
          icon?:            string | null
          category?:        string
          visibility?:      string
          moderator_uids?:  string[]
          tags?:            string[]
          member_count?:    number
          post_count?:      number
          is_featured?:     boolean
          is_verified?:     boolean
          rules?:           string | null
          updated_at?:      string
        }
        Relationships: []
      }

      /* ── channel_members ─────────────────────────────── */
      channel_members: {
        Row: {
          id:           string
          channel_id:   string
          firebase_uid: string
          role:         string
          joined_at:    string
        }
        Insert: {
          id?:          string
          channel_id:   string
          firebase_uid: string
          role?:        string
          joined_at?:   string
        }
        Update: {
          role?: string
        }
        Relationships: []
      }

      /* ── channel_posts ───────────────────────────────── */
      channel_posts: {
        Row: {
          id:            string
          channel_id:    string
          author_uid:    string
          title:         string | null
          body:          string
          post_type:     string
          media_urls:    string[]
          link_url:      string | null
          hashtags:      string[]
          is_pinned:     boolean
          is_locked:     boolean
          is_removed:    boolean
          like_count:    number
          comment_count: number
          view_count:    number
          search_vector: string | null
          created_at:    string
          updated_at:    string
        }
        Insert: {
          id?:           string
          channel_id:    string
          author_uid:    string
          title?:        string | null
          body:          string
          post_type?:    string
          media_urls?:   string[]
          link_url?:     string | null
          hashtags?:     string[]
          is_pinned?:    boolean
          is_locked?:    boolean
          is_removed?:   boolean
          like_count?:   number
          comment_count?: number
          view_count?:   number
        }
        Update: {
          title?:        string | null
          body?:         string
          is_pinned?:    boolean
          is_locked?:    boolean
          is_removed?:   boolean
          like_count?:   number
          comment_count?: number
          view_count?:   number
          updated_at?:   string
        }
        Relationships: []
      }

      /* ── post_comments ───────────────────────────────── */
      post_comments: {
        Row: {
          id:         string
          post_id:    string
          author_uid: string
          parent_id:  string | null
          body:       string
          is_removed: boolean
          like_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?:        string
          post_id:    string
          author_uid: string
          parent_id?: string | null
          body:       string
          is_removed?: boolean
          like_count?: number
        }
        Update: {
          body?:       string
          is_removed?: boolean
          like_count?: number
          updated_at?: string
        }
        Relationships: []
      }

      /* ── post_reactions ──────────────────────────────── */
      post_reactions: {
        Row: {
          id:           string
          post_id:      string | null
          comment_id:   string | null
          firebase_uid: string
          reaction:     string
          created_at:   string
        }
        Insert: {
          id?:          string
          post_id?:     string | null
          comment_id?:  string | null
          firebase_uid: string
          reaction?:    string
          created_at?:  string
        }
        Update: {
          reaction?: string
        }
        Relationships: []
      }

      /* ── project_listings ────────────────────────────── */
      project_listings: {
        Row: {
          id:               string
          poster_uid:       string
          title:            string
          description:      string
          category:         string
          work_type:        string
          location_city:    string | null
          location_country: string | null
          budget_min_usd:   number | null
          budget_max_usd:   number | null
          budget_type:      string
          deadline:         string | null
          skills_needed:    string[]
          status:           string
          applicant_count:  number
          view_count:       number
          is_featured:      boolean
          created_at:       string
          updated_at:       string
        }
        Insert: {
          id?:              string
          poster_uid:       string
          title:            string
          description:      string
          category?:        string
          work_type?:       string
          location_city?:   string | null
          location_country?: string | null
          budget_min_usd?:  number | null
          budget_max_usd?:  number | null
          budget_type?:     string
          deadline?:        string | null
          skills_needed?:   string[]
          status?:          string
          applicant_count?: number
          is_featured?:     boolean
        }
        Update: {
          title?:           string
          description?:     string
          category?:        string
          work_type?:       string
          location_city?:   string | null
          location_country?: string | null
          budget_min_usd?:  number | null
          budget_max_usd?:  number | null
          budget_type?:     string
          deadline?:        string | null
          skills_needed?:   string[]
          status?:          string
          applicant_count?: number
          view_count?:      number
          is_featured?:     boolean
          updated_at?:      string
        }
        Relationships: []
      }

      /* ── project_applications ────────────────────────── */
      project_applications: {
        Row: {
          id:             string
          project_id:     string
          applicant_uid:  string
          cover_letter:   string | null
          portfolio_link: string | null
          status:         string
          created_at:     string
          updated_at:     string
        }
        Insert: {
          id?:             string
          project_id:      string
          applicant_uid:   string
          cover_letter?:   string | null
          portfolio_link?: string | null
          status?:         string
        }
        Update: {
          status?:     string
          updated_at?: string
        }
        Relationships: []
      }

      /* ── showcase_items ──────────────────────────────── */
      showcase_items: {
        Row: {
          id:             string
          author_uid:     string
          title:          string
          description:    string | null
          item_type:      string
          media_urls:     string[]
          before_url:     string | null
          after_url:      string | null
          thumbnail_url:  string | null
          category:       string
          software_used:  string[]
          hashtags:       string[]
          like_count:     number
          comment_count:  number
          bookmark_count: number
          view_count:     number
          is_featured:    boolean
          is_removed:     boolean
          created_at:     string
          updated_at:     string
        }
        Insert: {
          id?:            string
          author_uid:     string
          title:          string
          description?:   string | null
          item_type?:     string
          media_urls?:    string[]
          before_url?:    string | null
          after_url?:     string | null
          thumbnail_url?: string | null
          category?:      string
          software_used?: string[]
          hashtags?:      string[]
          like_count?:    number
          comment_count?: number
          bookmark_count?: number
          is_featured?:   boolean
          is_removed?:    boolean
        }
        Update: {
          title?:         string
          description?:   string | null
          like_count?:    number
          comment_count?: number
          bookmark_count?: number
          view_count?:    number
          is_featured?:   boolean
          is_removed?:    boolean
          updated_at?:    string
        }
        Relationships: []
      }

      /* ── showcase_reactions ──────────────────────────── */
      showcase_reactions: {
        Row: {
          id:           string
          showcase_id:  string
          firebase_uid: string
          reaction:     string
          created_at:   string
        }
        Insert: {
          id?:          string
          showcase_id:  string
          firebase_uid: string
          reaction?:    string
          created_at?:  string
        }
        Update: Record<string, never>
        Relationships: []
      }

      /* ── community_notifications ─────────────────────── */
      community_notifications: {
        Row: {
          id:            string
          recipient_uid: string
          actor_uid:     string | null
          type:          string
          title:         string
          body:          string | null
          resource_type: string | null
          resource_id:   string | null
          is_read:       boolean
          created_at:    string
        }
        Insert: {
          id?:            string
          recipient_uid:  string
          actor_uid?:     string | null
          type:           string
          title:          string
          body?:          string | null
          resource_type?: string | null
          resource_id?:   string | null
          is_read?:       boolean
          created_at?:    string
        }
        Update: {
          is_read?: boolean
        }
        Relationships: []
      }

      /* ── community_events ────────────────────────────── */
      community_events: {
        Row: {
          id:                string
          organiser_uid:     string
          title:             string
          description:       string
          event_type:        string
          banner_url:        string | null
          start_date:        string
          end_date:          string | null
          location:          string | null
          is_online:         boolean
          prizes:            Json
          rules:             string | null
          participant_count: number
          status:            string
          is_featured:       boolean
          created_at:        string
          updated_at:        string
        }
        Insert: {
          id?:               string
          organiser_uid:     string
          title:             string
          description:       string
          event_type?:       string
          banner_url?:       string | null
          start_date:        string
          end_date?:         string | null
          location?:         string | null
          is_online?:        boolean
          prizes?:           Json
          rules?:            string | null
          status?:           string
          is_featured?:      boolean
        }
        Update: {
          title?:            string
          description?:      string
          banner_url?:       string | null
          end_date?:         string | null
          prizes?:           Json
          participant_count?: number
          status?:           string
          is_featured?:      boolean
          updated_at?:       string
        }
        Relationships: []
      }

      /* ── community_badges ────────────────────────────── */
      community_badges: {
        Row: {
          id:          string
          slug:        string
          name:        string
          description: string
          icon:        string
          color:       string
          award_type:  string
        }
        Insert: {
          id?:         string
          slug:        string
          name:        string
          description: string
          icon:        string
          color?:      string
          award_type?: string
        }
        Update: {
          name?:        string
          description?: string
          icon?:        string
          color?:       string
          award_type?:  string
        }
        Relationships: []
      }

      /* ── user_earned_badges ──────────────────────────── */
      user_earned_badges: {
        Row: {
          id:           string
          firebase_uid: string
          badge_id:     string
          awarded_at:   string
          awarded_by:   string | null
        }
        Insert: {
          id?:          string
          firebase_uid: string
          badge_id:     string
          awarded_at?:  string
          awarded_by?:  string | null
        }
        Update: Record<string, never>
        Relationships: []
      }

      /* ── content_reports ─────────────────────────────── */
      content_reports: {
        Row: {
          id:           string
          reporter_uid: string
          target_type:  string
          target_id:    string
          reason:       string
          details:      string | null
          status:       string
          reviewed_by:  string | null
          reviewed_at:  string | null
          created_at:   string
        }
        Insert: {
          id?:          string
          reporter_uid: string
          target_type:  string
          target_id:    string
          reason:       string
          details?:     string | null
          status?:      string
        }
        Update: {
          status?:      string
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
        Relationships: []
      }

      /* ── dm_threads ──────────────────────────────────── */
      dm_threads: {
        Row: {
          id:              string
          participant_a:   string
          participant_b:   string
          last_message_at: string
          last_message:    string | null
          unread_a:        number
          unread_b:        number
          created_at:      string
        }
        Insert: {
          id?:             string
          participant_a:   string
          participant_b:   string
          last_message_at?: string
          last_message?:   string | null
          unread_a?:       number
          unread_b?:       number
        }
        Update: {
          last_message_at?: string
          last_message?:    string | null
          unread_a?:        number
          unread_b?:        number
        }
        Relationships: []
      }

      /* ── direct_messages ─────────────────────────────── */
      direct_messages: {
        Row: {
          id:          string
          thread_id:   string
          sender_uid:  string
          body:        string
          media_url:   string | null
          is_read:     boolean
          created_at:  string
        }
        Insert: {
          id?:         string
          thread_id:   string
          sender_uid:  string
          body:        string
          media_url?:  string | null
          is_read?:    boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
        Relationships: []
      }

      /* ── bundles ─────────────────────────────────────── */
      bundles: {
        Row: {
          id:                   string
          name:                 string
          slug:                 string
          tagline:              string | null
          description:          string | null
          seo_title:            string | null
          seo_description:      string | null
          thumbnail_url:        string | null
          banner_url:           string | null
          badge:                string | null
          display_order:        number
          bundle_price_usd:     number
          compare_at_price_usd: number | null
          download_url:         string | null
          is_published:         boolean
          is_featured:          boolean
          created_at:           string
          updated_at:           string
        }
        Insert: {
          id?:                   string
          name:                  string
          slug:                  string
          tagline?:              string | null
          description?:          string | null
          seo_title?:            string | null
          seo_description?:      string | null
          thumbnail_url?:        string | null
          banner_url?:           string | null
          badge?:                string | null
          display_order?:        number
          bundle_price_usd?:     number
          compare_at_price_usd?: number | null
          download_url?:         string | null
          is_published?:         boolean
          is_featured?:          boolean
        }
        Update: {
          name?:                 string
          slug?:                 string
          tagline?:              string | null
          description?:          string | null
          seo_title?:            string | null
          seo_description?:      string | null
          thumbnail_url?:        string | null
          banner_url?:           string | null
          badge?:                string | null
          display_order?:        number
          bundle_price_usd?:     number
          compare_at_price_usd?: number | null
          download_url?:         string | null
          is_published?:         boolean
          is_featured?:          boolean
          updated_at?:           string
        }
        Relationships: []
      }

      /* ── bundle_presets ──────────────────────────────── */
      bundle_presets: {
        Row: {
          id:          string
          bundle_id:   string
          preset_id:   string
          order_index: number
        }
        Insert: {
          id?:         string
          bundle_id:   string
          preset_id:   string
          order_index?: number
        }
        Update: {
          order_index?: number
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

/* ── Onboarding / personalisation row types ─────────────── */
export type CreatorProfileRow     = Database["public"]["Tables"]["creator_profiles"]["Row"]
export type RecommendationCacheRow = Database["public"]["Tables"]["recommendation_cache"]["Row"]
export type UserBehaviorRow       = Database["public"]["Tables"]["user_behavior"]["Row"]

/* ── Bundle row types ───────────────────────────────────── */
export type BundleRow        = Database["public"]["Tables"]["bundles"]["Row"]
export type BundlePresetRow  = Database["public"]["Tables"]["bundle_presets"]["Row"]

/* ── Preset with all relations joined ──────────────────── */
export interface PresetWithRelations extends PresetRow {
  category:  CategoryRow | null
  images:    PresetImageRow[]
  tags?:     TagRow[]
}
