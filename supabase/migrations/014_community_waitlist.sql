-- Community feature waitlist
create table if not exists community_waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  name       text,
  feature    text not null default 'general',
  joined_at  timestamptz not null default now(),

  constraint community_waitlist_email_feature_unique unique (email, feature)
);

-- Index for analytics queries
create index if not exists community_waitlist_feature_idx on community_waitlist (feature);
create index if not exists community_waitlist_joined_at_idx on community_waitlist (joined_at desc);

-- No RLS needed — write-only via service role in API route
