-- migration 024: bundles + bundle_presets (M2M)
-- Run this against your Supabase project via the dashboard SQL editor or CLI.

/* ── drop stale tables if they exist with wrong schema ─── */
drop table if exists public.bundle_presets cascade;
drop table if exists public.bundles        cascade;

/* ── bundles ───────────────────────────────────────────── */
create table public.bundles (
  id                uuid        primary key default gen_random_uuid(),
  name              text        not null,
  slug              text        not null unique,
  tagline           text,
  description       text,
  seo_title         text,
  seo_description   text,
  thumbnail_url     text,
  banner_url        text,
  badge             text,
  display_order     int         not null default 0,
  bundle_price_usd  numeric(10,2) not null default 0,
  compare_at_price_usd numeric(10,2),
  download_url      text,
  is_published      boolean     not null default false,
  is_featured       boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

/* ── bundle_presets (join table) ───────────────────────── */
create table public.bundle_presets (
  id          uuid    primary key default gen_random_uuid(),
  bundle_id   uuid    not null references public.bundles(id) on delete cascade,
  preset_id   uuid    not null references public.presets(id) on delete cascade,
  order_index int     not null default 0,
  unique(bundle_id, preset_id)
);

/* ── indexes ───────────────────────────────────────────── */
create index if not exists bundles_slug_idx       on public.bundles(slug);
create index if not exists bundles_published_idx  on public.bundles(is_published, display_order);
create index if not exists bundle_presets_bid_idx on public.bundle_presets(bundle_id, order_index);
create index if not exists bundle_presets_pid_idx on public.bundle_presets(preset_id);

/* ── updated_at trigger ────────────────────────────────── */
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists bundles_updated_at on public.bundles;
create trigger bundles_updated_at
  before update on public.bundles
  for each row execute function public.set_updated_at();

/* ── RLS ───────────────────────────────────────────────── */
alter table public.bundles       enable row level security;
alter table public.bundle_presets enable row level security;

-- public: read published bundles + their preset links
drop policy if exists "bundles_public_read"        on public.bundles;
drop policy if exists "bundle_presets_public_read" on public.bundle_presets;

create policy "bundles_public_read" on public.bundles
  for select using (is_published = true);

create policy "bundle_presets_public_read" on public.bundle_presets
  for select using (
    exists (
      select 1 from public.bundles b
      where b.id = bundle_presets.bundle_id and b.is_published = true
    )
  );

-- service role bypasses RLS for admin operations
