-- ============================================================
-- PXL Creator — Subscription System Migration
-- Run this in your Supabase SQL editor before enabling
-- subscription payments.
-- ============================================================

-- ── subscriptions ──────────────────────────────────────────
-- One row per active or historical subscription period.
-- A new row is inserted on every renewal (not updated in-place)
-- so we keep a full billing history.

CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid          TEXT         NOT NULL,
  email                 TEXT         NOT NULL,
  plan_id               TEXT         NOT NULL CHECK (plan_id IN ('creator', 'pro')),
  billing_cycle         TEXT         NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  status                TEXT         NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  amount_usd            NUMERIC(10,2) NOT NULL,
  amount_inr            NUMERIC(10,2) NOT NULL,
  current_period_start  TIMESTAMPTZ  NOT NULL,
  current_period_end    TIMESTAMPTZ  NOT NULL,
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT,
  cancelled_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_uid_status
  ON subscriptions (firebase_uid, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_rzp_order
  ON subscriptions (razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON subscriptions (current_period_end);


-- ── subscription_payments ──────────────────────────────────
-- Immutable payment log — one row per payment attempt.
-- Links to the subscription it funded.

CREATE TABLE IF NOT EXISTS subscription_payments (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id       UUID         REFERENCES subscriptions(id) ON DELETE SET NULL,
  firebase_uid          TEXT         NOT NULL,
  plan_id               TEXT         NOT NULL,
  billing_cycle         TEXT         NOT NULL,
  razorpay_order_id     TEXT         NOT NULL UNIQUE,
  razorpay_payment_id   TEXT,
  razorpay_signature    TEXT,
  amount_usd            NUMERIC(10,2) NOT NULL,
  amount_inr            NUMERIC(10,2) NOT NULL,
  status                TEXT         NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'captured', 'failed', 'refunded')),
  period_start          TIMESTAMPTZ,
  period_end            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_uid
  ON subscription_payments (firebase_uid);

CREATE INDEX IF NOT EXISTS idx_sub_payments_rzp_order
  ON subscription_payments (razorpay_order_id);


-- ── RLS policies ───────────────────────────────────────────
-- Users can read their own subscriptions.
-- Only the service role (admin client) can write.

ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own rows.
-- (firebase_uid is stored as TEXT; the RLS policy compares it
--  to auth.uid() which works when using Firebase JWT + Supabase
--  custom auth. If using Supabase Auth directly, adjust the
--  comparison column.)

CREATE POLICY "Users read own subscriptions"
  ON subscriptions FOR SELECT
  USING (firebase_uid = auth.uid()::text);

CREATE POLICY "Users read own payments"
  ON subscription_payments FOR SELECT
  USING (firebase_uid = auth.uid()::text);

-- Service role bypasses RLS — used by our API routes via createAdminClient().


-- ── Helper function ────────────────────────────────────────
-- Expire subscriptions past their end date.
-- Call via a Supabase cron job (pg_cron) or Edge Function.

CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE subscriptions
  SET    status     = 'expired',
         updated_at = now()
  WHERE  status     = 'active'
    AND  current_period_end < now();
END;
$$;
