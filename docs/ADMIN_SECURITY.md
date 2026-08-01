# Admin Security

How the `/admin` dashboard is locked to a single owner, and what you must
configure for it to work.

## Threat model

The admin dashboard grants full control over presets, pricing, coupons,
orders, reviews, and imports (via the Supabase **service-role** key, which
bypasses RLS). It must be reachable **only** by the configured owner.

## The two factors

Admin login requires **both**, verified server-side in `POST /api/admin/auth`:

1. **Firebase identity** — a valid Firebase ID token whose email equals
   `ADMIN_EMAIL` **and** is `email_verified`. Proves *who* you are.
2. **Admin key** — the shared `ADMIN_PASSWORD`. A second, independent secret.

Knowing the password alone is not enough. Being signed into Firebase as a
non-admin email is not enough. **Nobody can become an admin without a config
change** — there is no "grant admin" path anywhere in the product.

## Required environment variables

Set these in `.env.local` (and in your host's env for production). Admin login
**fails closed** (HTTP 503) if any are missing.

| Var | Purpose |
|-----|---------|
| `ADMIN_EMAIL` | The ONLY email allowed into `/admin`. Must be a real, email-verified Firebase account you control. Comma-separate for a deliberate backup owner. |
| `ADMIN_PASSWORD` | Second-factor admin key. Use ≥ 12 chars. |
| `ADMIN_SECRET_KEY` | HMAC key that signs session tokens. Use ≥ 32 random chars. **No fallback** — a missing/short/placeholder value disables admin entirely. |
| `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` | Service-role access for admin data + the session/audit store. |
| `FIREBASE_ADMIN_PROJECT_ID` / `FIREBASE_ADMIN_CLIENT_EMAIL` / `FIREBASE_ADMIN_PRIVATE_KEY` | Verifies the Firebase ID token server-side. |

> ⚠️ Replace the placeholder `ADMIN_EMAIL=CHANGE_ME@example.com` added to
> `.env.local` with your real admin email before signing in.

## Apply the database migration

`supabase/migrations/023_admin_security.sql` creates two service-role-only
tables (RLS enabled, **no** policies → unreachable from the browser):

- `admin_sessions` — enables **real logout / revocation** and blocks replay of
  a logged-out token.
- `admin_audit_log` — durable record of logins, logouts, page access, and every
  create/edit/delete.

The admin subsystem still functions before the migration is applied (audit +
revocation degrade gracefully to the stateless HMAC guarantee), but **apply it
to get full revocation and audit logging.**

## Defense layers

| Layer | File | Enforces |
|-------|------|----------|
| Edge proxy | `src/proxy.ts` | Redirect/401 for unauthenticated admin routes; **CSRF** (same-origin) on all admin API mutations; DENY-frame / no-store / noindex headers. |
| Server layout | `src/app/admin/layout.tsx` | Re-checks the session **incl. revocation**; logs page access. |
| Route guard | `src/lib/admin/guard.ts` (`requireAdmin`) | Per-handler auth + revocation, so direct API calls (curl/Postman) are rejected. |
| Session token | `src/lib/admin/auth.ts` | HMAC-signed, **email-bound**, unique `jti`, 8-hour TTL, constant-time checks, Edge-safe, fails closed. |

## Session lifecycle

- **Login** → mints a signed, email-bound token with a fresh `jti`; records the
  session; sets an `HttpOnly; Secure; SameSite=Strict` cookie.
- **Logout** → revokes the `jti` server-side (token cannot be replayed) and
  clears the cookie.
- **Expiry** → 8 hours.
- **Rotate the admin key** → change `ADMIN_PASSWORD`; call `revokeAllSessions()`
  or just wait out the 8-hour TTL to invalidate existing sessions.
