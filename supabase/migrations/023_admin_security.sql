-- ════════════════════════════════════════════════════════════════════
-- 023_admin_security.sql
--
-- Server-side admin session store + tamper-evident audit log.
--
-- WHY:
--   • The admin session cookie is HMAC-signed and email-bound, but a
--     stateless token cannot be *revoked*. This table lets the server
--     invalidate a session immediately on logout, and refuse replayed
--     tokens whose session row has been revoked or has expired.
--   • Every privileged action (login, logout, page access, create,
--     edit, delete, upload) is recorded for forensic review.
--
-- SECURITY:
--   • RLS is ENABLED on both tables and NO policies are created, so the
--     anon and authenticated roles have ZERO access. Only the
--     service-role key (used exclusively in server-side admin code) can
--     read or write. This is intentional — these tables must never be
--     reachable from the browser.
-- ════════════════════════════════════════════════════════════════════

-- ── Admin sessions ────────────────────────────────────────────────────
create table if not exists public.admin_sessions (
  jti         uuid        primary key,
  email       text        not null,
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  revoked_reason text
);

create index if not exists admin_sessions_email_idx      on public.admin_sessions (email);
create index if not exists admin_sessions_expires_at_idx on public.admin_sessions (expires_at);

alter table public.admin_sessions enable row level security;
-- No policies → service-role only.

-- ── Admin audit log ───────────────────────────────────────────────────
create table if not exists public.admin_audit_log (
  id          bigint generated always as identity primary key,
  ts          timestamptz not null default now(),
  event       text        not null,          -- e.g. 'admin.login', 'preset.delete'
  outcome     text        not null default 'success', -- 'success' | 'denied' | 'error'
  email       text,                          -- actor (admin email) when known
  ip          text,
  user_agent  text,
  method      text,                          -- HTTP method
  path        text,                          -- request path
  target_id   text,                          -- affected resource id, when applicable
  meta        jsonb       not null default '{}'::jsonb
);

create index if not exists admin_audit_log_ts_idx    on public.admin_audit_log (ts desc);
create index if not exists admin_audit_log_event_idx on public.admin_audit_log (event);
create index if not exists admin_audit_log_email_idx on public.admin_audit_log (email);

alter table public.admin_audit_log enable row level security;
-- No policies → service-role only.

-- ── Retention helper (optional; call from a scheduled job) ────────────
-- Deletes audit rows older than 365 days and expired session rows.
create or replace function public.prune_admin_security(older_than_days int default 365)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.admin_audit_log where ts < now() - (older_than_days || ' days')::interval;
  delete from public.admin_sessions  where expires_at < now() - interval '7 days';
$$;
