-- ============================================================
-- PXL Creator — Sample Preset Data with Unlock Passwords
-- Migration: 018_sample_data.sql
--
-- Upserts 5 sample presets with:
--   - unlock_password (validate server-side only)
--   - youtube_video_title (shown as hint on unlock form)
--   - download_url (protected — never exposed directly)
--
-- Passwords are stored in plain text here.
-- The API never returns the password to the client.
--
-- Replace slugs/passwords/urls with real data via Supabase dashboard
-- at any time without code changes.
-- ============================================================

-- Ensure a default category exists
INSERT INTO categories (id, name, slug, description, icon, color, order_index)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Cinematic',      'cinematic',      'Hollywood-grade cinematic looks',        '🎬', '#ffd700', 1),
  ('00000000-0000-0000-0000-000000000002', 'Film Emulation', 'film-emulation', 'Classic film stock emulation',           '📷', '#a78bfa', 2),
  ('00000000-0000-0000-0000-000000000003', 'Portrait',       'portrait',       'Flattering skin tones for portraits',    '🖼',  '#f472b6', 3),
  ('00000000-0000-0000-0000-000000000004', 'Landscape',      'landscape',      'Vivid, atmospheric landscape edits',     '🏔', '#34d399', 4),
  ('00000000-0000-0000-0000-000000000005', 'Street',         'street',         'High-contrast urban street photography', '🏙', '#94a3b8', 5)
ON CONFLICT (id) DO NOTHING;

-- Sample presets
INSERT INTO presets (
  id, slug, title, tagline, description,
  category_id, price, original_price, is_free, is_featured, is_published, badge,
  download_url, download_file_name,
  unlock_password, youtube_video_title,
  include_count, preset_type, features, compatibility,
  rating, review_count, order_index
)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'desert-gold-pack',
    'Desert Gold Pack',
    'Warm tones, rich shadows, golden hour magic',
    'Built for photographers shooting in harsh sunlight and golden hour. Handles blown highlights, recovers shadow detail, and pushes warm amber tones.',
    '00000000-0000-0000-0000-000000000001',
    24, 34, false, true, true, 'Best Seller',
    'https://your-storage-bucket.supabase.co/storage/v1/object/sign/presets/PXL_Desert_Gold_Pack_v1.zip',
    'PXL_Desert_Gold_Pack_v1.zip',
    'DESERT2024',
    'Desert Gold Pack — Full Tutorial (Free Download Link Inside)',
    15, 'pack',
    ARRAY['15 hand-tuned Lightroom presets', 'Warm amber & gold color grading', 'Optimised for harsh sunlight & golden hour'],
    ARRAY['Lightroom Classic', 'Lightroom CC', 'Camera Raw'],
    4.9, 312, 1
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'urban-noir-pack',
    'Urban Noir Pack',
    'High-contrast moody street & architecture',
    'Built for street photographers and architectural shooters who want drama. Crushes blacks, boosts mid-tone contrast, and introduces a cool blue shadow cast.',
    '00000000-0000-0000-0000-000000000005',
    18, null, false, true, true, 'New',
    'https://your-storage-bucket.supabase.co/storage/v1/object/sign/presets/PXL_Urban_Noir_Pack_v1.zip',
    'PXL_Urban_Noir_Pack_v1.zip',
    'NOIR2024',
    'Urban Noir Pack — Street Photography Masterclass (Password in Video)',
    12, 'pack',
    ARRAY['12 dark moody presets', 'Crushed blacks & boosted contrast', 'Works on any street scene lighting'],
    ARRAY['Lightroom Classic', 'Lightroom CC'],
    4.8, 187, 2
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'velvet-portrait-pack',
    'Velvet Portrait Pack',
    'Silky skin, dreamy light, editorial elegance',
    'Designed around human skin. Velvet Portrait softens tones, lifts shadows gently, and keeps colours natural while introducing that editorial magazine quality.',
    '00000000-0000-0000-0000-000000000003',
    15, null, false, false, true, null,
    'https://your-storage-bucket.supabase.co/storage/v1/object/sign/presets/PXL_Velvet_Portrait_v1.zip',
    'PXL_Velvet_Portrait_v1.zip',
    'VELVET2024',
    'Perfect Portrait Editing — Velvet Pack Download (Free Password Inside)',
    10, 'pack',
    ARRAY['10 portrait-focused presets', 'Skin tone preservation engine', 'Works on all complexions'],
    ARRAY['Lightroom Classic', 'Lightroom CC', 'Camera Raw'],
    4.7, 94, 3
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'kodak-emulation-free',
    'Kodak Gold Emulation',
    'The warmth of film, the control of digital',
    'A free sampler replicating the grain, warmth, and characteristic colour response of Kodak Gold 200. Your gateway into PXL Creator film emulation packs.',
    '00000000-0000-0000-0000-000000000002',
    0, null, true, false, true, 'Free',
    'https://your-storage-bucket.supabase.co/storage/v1/object/sign/presets/PXL_Kodak_Emulation_Free.zip',
    'PXL_Kodak_Emulation_Free.zip',
    null,
    null,
    4, 'pack',
    ARRAY['4 free Kodak film emulation presets', 'Authentic grain overlay', 'Works across all cameras'],
    ARRAY['Lightroom Classic', 'Lightroom CC'],
    4.6, 543, 4
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'alpine-landscape-pack',
    'Alpine Landscape Pack',
    'Crisp, airy, epic mountain moods',
    'Mountain and landscape photographers love Alpine for its ability to boost the greens and blues that make high-altitude scenes pop while keeping shadows clean.',
    '00000000-0000-0000-0000-000000000004',
    12, null, false, false, true, null,
    'https://your-storage-bucket.supabase.co/storage/v1/object/sign/presets/PXL_Alpine_Landscape_v1.zip',
    'PXL_Alpine_Landscape_v1.zip',
    'ALPINE2024',
    'Alpine Landscape Editing Tutorial — Free Preset Pack Download',
    8, 'pack',
    ARRAY['8 landscape presets', 'Enhanced greens & blues', 'Haze removal & clarity boost'],
    ARRAY['Lightroom Classic', 'Lightroom CC', 'Camera Raw'],
    4.8, 76, 5
  )
ON CONFLICT (id) DO UPDATE SET
  unlock_password    = EXCLUDED.unlock_password,
  youtube_video_title = EXCLUDED.youtube_video_title,
  download_url       = EXCLUDED.download_url,
  is_published       = EXCLUDED.is_published;
