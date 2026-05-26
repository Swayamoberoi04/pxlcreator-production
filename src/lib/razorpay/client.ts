/**
 * src/lib/razorpay/client.ts
 *
 * Razorpay SDK factory — server-side only.
 *
 * ⚠️  NEVER import this in Client Components or browser code.
 *     Only use inside Route Handlers (src/app/api/**).
 *
 * Required env vars (add to .env.local):
 *   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
 *   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
 *   RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxx
 */

import Razorpay from "razorpay"
import crypto   from "crypto"

export function getRazorpayClient(): Razorpay {
  const key_id     = process.env.RAZORPAY_KEY_ID
  const key_secret = process.env.RAZORPAY_KEY_SECRET

  if (!key_id || !key_secret) {
    throw new Error(
      "[Razorpay] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment. " +
      "Add them to .env.local before processing payments."
    )
  }

  return new Razorpay({ key_id, key_secret })
}

/**
 * Verify the payment signature Razorpay sends after a successful payment.
 *
 * Formula: HMAC-SHA256( razorpay_order_id + "|" + razorpay_payment_id, key_secret )
 * Must match the signature in the payment response.
 */
export function verifyPaymentSignature(
  razorpay_order_id:   string,
  razorpay_payment_id: string,
  razorpay_signature:  string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) return false

  const body     = `${razorpay_order_id}|${razorpay_payment_id}`
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest()

  // timingSafeEqual prevents timing-oracle attacks on HMAC comparison
  try {
    const received = Buffer.from(razorpay_signature, "hex")
    if (received.length !== expected.length) return false
    return crypto.timingSafeEqual(expected, received)
  } catch {
    return false
  }
}

/**
 * Verify a Razorpay webhook payload.
 * Uses a separate RAZORPAY_WEBHOOK_SECRET (set in Razorpay dashboard).
 *
 * Formula: HMAC-SHA256( raw_body, webhook_secret )
 */
export function verifyWebhookSignature(
  rawBody:   string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return false

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest()

  try {
    const received = Buffer.from(signature, "hex")
    if (received.length !== expected.length) return false
    return crypto.timingSafeEqual(expected, received)
  } catch {
    return false
  }
}
