-- migration 026: grant SELECT to anon + authenticated on bundles tables
-- RLS policies alone are not enough — Supabase also needs explicit table-level grants.

grant select on public.bundles        to anon, authenticated;
grant select on public.bundle_presets to anon, authenticated;
