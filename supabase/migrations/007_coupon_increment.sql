-- ============================================================
-- PXL Creator — Coupon increment RPC
-- Migration: 007_coupon_increment.sql
--
-- Atomically increments used_count on a coupon after payment.
-- Called from verify-payment route via supabase.rpc().
-- ============================================================

CREATE OR REPLACE FUNCTION increment_coupon_uses(coupon_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE coupon_codes
  SET used_count = used_count + 1
  WHERE id = coupon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
