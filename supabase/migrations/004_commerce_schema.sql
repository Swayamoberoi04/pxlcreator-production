-- ============================================================
-- PXL Creator — Commerce Schema
-- Migration: 004_commerce_schema.sql
--
-- Creates all tables required for the payment + commerce system.
-- All tables use RLS with NO public policies — every operation
-- must go through a server-side API route using the service role.
--
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ============================================================
-- TABLE: coupon_codes (no FK deps — define first)
-- ============================================================
CREATE TABLE IF NOT EXISTS coupon_codes (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT          NOT NULL UNIQUE,
  discount_type   TEXT          NOT NULL CHECK (discount_type IN ('percentage', 'fixed_inr', 'fixed_usd')),
  discount_value  NUMERIC(10,2) NOT NULL,
  min_order_inr   NUMERIC(10,2),            -- minimum cart total to apply
  max_uses        INTEGER,                   -- NULL = unlimited
  used_count      INTEGER       NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ,              -- NULL = never expires
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: user_profiles (Firebase UID ↔ Supabase bridge)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  firebase_uid    TEXT          PRIMARY KEY,
  email           TEXT          NOT NULL,
  display_name    TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: orders (one per completed checkout)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid        TEXT,                     -- NULL for guest checkout
  email               TEXT          NOT NULL,   -- always captured at checkout
  customer_name       TEXT,

  -- Status lifecycle: pending → paid | failed | cancelled | refunded
  status              TEXT          NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),

  -- Currency & amounts (USD prices converted to INR at checkout time)
  currency_display    TEXT          NOT NULL DEFAULT 'INR'
                                    CHECK (currency_display IN ('USD', 'INR')),
  usd_to_inr_rate     NUMERIC(8,4)  NOT NULL DEFAULT 84.0,
  subtotal_usd        NUMERIC(10,2) NOT NULL,
  subtotal_inr        NUMERIC(10,2) NOT NULL,
  discount_amount_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_inr           NUMERIC(10,2) NOT NULL,   -- what Razorpay charged

  -- Razorpay
  razorpay_order_id   TEXT          UNIQUE,     -- rzp_order_xxxxx
  razorpay_payment_id TEXT,                     -- pay_xxxxx (after payment)

  -- Coupon (optional)
  coupon_id           UUID          REFERENCES coupon_codes(id),

  -- Timestamps
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  paid_at             TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_firebase_uid      ON orders(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_orders_email             ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_status            ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at        ON orders(created_at DESC);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: order_items (each preset line in an order)
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  preset_id       UUID          NOT NULL REFERENCES presets(id),

  -- Snapshot values — frozen at purchase time (preset may change later)
  preset_slug     TEXT          NOT NULL,
  preset_title    TEXT          NOT NULL,
  price_usd       NUMERIC(10,2) NOT NULL,
  price_inr       NUMERIC(10,2) NOT NULL,
  quantity        INTEGER       NOT NULL DEFAULT 1,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id  ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_preset_id ON order_items(preset_id);

-- ============================================================
-- TABLE: payment_transactions (raw Razorpay event log)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID          NOT NULL REFERENCES orders(id),
  razorpay_payment_id   TEXT          UNIQUE,    -- pay_xxxxx
  razorpay_order_id     TEXT,                    -- rzp_order_xxxxx
  razorpay_signature    TEXT,                    -- HMAC signature
  amount_inr            NUMERIC(10,2) NOT NULL,
  status                TEXT          NOT NULL DEFAULT 'created'
                                      CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded')),
  error_code            TEXT,
  error_description     TEXT,
  captured_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_txn_order_id    ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_txn_razorpay_id ON payment_transactions(razorpay_payment_id);

-- ============================================================
-- TABLE: download_tokens (secure per-purchase download access)
-- ============================================================
CREATE TABLE IF NOT EXISTS download_tokens (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id   UUID          NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  firebase_uid    TEXT,                     -- NULL for guest purchases
  token           TEXT          NOT NULL UNIQUE,  -- the secret access token

  -- Snapshot of what this unlocks
  preset_title    TEXT          NOT NULL,
  preset_slug     TEXT          NOT NULL,
  download_url    TEXT,                     -- Google Drive / external URL

  -- Access control
  expires_at      TIMESTAMPTZ   NOT NULL,   -- 1 year from purchase
  download_count  INTEGER       NOT NULL DEFAULT 0,
  max_downloads   INTEGER       NOT NULL DEFAULT 20,  -- anti-abuse cap
  last_downloaded TIMESTAMPTZ,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_download_tokens_token        ON download_tokens(token);
CREATE INDEX IF NOT EXISTS idx_download_tokens_firebase_uid ON download_tokens(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_download_tokens_order_item   ON download_tokens(order_item_id);

-- ============================================================
-- TABLE: subscriptions (PXL Premium — schema ready, not active yet)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid          TEXT          NOT NULL REFERENCES user_profiles(firebase_uid),
  plan                  TEXT          NOT NULL DEFAULT 'premium'
                                      CHECK (plan IN ('premium', 'pro', 'creator')),
  status                TEXT          NOT NULL DEFAULT 'inactive'
                                      CHECK (status IN ('active', 'cancelled', 'past_due', 'trial', 'inactive')),
  razorpay_sub_id       TEXT          UNIQUE,   -- Razorpay Subscription ID (future)
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  trial_ends_at         TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_firebase_uid ON subscriptions(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status       ON subscriptions(status);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- No public access — all commerce operations go through
-- server-side API routes using the SERVICE ROLE KEY.
-- ============================================================
ALTER TABLE coupon_codes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_tokens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions         ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies created.
-- The service role bypasses RLS entirely — all good.
-- NOTE: If you add Supabase Auth later, add user-scoped policies here.
