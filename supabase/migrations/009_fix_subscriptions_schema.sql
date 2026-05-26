-- ============================================================
-- PXL Creator — Fix Subscriptions Schema
-- Migration: 009_fix_subscriptions_schema.sql
--
-- WHY: Migration 004_commerce_schema.sql created a `subscriptions`
-- table with an old placeholder schema (plan TEXT, status 'inactive',
-- razorpay_sub_id). The production subscription system requires a
-- different schema with plan_id, billing_cycle, amount_usd, amount_inr,
-- and a separate subscription_payments audit table.
--
-- This migration safely drops the old table and recreates it correctly,
-- then creates subscription_payments. It is idempotent.
--
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Drop old trigger and table (CASCADE drops dependent indexes) ──
DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
DROP TABLE  IF EXISTS subscriptions CASCADE;

-- ── Create correct subscriptions table ───────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid          TEXT          NOT NULL,
  email                 TEXT          NOT NULL,
  plan_id               TEXT          NOT NULL CHECK (plan_id IN ('creator', 'pro')),
  billing_cycle         TEXT          NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  status                TEXT          NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  amount_usd            NUMERIC(10,2) NOT NULL,
  amount_inr            NUMERIC(10,2) NOT NULL,
  current_period_start  TIMESTAMPTZ   NOT NULL,
  current_period_end    TIMESTAMPTZ   NOT NULL,
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT,
  cancelled_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_uid_status
  ON subscriptions (firebase_uid, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_rzp_order
  ON subscriptions (razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON subscriptions (current_period_end);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Create subscription_payments audit table ──────────────────
CREATE TABLE IF NOT EXISTS subscription_payments (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id       UUID          REFERENCES subscriptions(id) ON DELETE SET NULL,
  firebase_uid          TEXT          NOT NULL,
  plan_id               TEXT          NOT NULL,
  billing_cycle         TEXT          NOT NULL,
  razorpay_order_id     TEXT          NOT NULL UNIQUE,
  razorpay_payment_id   TEXT,
  razorpay_signature    TEXT,
  amount_usd            NUMERIC(10,2) NOT NULL,
  amount_inr            NUMERIC(10,2) NOT NULL,
  status                TEXT          NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'captured', 'failed', 'refunded')),
  period_start          TIMESTAMPTZ,
  period_end            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_uid
  ON subscription_payments (firebase_uid);

CREATE INDEX IF NOT EXISTS idx_sub_payments_rzp_order
  ON subscription_payments (razorpay_order_id);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Users can read their own rows via the API (service role bypasses RLS).
-- These policies are for future Supabase Auth integration; they do not
-- affect existing API routes which use the service role key.
CREATE POLICY IF NOT EXISTS "Users read own subscriptions"
  ON subscriptions FOR SELECT
  USING (firebase_uid = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Users read own payments"
  ON subscription_payments FOR SELECT
  USING (firebase_uid = auth.uid()::text);

-- ── Expire subscriptions helper ───────────────────────────────
-- Call via a Supabase cron job (pg_cron) or scheduled Edge Function.
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE subscriptions
  SET    status     = 'expired',
         updated_at = NOW()
  WHERE  status     = 'active'
    AND  current_period_end < NOW();
END;
$$;
