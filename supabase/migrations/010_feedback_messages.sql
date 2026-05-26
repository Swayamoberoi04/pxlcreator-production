-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 010 — feedback_messages table
--
-- Stores every contact form submission from the PXL Creator site.
-- Email notifications are sent via Resend; this table is the persistent store.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.feedback_messages (
  id            uuid primary key default gen_random_uuid(),

  -- Optional: Firebase UID of the sender (null for unauthenticated submissions)
  firebase_uid  text,

  -- Sender details
  name          text        not null check (char_length(name) between 1 and 100),
  email         text        not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  subject       text        not null,
  message       text        not null check (char_length(message) between 20 and 5000),

  -- Hashed IP (sha256 prefix) for abuse tracking — NOT the raw IP
  ip_hash       text,

  -- Admin workflow flags
  is_read       boolean     not null default false,
  is_archived   boolean     not null default false,

  created_at    timestamptz not null default now()
);

-- Index for fast unread / inbox queries
create index if not exists idx_feedback_messages_created_at
  on public.feedback_messages (created_at desc);

create index if not exists idx_feedback_messages_is_read
  on public.feedback_messages (is_read)
  where is_read = false;

create index if not exists idx_feedback_messages_firebase_uid
  on public.feedback_messages (firebase_uid)
  where firebase_uid is not null;

-- RLS: only the service-role key (admin client) may access this table.
-- No public reads or writes.
alter table public.feedback_messages enable row level security;

-- No policies = service-role bypass only (admin client uses service key)
-- This means anon / authenticated Supabase clients cannot read or write directly.

comment on table public.feedback_messages is
  'Contact form submissions from pxlcreator.com. Notifications sent via Resend.';
