-- migration 025: fix bundle_presets RLS so anon can read join rows for published bundles
-- The subquery-based policy on bundle_presets blocks nested selects from the anon key.
-- Replace with a simpler policy: anon can select all bundle_presets rows.
-- (bundle_presets only contains UUIDs — no sensitive data.)

drop policy if exists "bundle_presets_public_read" on public.bundle_presets;

create policy "bundle_presets_public_read" on public.bundle_presets
  for select using (true);
